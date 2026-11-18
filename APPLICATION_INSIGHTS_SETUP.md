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

## Monitoring Usage

### Which signal to trust

Every call to the `query` function writes a trace line `User: <login> (<provider>)` through the Functions host logger. This is the most reliable usage signal, because it travels the same path as the host's own logs.

Do **not** read usage from overall trace volume. The Functions host writes 20–30 configuration and lifecycle traces (`Job host started`, `LoggerFilterOptions ...`, `DrainMode mode enabled`, health checks) every time it starts or recycles, so trace counts spike on days with no chat traffic at all. Opening the web page does not call the API either; only sending a message does.

Application Insights keeps data for 90 days by default.

### Usage per day

```kql
traces
| where timestamp > ago(90d)
| where message startswith "User: "
| parse message with "User: " login " (" provider ")"
| summarize messages = count(), users = dcount(login), who = make_set(login)
    by day = bin(timestamp, 1d)
| order by day desc
```

### The questions users asked

From the `DatabaseQuery` custom event:

```kql
customEvents
| where timestamp > ago(90d) and name == "DatabaseQuery"
| project timestamp,
    user = tostring(customDimensions.userLogin),
    question = tostring(customDimensions.userMessage),
    sql = tostring(customDimensions.sqlQuery),
    success = tostring(customDimensions.querySuccess),
    error = tostring(customDimensions.queryError),
    rows = toint(customMeasurements.rowCount),
    ms = toint(customMeasurements.responseTimeMs)
| order by timestamp asc
```

If no custom events arrive, the generated SQL and AI response are also logged as traces and can be grouped per invocation (the question itself is not in the traces):

```kql
let calls = traces
| where timestamp > ago(90d) and message startswith "User: "
| project operation_Id, start = timestamp, user = message;
traces
| where timestamp > ago(90d)
| where message startswith "Extracted SQL Query:" or message startswith "AI Response:"
| join kind=inner calls on operation_Id
| project start, user, timestamp, message
| order by start asc, timestamp asc
```

Expand a row in the results grid to see the full text; long values are truncated in the grid.

### Weekly usage email (Logic App)

Azure Monitor alert rules evaluate at most once every 24 hours, so a weekly digest uses a Consumption Logic App in the bot's resource group.

1. **Create** a Logic App on the **Consumption** plan, workflow type **Stateful**, log analytics off.
2. **Trigger: Recurrence** with interval `1`, frequency `Week`, and under advanced parameters a time zone (Pacific Standard Time), day (Monday) and hour (`8`).
3. **Action: Azure Monitor Logs → Run query and visualize results**
   - Resource type: *Application Insights*, pointing at the bot's resource
   - Time range: **Last 7 days**
   - Chart type: **Html Table**
   - Query:
     ```kql
     traces
     | where message startswith "User: "
     | parse message with "User: " login " (" provider ")"
     | summarize messages = count(), days = dcount(bin(timestamp, 1d)),
         first = min(timestamp), last = max(timestamp) by login
     | order by messages desc
     ```
4. **Action: Outlook.com / Office 365 Outlook → Send an email (V2)** with the previous step's **Body** output as the email body. Its **Attachment Content** and **Attachment Name** outputs can be attached as well.
5. Save and use **Run Trigger** once to test it.

As configured, the email arrives every week; an empty table means nobody used the bot. To mail only in weeks with activity, add a **Condition** before the email step that checks the query returned rows. To include the questions, add a second query step with the `DatabaseQuery` query above.

### Daily alert (alternative)

For a notification soon after someone uses the bot, create an alert rule on the Application Insights resource (**Alerts → Create → Alert rule → Custom log search**):

```kql
traces
| where message startswith "User: "
| parse message with "User: " login " (" provider ")"
| project timestamp, login
```

- Measure **Table rows**, aggregation **Count**, split by dimension `login`
- Operator **Greater than**, threshold `0`
- Frequency and window: 15 minutes for near-real-time, or 24 hours for at most one email per day
- Leave **Automatically resolve alerts** checked to get one notification per burst of activity
- Action group: email and/or Azure mobile app push

Filter out testers with `| where login !in ("...")` before the `project` line.

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
