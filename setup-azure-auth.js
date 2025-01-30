import { Octokit } from '@octokit/rest';
import { DefaultAzureCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
import sodium from 'sodium-native';

async function encryptSecret(value, key) {
  const messageBytes = Buffer.from(value);
  const keyBytes = Buffer.from(key, 'base64');
  const encryptedBytes = Buffer.alloc(messageBytes.length + sodium.crypto_box_SEALBYTES);
  sodium.crypto_box_seal(encryptedBytes, messageBytes, keyBytes);
  return encryptedBytes.toString('base64');
}

async function main() {
  try {
    console.log('Starting Azure authentication setup...');

    // Initialize Azure SDK clients
    const credential = new DefaultAzureCredential();
    
    // Get subscription ID from environment
    if (!process.env.AZURE_SUBSCRIPTION_ID) {
      throw new Error('AZURE_SUBSCRIPTION_ID environment variable is required');
    }
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    console.log('Using subscription ID:', subscriptionId);
    
    const resourceClient = new ResourceManagementClient(credential, subscriptionId);

    // Get GitHub token from command line argument or environment
    const githubToken = process.argv[2] || process.env.GITHUB_TOKEN || process.env.GH_PAT;
    console.log('GitHub token available:', !!githubToken);
    const octokit = new Octokit({
      auth: githubToken
    });

    // Get repository info from git config if not in GitHub Actions
    const getRepoInfo = async () => {
      if (process.env.GITHUB_REPOSITORY) {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        return { owner, repo };
      }
      
      try {
        const { execSync } = await import('child_process');
        const remoteUrl = execSync('git config --get remote.origin.url').toString().trim();
        const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/);
        if (!match) {
          throw new Error('Could not parse GitHub repository from git remote URL');
        }
        return { owner: match[1], repo: match[2] };
      } catch (error) {
        throw new Error('Failed to get repository info. Please ensure you are in a git repository or provide GITHUB_REPOSITORY environment variable.');
      }
    };

    const { owner, repo } = await getRepoInfo();
    console.log(`Setting up secrets for ${owner}/${repo}`);

    if (!githubToken) {
      throw new Error('Either GITHUB_TOKEN or GH_PAT environment variable is required');
    }

    // Get repository's public key for secret encryption
    const { data: { key, key_id } } = await octokit.rest.actions.getRepoPublicKey({
      owner,
      repo
    });

    // Create secrets
    const secrets = {
      'AZURE_CLIENT_ID': process.env.AZURE_CLIENT_ID,
      'AZURE_CLIENT_SECRET': process.env.AZURE_CLIENT_SECRET,
      'AZURE_TENANT_ID': process.env.AZURE_TENANT_ID,
      'AZURE_SUBSCRIPTION_ID': process.env.AZURE_SUBSCRIPTION_ID
    };

    for (const [name, value] of Object.entries(secrets)) {
      if (!value) {
        console.warn(`Warning: ${name} is not set`);
        continue;
      }

      console.log(`Encrypting ${name}...`);
      const encryptedValue = await encryptSecret(value, key);

      console.log(`Creating/updating secret: ${name}`);
      await octokit.rest.actions.createOrUpdateRepoSecret({
        owner,
        repo,
        secret_name: name,
        encrypted_value: encryptedValue,
        key_id
      });
    }

    console.log('Successfully configured Azure authentication secrets');

    // Configure federated credentials in Azure AD using Graph API
    console.log('Configuring federated credentials in Azure AD...');
    
    // Get access token for Microsoft Graph
    const graphToken = await credential.getToken('https://graph.microsoft.com/.default');
    
    // First, get the application object ID using the client ID
    console.log('Getting application object ID...');
    const appResponse = await fetch(
      `https://graph.microsoft.com/v1.0/applications?$filter=appId eq '${process.env.AZURE_CLIENT_ID}'`,
      {
        headers: {
          'Authorization': `Bearer ${graphToken.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!appResponse.ok) {
      const error = await appResponse.json();
      throw new Error(`Failed to get application: ${JSON.stringify(error)}`);
    }

    const appData = await appResponse.json();
    if (!appData.value || appData.value.length === 0) {
      throw new Error(`Application with client ID ${process.env.AZURE_CLIENT_ID} not found`);
    }

    const appObjectId = appData.value[0].id;
    console.log(`Found application object ID: ${appObjectId}`);

    const federatedCredential = {
      name: "github-actions-oidc",
      issuer: "https://token.actions.githubusercontent.com",
      subject: `repo:${owner}/${repo}:ref:refs/heads/main`,
      description: "GitHub Actions OIDC",
      audiences: ["api://AzureADTokenExchange"]
    };

    try {
      // First check if the federated credential already exists
      const checkResponse = await fetch(
        `https://graph.microsoft.com/v1.0/applications/${appObjectId}/federatedIdentityCredentials`,
        {
          headers: {
            'Authorization': `Bearer ${graphToken.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!checkResponse.ok) {
        const error = await checkResponse.json();
        throw new Error(`Failed to check existing federated credentials: ${JSON.stringify(error)}`);
      }

      const existingCreds = await checkResponse.json();
      const existingCred = existingCreds.value.find(cred => cred.name === federatedCredential.name);

      if (existingCred) {
        console.log('Federated credential already exists, updating...');
        const updateResponse = await fetch(
          `https://graph.microsoft.com/v1.0/applications/${appObjectId}/federatedIdentityCredentials/${existingCred.id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${graphToken.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(federatedCredential)
          }
        );

        if (!updateResponse.ok) {
          const error = await updateResponse.json();
          throw new Error(`Failed to update federated credentials: ${JSON.stringify(error)}`);
        }

        console.log('Successfully updated federated credentials');
      } else {
        console.log('Creating new federated credential...');
        const createResponse = await fetch(
          `https://graph.microsoft.com/v1.0/applications/${appObjectId}/federatedIdentityCredentials`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${graphToken.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(federatedCredential)
          }
        );

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(`Failed to create federated credentials: ${JSON.stringify(error)}`);
        }

        console.log('Successfully created federated credentials');
      }
    } catch (error) {
      console.error('Error configuring federated credentials:', error.message);
      throw error;
    }

    // Verify Azure connectivity
    console.log('Verifying Azure connectivity...');
    await resourceClient.resourceGroups.list();
    console.log('Azure connectivity verified successfully');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
