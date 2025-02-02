import { Octokit } from '@octokit/rest';
import { DefaultAzureCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
import sodium from 'sodium-native';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

// Get environment variables
const {
  GITHUB_TOKEN,
  AZURE_FRONTEND_CLIENT_ID,
  AZURE_FRONTEND_SUBSCRIPTION_ID,
  AZURE_BACKEND_CLIENT_ID,
  AZURE_BACKEND_SUBSCRIPTION_ID,
  AZURE_TENANT_ID
} = process.env;

// Validate required environment variables
const requiredEnvVars = {
  GITHUB_TOKEN,
  AZURE_FRONTEND_CLIENT_ID,
  AZURE_FRONTEND_SUBSCRIPTION_ID,
  AZURE_BACKEND_CLIENT_ID,
  AZURE_BACKEND_SUBSCRIPTION_ID,
  AZURE_TENANT_ID
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

async function main() {
  try {
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });

    // Get repository info
    console.log('Getting repository information...');
    const repoInfo = await getGitRemoteUrl();
    const { owner, repo } = repoInfo;
    console.log(`Repository: ${owner}/${repo}`);

    // Create production environment if it doesn't exist
    console.log('Creating/updating production environment...');
    await octokit.repos.createOrUpdateEnvironment({
      owner,
      repo,
      environment_name: 'production',
      deployment_branch_policy: {
        protected_branches: true,
        custom_branch_policies: false
      }
    });

    // Create repository secrets
    const secrets = {
      AZURE_FRONTEND_CLIENT_ID,
      AZURE_FRONTEND_SUBSCRIPTION_ID,
      AZURE_BACKEND_CLIENT_ID,
      AZURE_BACKEND_SUBSCRIPTION_ID,
      AZURE_TENANT_ID
    };

    console.log('Creating/updating repository secrets...');
    for (const [name, value] of Object.entries(secrets)) {
      try {
        await createSecret(octokit, {
          owner,
          repo,
          secretName: name,
          secretValue: value
        });
        console.log(`✓ Created/updated secret: ${name}`);
      } catch (error) {
        console.error(`✗ Failed to create/update secret ${name}:`, error.message);
        throw error;
      }
    }

    console.log('\nSuccessfully configured GitHub Actions authentication');
    console.log('The following secrets have been set:');
    Object.keys(secrets).forEach(secret => {
      console.log(`- ${secret}`);
    });
  } catch (error) {
    console.error('Error configuring GitHub Actions authentication:', error.message);
    process.exit(1);
  }
}

async function getGitRemoteUrl() {
  // Try to get from environment first
  if (process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    return { owner, repo };
  }

  // Fall back to git config
  try {
    const remoteUrl = execSync('git config --get remote.origin.url').toString().trim();
    // Handle different git URL formats (HTTPS or SSH)
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/);
    if (!match) {
      throw new Error('Could not parse GitHub repository from git remote URL');
    }
    return {
      owner: match[1],
      repo: match[2]
    };
  } catch (error) {
    throw new Error(`Could not determine GitHub repository: ${error.message}`);
  }
}

async function createSecret(octokit, { owner, repo, secretName, secretValue }) {
  try {
    // Get the repository's public key for secret encryption
    const { data: publicKey } = await octokit.actions.getRepoPublicKey({
      owner,
      repo
    });

    // Convert the secret value and public key to Buffers
    const messageBytes = Buffer.from(secretValue);
    const keyBytes = Buffer.from(publicKey.key, 'base64');

    // Encrypt the secret using libsodium
    const encryptedBytes = Buffer.alloc(messageBytes.length + sodium.crypto_box_SEALBYTES);
    sodium.crypto_box_seal(encryptedBytes, messageBytes, keyBytes);

    // Create the encrypted secret in the repository
    await octokit.actions.createOrUpdateRepoSecret({
      owner,
      repo,
      secret_name: secretName,
      encrypted_value: encryptedBytes.toString('base64'),
      key_id: publicKey.key_id
    });
  } catch (error) {
    throw new Error(`Failed to create/update secret: ${error.message}`);
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
