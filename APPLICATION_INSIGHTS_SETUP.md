# Application Insights Setup and Usage

This guide explains how to set up and use Application Insights for observability in your Database Chat App.

## What's Been Configured

Application Insights has been integrated into your API to track:
- **User identity** - Login name, user ID, and authentication provider
- **User questions** - Every question asked to the database assistant
- **AI responses** - The responses generated
- **SQL queries** - All generated SQL queries (both executed and non-executed)
- **Query execution results** - Success/failure, row counts, errors
- **Response times** - How long each request takes
- **Modifying queries** - Special tracking for UPDATE/INSERT/DELETE queries that aren't executed

## Setup Steps

### 1. Create an Application Insights Resource in Azure

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → Search for **Application Insights**
3. Click **Create**
4. Fill in the details:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Same as your Static Web App or create a new one
   - **Name**: e.g., `database-chat-app-insights`
   - **Region**: Choose a region close to your users
   - **Resource Mode**: Workspace-based (recommended)
5. Click **Review + Create** → **Create**

### 2. Get the Connection String

1. Once deployed, go to your Application Insights resource
2. Click **Overview** in the left menu
3. Copy the **Connection String** (it looks like: `InstrumentationKey=xxx;IngestionEndpoint=https://...`)

### 3. Configure Your Application

#### For Local Development

Add the connection string to `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "YOUR_CONNECTION_STRING_HERE",
    "GEMINI_API_KEY": "...",
    "DB_SERVER": "...",
    ...
  }
}
```

#### For Production (Azure Static Web Apps)

1. Go to your Static Web App in Azure Portal
2. Click **Configuration** in the left menu
3. Click **+ Add** under Application settings
4. Add:
   - **Name**: `APPLICATIONINSIGHTS_CONNECTION_STRING`
   - **Value**: Your connection string from step 2
5. Click **OK** → **Save**

## User Authentication Tracking

The application automatically extracts user information from Azure Static Web Apps authentication headers.

**If authentication is enabled:**
- User identity is captured from the `x-ms-client-principal` header
- You'll see actual usernames and authentication providers in your logs

**If authentication is NOT enabled:**
- All users will be logged as "anonymous"
- You can still track all queries, just without individual user attribution

To enable authentication in Azure Static Web Apps, see: [Azure Static Web Apps Authentication](https://docs.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)

## Viewing Your Telemetry Data

### Quick Start - View Recent Queries

1. Go to your Application Insights resource in Azure Portal
2. Click **Logs** in the left menu under Monitoring
3. Run this query to see all user queries:

```kql
customEvents
| where name == "DatabaseQuery"
| project
    timestamp,
    user = tostring(customDimensions.userLogin),
    provider = tostring(customDimensions.userProvider),
    userMessage = tostring(customDimensions.userMessage),
    sqlQuery = tostring(customDimensions.sqlQuery),
    success = tobool(customDimensions.querySuccess),
    responseTime = customMeasurements.responseTimeMs,
    rowCount = customMeasurements.rowCount
| order by timestamp desc
| take 50
```

### Common Queries

#### See All User Questions with User Info
```kql
customEvents
| where name == "DatabaseQuery"
| project
    timestamp,
    user = tostring(customDimensions.userLogin),
    question = tostring(customDimensions.userMessage)
| order by timestamp desc
```

#### Query Activity by User
```kql
customEvents
| where name == "DatabaseQuery"
| summarize
    queryCount = count(),
    avgResponseTime = avg(customMeasurements.responseTimeMs),
    successRate = countif(tobool(customDimensions.querySuccess)) * 100.0 / count()
    by user = tostring(customDimensions.userLogin)
| order by queryCount desc
```

#### Most Active Users
```kql
customEvents
| where name == "DatabaseQuery"
| summarize count() by tostring(customDimensions.userLogin)
| order by count_ desc
| take 10
```

#### Track Failed Queries
```kql
customEvents
| where name == "DatabaseQuery"
| where tobool(customDimensions.querySuccess) == false
| where tobool(customDimensions.wasModifyingQuery) == false
| project
    timestamp,
    userMessage = tostring(customDimensions.userMessage),
    error = tostring(customDimensions.queryError),
    sqlQuery = tostring(customDimensions.sqlQuery)
| order by timestamp desc
```

#### Average Response Time
```kql
customEvents
| where name == "DatabaseQuery"
| summarize
    avgResponseTime = avg(customMeasurements.responseTimeMs),
    maxResponseTime = max(customMeasurements.responseTimeMs),
    minResponseTime = min(customMeasurements.responseTimeMs),
    count = count()
| project avgResponseTime, maxResponseTime, minResponseTime, count
```

#### Most Common Questions
```kql
customEvents
| where name == "DatabaseQuery"
| summarize count() by tostring(customDimensions.userMessage)
| order by count_ desc
| take 20
```

#### Modifying Queries That Weren't Executed
```kql
customEvents
| where name == "DatabaseQuery"
| where tobool(customDimensions.wasModifyingQuery) == true
| project
    timestamp,
    userMessage = tostring(customDimensions.userMessage),
    sqlQuery = tostring(customDimensions.sqlQuery)
| order by timestamp desc
```

### Create a Dashboard

1. In Application Insights, click **Workbooks** under Monitoring
2. Click **+ New** to create a custom workbook
3. Add visualizations for:
   - Query volume over time
   - Success vs. failure rate
   - Average response time trends
   - Most common user questions
   - Failed queries

## Telemetry Data Collected

For each query, we track:

**Properties:**
- `userId` - Unique user identifier from Azure authentication
- `userLogin` - User's login name/email (or "anonymous" if not authenticated)
- `userProvider` - Authentication provider (e.g., "github", "aad", "twitter", or "none")
- `userMessage` - The user's question
- `aiResponse` - The AI's response
- `sqlQuery` - Generated SQL query
- `querySuccess` - Whether the query succeeded
- `queryError` - Error message (if failed)
- `wasModifyingQuery` - Whether it was UPDATE/INSERT/DELETE

**Measurements:**
- `responseTimeMs` - Total response time in milliseconds
- `rowCount` - Number of rows returned

## Cost Management

**Free Tier**: 5 GB/month of data ingestion (usually sufficient for small-medium apps)

**Estimated usage**:
- ~1-2 KB per query event
- 1000 queries/day ≈ 1-2 MB/day ≈ 30-60 MB/month (well within free tier)

**To reduce costs if needed**:
1. Adjust sampling rate in `api/src/telemetry.ts`:
   ```typescript
   appInsights.setup(connectionString)
     .setAutoCollectPerformance(false)  // Disable perf counters
     .setAutoCollectConsole(false)      // Disable console logs
     // ... other options
   ```

2. Use sampling to only capture a percentage of requests

## Troubleshooting

### No data appearing in Application Insights

1. **Check connection string**: Make sure it's correctly set in your environment
2. **Wait 2-5 minutes**: Initial data can take a few minutes to appear
3. **Check console logs**: You should see "Application Insights initialized successfully" in your function logs
4. **Verify requests are being made**: Test your app to ensure queries are actually being sent

### Connection string warning in logs

If you see "Application Insights connection string not found" in logs:
- You haven't set the `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable
- The app will work but telemetry won't be collected

## Next Steps

- Set up **Alerts** for failed queries or slow response times
- Create a **Dashboard** for real-time monitoring
- Configure **Availability Tests** to monitor uptime
- Explore **Live Metrics** for real-time debugging

## Support

For more information:
- [Application Insights Documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [KQL Query Language Reference](https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/)
