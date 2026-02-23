import { useState, useRef, useEffect } from "react";
import { ChatMessage, Message } from "./components/ChatMessage";
import { apiService } from "./services/api";
import "./index.css";

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [tokenUsage, setTokenUsage] = useState<{ promptTokenCount: number; totalTokenCount: number; contextWindow: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const response = await apiService.sendMessage(input, history);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.aiResponse,
        aiResponse: response.aiResponse,
        sqlQuery: response.sqlQuery || undefined,
        queryResult: response.queryResult || undefined,
        timestamp: new Date(),
      };

      if (response.tokenUsage) setTokenUsage(response.tokenUsage);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I encountered an error: ${
          err instanceof Error ? err.message : "Unknown error"
        }. Please try again.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const exampleGroups: { label: string; questions: string[] }[] = [
    {
      label: "Transactions",
      questions: [
        "Show me all transactions from this week: show user, resident name, resident building, and number of items. Only show transactions with type checkout.",
        "Show me total transactions from this week, this month, and this year.",
      ],
    },
    {
      label: "Items",
      questions: [
        "Show me the most checked-out item this week. Only include transactions of type checkout.",
      ],
    },
    {
      label: "Residents",
      questions: [
        "Show me all units with multiple residents and display the names of those residents on the same row.",
        "Show me the top 20 residents by number of transactions, in descending order.",
      ],
    },
    {
      label: "Buildings",
      questions: [
        "Show me the buildings listed by number of transactions in descending order. The building needs to be found through the resident, unit, building relationship; not the building code in the transaction.",
        "What is the most recent checkout transaction for any resident in a building with building code PST? Show the transaction date, resident name, unit, and volunteer.",
      ],
    },
    {
      label: "Volunteers",
      questions: [
        "Show me a top 5 list of volunteers by number of checkout transactions.",
        "Show me a top 5 list of volunteers by number of restock transactions.",
      ],
    },
  ];

  const toggleFolder = (label: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const handleExampleClick = (question: string) => {
    setInput(question);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-72 bg-gray-800 border-r border-gray-700 z-30 flex flex-col transform transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <span className="text-white font-semibold">Menu</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* New Chat button */}
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <button
            onClick={() => {
              setMessages([]);
              setTokenUsage(null);
              setIsSidebarOpen(false);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Chat
          </button>
        </div>

        {/* Example Questions */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Example Questions
          </p>
          <div className="flex flex-col gap-1">
            {exampleGroups.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => toggleFolder(group.label)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  <span className="text-xs text-gray-500">
                    {openFolders.has(group.label) ? "▼" : "▶"}
                  </span>
                  {group.label}
                </button>
                {openFolders.has(group.label) && (
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    {group.questions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleExampleClick(question)}
                        className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-2.5 text-sm text-left transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 p-4 shadow-lg flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-400 hover:text-white transition-colors flex flex-col gap-1.5 p-1"
            aria-label="Open menu"
          >
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">PSC Inventory Assistant</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Ask questions about the PSC Inventory in natural language
              </p>
            </div>
            {tokenUsage && (() => {
              const pct = tokenUsage.promptTokenCount / tokenUsage.contextWindow;
              const barColor = pct < 0.5 ? "bg-green-500" : pct < 0.8 ? "bg-yellow-500" : "bg-red-500";
              const textColor = pct < 0.5 ? "text-green-400" : pct < 0.8 ? "text-yellow-400" : "text-red-400";
              const used = tokenUsage.promptTokenCount.toLocaleString();
              const total = (tokenUsage.contextWindow / 1000).toFixed(0) + "K";
              return (
                <div className="flex flex-col items-end gap-1 min-w-36">
                  <span className={`text-xs font-mono ${textColor}`}>
                    {used} / {total} tokens
                  </span>
                  <div className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(pct * 100, 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-7xl w-full mx-auto">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="bg-gray-800 rounded-lg p-8 max-w-2xl">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Welcome! How can I help you today?
                </h2>
                <p className="text-gray-400">
                  Ask questions about your database, or open the menu to browse
                  example questions.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-700 rounded-lg p-4 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                        🤖
                      </div>
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 pb-2">
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-700 bg-gray-800 p-4">
          <form onSubmit={handleSubmit} className="max-w-7xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your database..."
                disabled={isLoading}
                className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App;
