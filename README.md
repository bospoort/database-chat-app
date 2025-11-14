# Database Chat App - Azure Static Web Apps

A starter template for allowing customers to interact with your SQL database through natural language using Claude AI.

## Architecture

```
Customer Browser (React)
    ↓
Azure Static Web Apps
    ↓
Azure Functions API
    ↓ (Claude API)
Anthropic Claude
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

## Prerequisites

- Node.js 18+ and npm
- Azure CLI
- Azure Static Web Apps CLI (`npm install -g @azure/static-web-apps-cli`)
- SQL Server database (local or Azure SQL)
- Anthropic API key

## Project Structure

```
database-chat-app/
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── services/          # API service layer
│   └── App.tsx            # Main app component
├── api/                   # Azure Functions
│   ├── chat/             # Chat endpoint
│   └── schema/           # Database schema endpoint
├── public/               # Static assets
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
    "ANTHROPIC_API_KEY": "your-anthropic-api-key",
    "DB_SERVER": "localhost",
    "DB_DATABASE": "inventory",
    "DB_USER": "SA",
    "DB_PASSWORD": "YourStrong@Passw0rd",
    "DB_PORT": "1433",
    "DB_ENCRYPT": "true",
    "DB_TRUST_SERVER_CERTIFICATE": "true"
  }
}
```

### 3. Run Locally

```bash
# Start the app (runs both frontend and API)
npm run dev

# Or start them separately:
# Terminal 1 - Frontend
npm run dev:frontend

# Terminal 2 - API
npm run dev:api
```

The app will be available at `http://localhost:4280`

### 4. Deploy to Azure

```bash
# Build the app
npm run build

# Deploy using Azure Static Web Apps CLI
swa deploy

# Or deploy using Azure CLI
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

- `ANTHROPIC_API_KEY`
- `DB_SERVER`
- `DB_DATABASE`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`
- `DB_ENCRYPT`
- `DB_TRUST_SERVER_CERTIFICATE`

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

## Customization

### Adding More Allowed Tables

Edit `api/chat/index.ts` and update `ALLOWED_TABLES`:

```typescript
const ALLOWED_TABLES = ['Products', 'Inventory', 'Categories', 'YourTable'];
```

### Customizing the System Prompt

Edit `api/chat/index.ts` and modify the `systemPrompt` variable to adjust Claude's behavior.

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

### Claude API Issues
- Verify API key is correct
- Check API usage limits at console.anthropic.com
- Review function logs for detailed error messages

### Deployment Issues
- Ensure all environment variables are set in Azure
- Check Function App logs in Azure Portal
- Verify staticwebapp.config.json routes are correct

## License

MIT
