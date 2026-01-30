import * as appInsights from "applicationinsights";

let telemetryClient: appInsights.TelemetryClient | null = null;

export function initializeTelemetry() {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.warn("Application Insights connection string not found. Telemetry will not be collected.");
    return;
  }

  if (!telemetryClient) {
    appInsights.setup(connectionString)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true)
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(false)
      .start();

    telemetryClient = appInsights.defaultClient;
    console.log("Application Insights initialized successfully");
  }

  return telemetryClient;
}

export interface QueryTelemetry {
  userMessage: string;
  aiResponse: string;
  sqlQuery: string | null;
  querySuccess: boolean;
  queryError?: string;
  rowCount?: number;
  responseTimeMs: number;
  wasModifyingQuery: boolean;
  userId?: string;
  userLogin?: string;
  userProvider?: string;
}

export async function trackQuery(telemetry: QueryTelemetry) {
  const client = telemetryClient || initializeTelemetry();

  if (!client) {
    return;
  }

  // Track as a custom event
  client.trackEvent({
    name: "DatabaseQuery",
    properties: {
      userMessage: telemetry.userMessage,
      aiResponse: telemetry.aiResponse,
      sqlQuery: telemetry.sqlQuery || "N/A",
      querySuccess: telemetry.querySuccess,
      queryError: telemetry.queryError || "N/A",
      wasModifyingQuery: telemetry.wasModifyingQuery,
      userId: telemetry.userId || "anonymous",
      userLogin: telemetry.userLogin || "anonymous",
      userProvider: telemetry.userProvider || "none",
    },
    measurements: {
      responseTimeMs: telemetry.responseTimeMs,
      rowCount: telemetry.rowCount || 0,
    },
  });

  // Track metric for response time
  client.trackMetric({
    name: "QueryResponseTime",
    value: telemetry.responseTimeMs,
  });

  // Track failed queries separately
  if (!telemetry.querySuccess && !telemetry.wasModifyingQuery) {
    client.trackException({
      exception: new Error(telemetry.queryError || "Query failed"),
      properties: {
        userMessage: telemetry.userMessage,
        sqlQuery: telemetry.sqlQuery || "N/A",
      },
    });
  }

  // Flush to ensure events are sent before function exits
  client.flush();

  // Wait a bit to ensure flush completes
  await new Promise((resolve) => setTimeout(resolve, 500));
}

export function getTelemetryClient() {
  return telemetryClient || initializeTelemetry();
}
