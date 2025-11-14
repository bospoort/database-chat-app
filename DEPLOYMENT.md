# Azure Deployment Guide

This guide covers deploying the Database Chat App to Azure Static Web Apps.

## Prerequisites

- Azure account with an active subscription
- Azure CLI installed (`az` command)
- GitHub account (for automated deployments)
- Anthropic API key

## Deployment Methods

### Option 1: Deploy with Azure Static Web Apps CLI (Quickest)

1. **Install the SWA CLI:**
   ```bash
   npm install -g @azure/static-web-apps-cli
   ```

2. **Build your app:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   ```bash
   swa deploy
   ```

4. **Configure environment variables in Azure Portal:**
   - Navigate to your Static Web App
   - Go to Configuration > Application settings
   - Add the following:
     - `ANTHROPIC_API_KEY`
     - `DB_SERVER`
     - `DB_DATABASE`
     - `DB_USER`
     - `DB_PASSWORD`
     - `DB_PORT`
     - `DB_ENCRYPT`
     - `DB_TRUST_SERVER_CERTIFICATE`

### Option 2: Deploy with Azure CLI

1. **Create a resource group:**
   ```bash
   az group create \
     --name database-chat-rg \
     --location westus2
   ```

2. **Create the Static Web App:**
   ```bash
   az staticwebapp create \
     --name database-chat-app \
     --resource-group database-chat-rg \
     --location westus2 \
     --source . \
     --branch main \
     --app-location "/" \
     --api-location "api" \
     --output-location "dist"
   ```

3. **Configure application settings:**
   ```bash
   az staticwebapp appsettings set \
     --name database-chat-app \
     --resource-group database-chat-rg \
     --setting-names \
       ANTHROPIC_API_KEY="your-key" \
       DB_SERVER="your-server.database.windows.net" \
       DB_DATABASE="inventory" \
       DB_USER="your-user" \
       DB_PASSWORD="your-password"
   ```

### Option 3: GitHub Actions (Recommended for Production)

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/database-chat-app.git
   git push -u origin main
   ```

2. **Create Static Web App from Azure Portal:**
   - Go to Azure Portal > Create a resource > Static Web App
   - Connect to your GitHub repository
   - Configure build details:
     - App location: `/`
     - Api location: `api`
     - Output location: `dist`

3. **Azure will automatically create a GitHub Actions workflow**

4. **Add secrets to GitHub repository:**
   - Go to Settings > Secrets and variables > Actions
   - Add repository secrets:
     - `ANTHROPIC_API_KEY`
     - `DB_SERVER`
     - `DB_DATABASE`
     - `DB_USER`
     - `DB_PASSWORD`

5. **Configure environment variables in Azure Portal** (as shown in Option 1)

## Database Setup for Azure

### Using Azure SQL Database

1. **Create Azure SQL Database:**
   ```bash
   az sql server create \
     --name your-sql-server \
     --resource-group database-chat-rg \
     --location westus2 \
     --admin-user sqladmin \
     --admin-password YourStrong@Passw0rd

   az sql db create \
     --resource-group database-chat-rg \
     --server your-sql-server \
     --name inventory \
     --service-objective S0
   ```

2. **Configure firewall to allow Azure services:**
   ```bash
   az sql server firewall-rule create \
     --resource-group database-chat-rg \
     --server your-sql-server \
     --name AllowAzureServices \
     --start-ip-address 0.0.0.0 \
     --end-ip-address 0.0.0.0
   ```

3. **Run the sample database script:**
   - Connect using Azure Data Studio or SSMS
   - Run `sample-database.sql`

4. **Update environment variables:**
   - `DB_SERVER`: `your-sql-server.database.windows.net`
   - `DB_DATABASE`: `inventory`
   - `DB_USER`: `sqladmin`
   - `DB_PASSWORD`: `YourStrong@Passw0rd`
   - `DB_ENCRYPT`: `true`
   - `DB_TRUST_SERVER_CERTIFICATE`: `false` (for Azure SQL)

### Using Existing On-Premises SQL Server

If you want to use your on-premises SQL Server:

1. **Set up VPN or ExpressRoute connection to Azure**

2. **Or use Azure SQL Managed Instance with VNet integration**

3. **Update connection settings accordingly**

## Security Considerations

### Database Security

1. **Create read-only user for customer queries:**
   ```sql
   CREATE USER [database_chat_user] WITH PASSWORD = 'StrongPassword123!';
   
   -- Grant SELECT only on allowed tables
   GRANT SELECT ON Products TO [database_chat_user];
   GRANT SELECT ON Categories TO [database_chat_user];
   GRANT SELECT ON Inventory TO [database_chat_user];
   GRANT SELECT ON Orders TO [database_chat_user];
   ```

2. **Update environment variables to use the read-only user**

### API Key Security

- Store `ANTHROPIC_API_KEY` in Azure Key Vault (recommended for production)
- Never commit keys to source control
- Rotate keys regularly

### CORS Configuration

The `staticwebapp.config.json` is already configured, but verify CORS settings for your domain.

## Monitoring and Logging

1. **Enable Application Insights:**
   ```bash
   az monitor app-insights component create \
     --app database-chat-insights \
     --location westus2 \
     --resource-group database-chat-rg
   ```

2. **Connect to your Static Web App** through Azure Portal

3. **View logs:**
   - Azure Portal > Your Static Web App > Functions > Monitor
   - Or use Application Insights for detailed telemetry

## Cost Optimization

- **Azure Static Web Apps**: Free tier available (100 GB bandwidth/month)
- **Azure SQL**: Use S0 tier for testing (~$15/month), scale as needed
- **Azure Functions**: Included with Static Web Apps
- **Anthropic API**: Pay per token used

## Troubleshooting

### Functions not working
- Check Application Settings are configured correctly
- Review Function App logs in Azure Portal
- Verify `api/package.json` dependencies are correct

### Database connection issues
- Verify firewall rules allow Azure services
- Check connection string format
- Test connection from Azure Cloud Shell

### Build failures
- Ensure all dependencies in `package.json` are correct
- Verify Node.js version compatibility (18+)
- Check GitHub Actions logs for detailed errors

## Updating the Application

### Via GitHub (if using GitHub Actions)
```bash
git add .
git commit -m "Update message"
git push
```

### Via SWA CLI
```bash
npm run build
swa deploy
```

## Next Steps

1. Set up custom domain
2. Configure authentication if needed
3. Add rate limiting for API endpoints
4. Set up monitoring alerts
5. Implement caching strategies
