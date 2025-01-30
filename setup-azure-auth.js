import { Octokit } from '@octokit/rest';
import { DefaultAzureCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
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
    
    // Get subscription ID from environment or Azure CLI
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID || 
      (await (async () => {
        try {
          const { execSync } = await import('child_process');
          return execSync('az account show --query id -o tsv').toString().trim();
        } catch (error) {
          console.error('Error getting subscription ID from Azure CLI:', error.message);
          throw new Error('AZURE_SUBSCRIPTION_ID environment variable is required if not logged in to Azure CLI');
        }
      })());
    
    const resourceClient = new ResourceManagementClient(credential, subscriptionId);

    // Initialize GitHub client
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
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

    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is required');
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
