export interface ChatResponse {
  aiResponse: string;
  sqlQuery: string | null;
  queryResult: {
    success: boolean;
    data?: any[];
    rowCount?: number;
    error?: string;
  } | null;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    // In production, this will be the same origin
    // In development with Vite proxy, this routes to http://localhost:7071
    this.baseUrl = "/api";
  }

  async sendMessage(message: string): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send message");
    }

    return response.json();
  }
}

export const apiService = new ApiService();
