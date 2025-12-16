import { LoginState } from "../lib/login";
import { base64 } from "@scure/base";
import { EventEmitter } from "eventemitter3";

export interface JobFeedback {
  job_id: string;
  job_type?: string;
  worker_id?: string;
  status: JobStatus;
  timestamp: string;
}

export type JobStatus =
  | { Started: {} }
  | { Progress: { percent: number; message?: string } }
  | { Completed: { result?: string } }
  | { Failed: { error: string } }
  | { Cancelled: { reason?: string } };

// Helper function to normalize job status format
// The API sometimes sends status as a string ("Started") instead of an object ({"Started": {}})
export function normalizeJobStatus(status: any): JobStatus {
  if (typeof status === "string") {
    switch (status) {
      case "Started":
        return { Started: {} };
      case "Completed":
        return { Completed: {} };
      case "Failed":
        return { Failed: { error: "Job failed" } };
      case "Cancelled":
        return { Cancelled: {} };
      default:
        console.warn("Unknown job status string:", status);
        return { Started: {} };
    }
  }

  if (typeof status === "object" && status !== null) {
    return status as JobStatus;
  }

  console.warn("Invalid job status format:", status);
  return { Started: {} };
}

export interface WebSocketMessage {
  type: "connected" | "pong" | "error" | "job_feedback";
  message?: string;
  error?: string;
  feedback?: JobFeedback;
}

export interface JobFeedbackEvents {
  feedback: (feedback: JobFeedback) => void;
  connected: () => void;
  disconnected: () => void;
  error: (error: string) => void;
}

class JobFeedbackService extends EventEmitter<JobFeedbackEvents> {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;

  constructor() {
    super();
  }

  private getServerUrl(): string {
    try {
      const saved = localStorage.getItem("lnvps_admin_server_config");
      if (saved) {
        const config = JSON.parse(saved);
        if (config.currentServer) {
          return config.currentServer;
        }
      }
    } catch (e) {
      console.warn("Failed to load server config:", e);
    }
    return window.location.origin;
  }

  private async waitForSigner(maxAttempts: number = 5): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const signer = LoginState.getSigner();
        if (signer) {
          return true;
        }
      } catch (error) {
        // Signer not ready, wait and retry
        console.debug(
          `Signer not ready (attempt ${attempt + 1}/${maxAttempts}):`,
          error,
        );
      }

      // Wait a bit before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(1000 * 2 ** attempt, 5000)),
      );
    }
    return false;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      // First, wait for signer to be available
      const signerReady = await this.waitForSigner();
      if (!signerReady) {
        console.warn("Signer not available after waiting");
        return null;
      }

      const signer = LoginState.getSigner();
      if (!signer) return null;

      const wsUrl = `${this.getServerUrl().replace("http", "ws")}/api/admin/v1/jobs/feedback`;

      const auth = await signer.generic((eb) => {
        return eb
          .kind(27235) // NIP-98 HTTP Authentication
          .tag(["u", wsUrl])
          .tag(["method", "GET"]);
      });

      if (auth) {
        return base64.encode(new TextEncoder().encode(JSON.stringify(auth)));
      }
    } catch (error) {
      console.error("Failed to create auth token:", error);
    }
    return null;
  }

  async connect(): Promise<void> {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    // Check if we have a valid session first
    const session = LoginState.snapshot();
    if (!session) {
      console.debug("Job feedback WebSocket: No login session available");
      return;
    }

    this.isConnecting = true;

    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.warn(
          "Job feedback WebSocket: Authentication token not available (NIP-07 extension may not be loaded yet)",
        );
        this.isConnecting = false;
        // Schedule a retry if we have listeners waiting (signer might load later)
        if (this.listenerCount("feedback") > 0) {
          this.scheduleReconnect();
        }
        return;
      }

      const serverUrl = this.getServerUrl().replace("http", "ws");
      const wsUrl = `${serverUrl}/api/admin/v1/jobs/feedback?auth=${encodeURIComponent(authToken)}`;

      console.log("Connecting to job feedback WebSocket...");
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("Job feedback WebSocket connected");
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Emit connected event
        this.emit("connected");

        // Start ping timer to keep connection alive
        this.startPingTimer();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log("Job feedback WebSocket closed:", event.code, event.reason);
        this.isConnecting = false;
        this.stopPingTimer();

        // Emit disconnected event
        this.emit("disconnected");

        if (
          !event.wasClean &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("Job feedback WebSocket error:", error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error("Failed to connect to job feedback WebSocket:", error);
      this.isConnecting = false;
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case "connected":
        console.log("Job feedback stream connected:", message.message);
        break;

      case "pong":
        // Pong received, connection is alive
        break;

      case "error":
        console.error("Job feedback WebSocket error:", message.error);
        this.emit("error", message.error || "Unknown error");
        break;

      case "job_feedback":
        if (message.feedback) {
          // Normalize the job status format
          const normalizedFeedback = {
            ...message.feedback,
            status: normalizeJobStatus(message.feedback.status),
          };
          this.emit("feedback", normalizedFeedback);
        }
        break;

      default:
        console.warn("Unknown message type:", message);
    }
  }

  private startPingTimer(): void {
    this.stopPingTimer();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * 2 ** (this.reconnectAttempts - 1),
      30000,
    );

    console.log(
      `Reconnecting to job feedback WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  start(): void {
    // Auto-connect when service is started
    setTimeout(() => {
      this.connect();
    }, 2000);
  }

  disconnect(): void {
    this.stopPingTimer();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global instance
export const jobFeedbackService = new JobFeedbackService();
