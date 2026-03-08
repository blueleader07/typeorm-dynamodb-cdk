# GitHub Repository Setup Guide

This guide will help you set up the GitHub repository for `typeorm-dynamodb-cdk` and configure automated publishing to NPM.

## Initial Repository Setup

### 1. Create GitHub Repository

1. Go to https://github.com/blueleader07
2. Click "New repository"
3. Name: `typeorm-dynamodb-cdk`
4. Description: "AWS CDK utilities to scan TypeORM entities and create DynamoDB tables"
5. Set to Public
6. Do NOT initialize with README (we already have one)
7. Click "Create repository"

### 2. Push Code to GitHub

```bash
cd /Users/n0160926/git/typeorm-dynamodb-cdk

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: typeorm-dynamodb-cdk library"

# Add remote
git remote add origin https://github.com/blueleader07/typeorm-dynamodb-cdk.git

# Push to main branch
git branch -M main
git push -u origin main
```

## NPM Publishing Setup

### Option 1: NPM Trusted Publishing (OIDC) - Recommended

This is the most secure method and doesn't require long-lived tokens.

1. **Configure NPM Trusted Publishing:**
   - Go to https://www.npmjs.com/settings/YourUsername/packages
   - Click on your package (after first manual publish)
   - Go to "Settings" → "Publishing access"
   - Add GitHub Actions as a trusted publisher
   - Repository: `blueleader07/typeorm-dynamodb-cdk`
   - Workflow: `.github/workflows/publish-npm.yml`

2. **First Manual Publish:**
   ```bash
   npm login
   npm publish --access public
   ```

3. **No GitHub Secrets Needed** - The workflow uses OIDC authentication automatically

### Option 2: NPM Token (Alternative)

If you can't use OIDC:

1. **Generate NPM Token:**
   ```bash
   npm login
   # Then go to https://www.npmjs.com/settings/YourUsername/tokens
   # Create a new "Automation" token
   ```

2. **Add to GitHub Secrets:**
   - Go to: https://github.com/blueleader07/typeorm-dynamodb-cdk/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your NPM automation token
   - Click "Add secret"

3. **Update Workflow:**
   Edit `.github/workflows/publish-npm.yml` and uncomment the `NODE_AUTH_TOKEN` env variable in the publish step.

## GitHub App Setup (For Auto-Push)

The publish workflow needs to push version bumps back to the repository. To bypass branch protection:

### 1. Create GitHub App (One-Time Setup)

1. Go to: https://github.com/settings/apps/new
2. Fill in:
   - **GitHub App name**: `typeorm-dynamodb-cdk-release-bot` (must be unique)
   - **Homepage URL**: `https://github.com/blueleader07/typeorm-dynamodb-cdk`
   - **Webhook**: Uncheck "Active"
   - **Permissions** → Repository permissions:
     - Contents: Read and write
     - Metadata: Read-only
3. Click "Create GitHub App"
4. Note the **App ID**
5. Generate a private key (scroll down, click "Generate a private key")
6. Download the `.pem` file

### 2. Install App on Repository

1. Go to: https://github.com/settings/apps/YOUR_APP_NAME/installations
2. Click "Install App"
3. Select "Only select repositories"
4. Choose `typeorm-dynamodb-cdk`
5. Click "Install"

### 3. Add Secrets to GitHub

1. Go to: https://github.com/blueleader07/typeorm-dynamodb-cdk/settings/secrets/actions
2. Add two secrets:
   - **APP_ID**: The App ID from step 1.4
   - **APP_PRIVATE_KEY**: The contents of the `.pem` file (entire file, including BEGIN/END lines)

## Testing the CI/CD Pipeline

### Test CI Workflow

1. Make a small change and push:
   ```bash
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test CI workflow"
   git push
   ```

2. Check: https://github.com/blueleader07/typeorm-dynamodb-cdk/actions

### Test Publishing

1. Go to: https://github.com/blueleader07/typeorm-dynamodb-cdk/actions/workflows/publish-npm.yml
2. Click "Run workflow"
3. Select:
   - Branch: `main`
   - Version bump: `patch`
   - NPM tag: `latest`
4. Click "Run workflow"

## Branch Protection (Optional)

To protect the main branch:

1. Go to: https://github.com/blueleader07/typeorm-dynamodb-cdk/settings/branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Add: `lint-and-test`
   - ✅ Require branches to be up to date before merging
5. Click "Create"

Note: The GitHub App token will bypass these protections for automated releases.

## Verify Setup

After setup, verify:

- [ ] Code is on GitHub
- [ ] CI workflow runs on push
- [ ] NPM publish workflow is configured
- [ ] GitHub App can push to main
- [ ] First package published to NPM

## Troubleshooting

### NPM Publish Fails

- Verify NPM token or OIDC setup
- Check package name is available on NPM
- Ensure you're logged in: `npm whoami`

### GitHub App Push Fails

- Verify APP_ID and APP_PRIVATE_KEY secrets
- Check app has Contents write permission
- Verify app is installed on the repository

### Workflow Doesn't Trigger

- Check workflow file syntax: https://www.yamllint.com/
- Verify you have Actions enabled
- Check branch name matches trigger

## Next Steps

1. **Create GitHub Release Notes Template**: Add `.github/PULL_REQUEST_TEMPLATE.md`
2. **Add Issue Templates**: For bugs and feature requests
3. **Set up Dependabot**: Already configured in `.github/workflows/`
4. **Add Badges to README**: NPM version, build status, etc.

## Resources

- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [GitHub Apps Docs](https://docs.github.com/en/developers/apps)
- [NPM Provenance](https://docs.npmjs.com/generating-provenance-statements)
