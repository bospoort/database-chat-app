import React from "react";

const renderMessageContent = (content: string) => {
  // Simple markdown-like rendering for code blocks
  const parts = content.split(/(```sql\n[\s\S]*?\n```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```sql\n') && part.endsWith('```')) {
      // Extract SQL code
      const code = part.slice(7, -3).trim();
      return (
        <div key={index} className="my-3 bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-2">SQL Query:</div>
          <code className="text-sm text-green-400 font-mono whitespace-pre-wrap">
            {code}
          </code>
        </div>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export interface Message {
  aiResponse?: string;
  id: string;
  role: "user" | "assistant";
  content: string;
  sqlQuery?: string;
  queryResult?: {
    success: boolean;
    data?: any[];
    rowCount?: number;
    error?: string;
  };
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-3xl ${
          isUser ? "bg-blue-600" : "bg-gray-700"
        } rounded-lg p-4 shadow-lg`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser ? "bg-blue-700" : "bg-gray-600"
            }`}
          >
            {isUser ? "👤" : "🤖"}
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-300 mb-1">
              {isUser ? "You" : "Assistant"}
            </div>

            {/* AI Response Content */}
            <div className="text-white whitespace-pre-wrap">
              {renderMessageContent(message.aiResponse || message.content)}
            </div>

            {/* SQL Query Display (only if not already shown in aiResponse) */}
            {message.sqlQuery && !message.aiResponse?.includes('```sql') && (
              <div className="mt-3 bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-400 mb-2">SQL Query:</div>
                <code className="text-sm text-green-400 font-mono">
                  {message.sqlQuery}
                </code>
              </div>
            )}

            {/* Query Results Display */}
            {message.queryResult && (
              <div className="mt-3">
                {message.queryResult.success ? (
                  <div className="bg-gray-900 rounded p-3">
                    <div className="text-xs text-gray-400 mb-2">
                      Results: {message.queryResult.rowCount} rows
                    </div>
                    {message.queryResult.data &&
                      message.queryResult.data.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-700">
                                {Object.keys(message.queryResult.data[0]).map(
                                  (key) => (
                                    <th
                                      key={key}
                                      className="text-left py-2 px-3 text-gray-400 font-medium"
                                    >
                                      {key}
                                    </th>
                                  )
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {message.queryResult.data
                                .slice(0, 10)
                                .map((row, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-gray-800"
                                  >
                                    {Object.values(row).map(
                                      (value: any, cellIdx) => (
                                        <td
                                          key={cellIdx}
                                          className="py-2 px-3 text-gray-300"
                                        >
                                          {value === null ? (
                                            <span className="text-gray-500">
                                              NULL
                                            </span>
                                          ) : (
                                            String(value)
                                          )}
                                        </td>
                                      )
                                    )}
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                          {message.queryResult.data.length > 10 && (
                            <div className="text-xs text-gray-500 mt-2">
                              Showing first 10 of {message.queryResult.rowCount}{" "}
                              rows
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                ) : (
                  <div className={`rounded p-3 ${
                    message.queryResult.error?.includes('not executed') || message.queryResult.error?.includes('not automatically executed')
                      ? 'bg-yellow-900/30 border border-yellow-700'
                      : 'bg-red-900/30 border border-red-700'
                  }`}>
                    <div className={`text-xs mb-1 ${
                      message.queryResult.error?.includes('not executed') || message.queryResult.error?.includes('not automatically executed')
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}>
                      {message.queryResult.error?.includes('not executed') || message.queryResult.error?.includes('not automatically executed')
                        ? 'Note:'
                        : 'Error:'}
                    </div>
                    <div className={`text-sm ${
                      message.queryResult.error?.includes('not executed') || message.queryResult.error?.includes('not automatically executed')
                        ? 'text-yellow-300'
                        : 'text-red-300'
                    }`}>
                      {message.queryResult.error}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
