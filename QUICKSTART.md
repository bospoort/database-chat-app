# Quick Start Guide

Get the Database Chat App running locally in under 5 minutes!

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] SQL Server running (local or Azure SQL)
- [ ] Anthropic API key (get one at console.anthropic.com)
- [ ] Git installed

## Step 1: Clone and Install (2 minutes)

```bash
# Clone the repository
git clone <your-repo-url>
cd database-chat-app

# Install dependencies
npm install

# Install API dependencies
cd api
npm install
cd ..
```

## Step 2: Configure Environment (1 minute)

```bash
# Copy the template
cp api/local.settings.json.template api/local.settings.json

# Edit with your settings
code api/local.settings.json
```

Update the following values:
- `ANTHROPIC_API_KEY`: Your API key from console.anthropic.com
- `DB_SERVER`: Your SQL Server address (e.g., `localhost` or `server.database.windows.net`)
- `DB_DATABASE`: Your database name (e.g., `inventory`)
- `DB_USER`: Your SQL username
- `DB_PASSWORD`: Your SQL password

## Step 3: Set Up Sample Database (1 minute)

Connect to your SQL Server and run:

```bash
# Using sqlcmd
sqlcmd -S localhost -U SA -P 'YourStrong@Passw0rd' -i sample-database.sql

# Or open sample-database.sql in:
# - SQL Server Management Studio (SSMS)
# - Azure Data Studio
# - VS Code with SQL Server extension
```

This creates sample tables (Products, Categories, Inventory, Orders) with test data.

## Step 4: Run the App (1 minute)

```bash
# Start both frontend and API
npm run dev
```

The app will open at `http://localhost:4280`

## Step 5: Try It Out!

Ask questions like:
- "What items do we have in stock?"
- "Show me products with quantity less than 10"
- "What's the total value of inventory?"
- "List all categories"

## Common Issues

### Port already in use
```bash
# Kill process on port 4280 or 7071
npx kill-port 4280 7071
npm run dev
```

### Can't connect to database
1. Verify SQL Server is running
2. Check credentials in `local.settings.json`
3. For Azure SQL, add your IP to firewall rules
4. Test connection with: `sqlcmd -S <server> -U <user> -P <password> -d <database>`

### API key not working
1. Verify you copied the entire key (starts with `sk-ant-api...`)
2. Check console.anthropic.com for usage limits
3. Make sure key is in quotes in `local.settings.json`

### Functions not starting
```bash
# Reinstall Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Check Node version (needs 18+)
node --version

# Clear cache
cd api
rm -rf node_modules
npm install
cd ..
```

## What's Next?

### Customize for Your Database

1. **Edit allowed tables** in `api/chat/index.js`:
   ```javascript
   const ALLOWED_TABLES = ['YourTable1', 'YourTable2'];
   ```

2. **Update example questions** in `src/App.tsx`:
   ```typescript
   const exampleQuestions = [
     "Your custom question 1",
     "Your custom question 2"
   ];
   ```

### Deploy to Azure

Ready to deploy? Follow the [DEPLOYMENT.md](DEPLOYMENT.md) guide.

### Add Features

- Authentication (Azure AD, Auth0)
- More database operations (filtered to safe operations)
- Export query results to CSV
- Query history
- Multi-database support

## Development Tips

### Running Frontend Only
```bash
npm run dev:frontend
# Visit http://localhost:5173
```

### Running API Only
```bash
npm run dev:api
# API available at http://localhost:7071
```

### Debug API
Add `console.log()` statements in `api/chat/index.js` and watch the terminal output.

### Test API Directly
```bash
# Test schema endpoint
curl http://localhost:7071/api/schema

# Test chat endpoint
curl -X POST http://localhost:7071/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What tables do we have?"}'
```

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for Azure deployment
- Open an issue on GitHub
- Check Azure Functions logs if API isn't working

## Project Structure

```
database-chat-app/
├── src/                    # React frontend
│   ├── components/         # React components
│   │   └── ChatMessage.tsx # Message display component
│   ├── services/          # API service layer
│   │   └── api.ts         # API client
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── api/                   # Azure Functions backend
│   └── chat/
│       └── index.js       # Chat endpoint with Claude + SQL
├── sample-database.sql    # Sample database setup
└── staticwebapp.config.json  # Azure SWA config
```

## Success!

You should now have a working database chat application! 

Try asking complex questions and see how Claude converts them to SQL and executes them safely.
