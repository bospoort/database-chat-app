# Database Chat App - Azure Static Web Apps

A TypeScript-based starter template for allowing customers to interact with your SQL database through natural language using Google Gemini AI.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Azure Functions (TypeScript)
- **AI**: Google Gemini API
- **Database**: SQL Server / Azure SQL
- **Hosting**: Azure Static Web Apps
- **Monitoring**: Azure Application Insights
- **CI/CD**: GitHub Actions

## Architecture

```
Customer Browser (React)
    ↓
Azure Static Web Apps
    ↓
Azure Functions API
    ↓ (Gemini API)
Google Gemini
    ↓
SQL Server Database
```

## Features

- Natural language database queries
- Chat interface with conversation history
- SQL query validation and sandboxing
- Formatted results display
- Error handling and user feedback
- Secure API key management
- Application monitoring and telemetry with Application Insights
- Automated CI/CD deployment via GitHub Actions

## Prerequisites

- Node.js 18+ and npm
- TypeScript knowledge (project is fully TypeScript-based)
- Azure CLI (for manual deployment)
- Azure Static Web Apps CLI: `npm install -g @azure/static-web-apps-cli`
- Azure Functions Core Tools: `npm install -g azure-functions-core-tools@4`
- SQL Server database (local or Azure SQL)
- Google Gemini API key ([Get one here](https://aistudio.google.com/))
- Azure Application Insights resource (for monitoring)

## Project Structure

```
database-chat-app/
├── src/                    # React frontend (TypeScript)
│   ├── components/         # React components (.tsx)
│   ├── services/          # API service layer (.ts)
│   └── App.tsx            # Main app component
├── api/                   # Azure Functions (TypeScript)
│   ├── chat/             # Chat endpoint (index.ts)
│   ├── schema/           # Database schema endpoint (index.ts)
│   ├── dist/             # Compiled JavaScript output
│   └── tsconfig.json     # TypeScript configuration
├── .github/
│   └── workflows/        # GitHub Actions CI/CD workflows
├── public/               # Static assets
├── dist/                 # Built frontend output
└── staticwebapp.config.json  # Azure SWA configuration
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install API dependencies
cd api
npm install
cd ..
```

### 2. Configure Environment Variables

Create `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "GEMINI_API_KEY": "your-gemini-api-key",
    "DB_SERVER": "localhost",
    "DB_DATABASE": "inventory",
    "DB_USER": "SA",
    "DB_PASSWORD": "YourStrong@Passw0rd",
    "DB_PORT": "1433",
    "DB_ENCRYPT": "true",
    "DB_TRUST_SERVER_CERTIFICATE": "true",
    "APPINSIGHTS_INSTRUMENTATIONKEY": "your-appinsights-key"
  }
}
```

### 3. Run Locally

```bash
# Start the app (runs frontend, API with watch mode, and SWA emulator)
npm run dev

# Or start them separately:
# Terminal 1 - Frontend (Vite dev server)
npm run dev:frontend

# Terminal 2 - API (TypeScript watch mode + Functions)
cd api && npm run watch

# Terminal 3 - Azure Static Web Apps emulator
npm run dev:swa
```

The app will be available at `http://localhost:4280`

**Note**: The `dev:api-watch` script automatically recompiles TypeScript files on changes for instant function updates.

### 4. Deploy to Azure

#### Automated Deployment (Recommended)

The project uses **GitHub Actions** for automated CI/CD. Simply push to the `main` branch:

```bash
git push origin main
```

The GitHub Actions workflow will automatically:
- Build the TypeScript frontend and API
- Deploy to Azure Static Web Apps
- Run on every push to main and pull request

#### Manual Deployment

Alternatively, deploy manually using the Azure CLI:

```bash
# Build the app
npm run build

# Deploy using Azure Static Web Apps CLI
swa deploy

# Or create a new Static Web App
az staticwebapp create \
  --name database-chat-app \
  --resource-group your-resource-group \
  --location westus2 \
  --source . \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist"
```

### 5. Configure Azure Environment

In Azure Portal, add these Application Settings to your Static Web App:

- `GEMINI_API_KEY` - Your Google Gemini API key
- `DB_SERVER` - SQL Server hostname
- `DB_DATABASE` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_PORT` - Database port (default: 1433)
- `DB_ENCRYPT` - Enable encryption (true/false)
- `DB_TRUST_SERVER_CERTIFICATE` - Trust server certificate (true/false)
- `APPINSIGHTS_INSTRUMENTATIONKEY` - Application Insights instrumentation key for telemetry

## Security Considerations

### SQL Injection Protection
- All queries are validated before execution
- Only SELECT queries are allowed by default
- Table/column names are validated against schema
- Parameterized queries are used

### API Security
- API keys stored in environment variables (never in code)
- CORS configured for your domain only
- Rate limiting recommended for production

### Database Access
- Use read-only database user for customer queries
- Restrict access to specific tables/views
- Consider creating views for customer-accessible data

## Monitoring and Telemetry

The app integrates **Azure Application Insights** for comprehensive monitoring:

### Tracked Events
- User queries and chat interactions
- SQL query execution and performance
- API response times
- Error tracking and debugging
- Custom events for business intelligence

### Viewing Telemetry
1. Navigate to your Application Insights resource in Azure Portal
2. View real-time metrics, failures, and performance data
3. Use the Analytics workspace to query custom events
4. Set up alerts for errors or performance thresholds

## Customization

### Adding More Allowed Tables

Edit `api/chat/index.ts` and update `ALLOWED_TABLES`:

```typescript
const ALLOWED_TABLES = ['Products', 'Inventory', 'Categories', 'YourTable'];
```

### Customizing the System Prompt

Edit `api/chat/index.ts` and modify the `systemPrompt` variable to adjust Gemini's behavior.

### Styling

The app uses Tailwind CSS. Edit `src/index.css` or component classes to customize appearance.

## Example Queries

Once deployed, customers can ask:
- "What items do we have in stock?"
- "Show me products with quantity less than 10"
- "What's the total value of inventory?"
- "List all categories and their product counts"

## Troubleshooting

### Database Connection Issues
- Verify SQL Server is running and accessible
- Check firewall rules (Azure SQL needs your IP whitelisted)
- Verify connection string in `local.settings.json`

### Gemini API Issues
- Verify API key is correct
- Check API usage limits at aistudio.google.com
- Review function logs for detailed error messages

### Deployment Issues
- Ensure all environment variables are set in Azure
- Check Function App logs in Azure Portal
- Verify staticwebapp.config.json routes are correct
- Review GitHub Actions workflow runs for build/deployment errors

### Application Insights Issues
- Verify `APPINSIGHTS_INSTRUMENTATIONKEY` is set correctly
- Check that telemetry appears in Azure Portal (may take a few minutes)
- Review Application Insights connection logs
- Ensure `applicationinsights` package is installed in api/package.json

## License

MIT
