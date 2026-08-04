import { EventEmitter } from "eventemitter3";
import { AdminApi } from "../lib/api";
import { LoginState } from "../lib/login";

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

/** Path the feedback socket lives on, and which its ticket is bound to. */
const JOB_FEEDBACK_PATH = "/api/admin/v1/jobs/feedback";

/**
 * Whether an error says this account lacks the permission, as opposed to any
 * other 403.
 *
 * The API returns 403 both for "insufficient permissions" and for transient
 * failures while building the admin identity (a DB blip resolving the user's
 * roles). Only the former is permanent, so match the message too — latching on
 * the latter would disable job feedback for the rest of the session over a
 * momentary hiccup.
 */
function isPermissionDenied(error: unknown): boolean {
  const err = error as { errorCode?: number; message?: string } | undefined;
  if (err?.errorCode !== 403) return false;
  return /insufficient permissions/i.test(err.message ?? "");
}

class JobFeedbackService extends EventEmitter<JobFeedbackEvents> {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  /**
   * Set once the server has told us this account may not read job feedback.
   * Latches so we stop retrying — a permission error is not transient, and the
   * admin API is now rate limited.
   */
  private permissionDenied = false;

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

  /**
   * Mint a single-use ticket for the feedback socket.
   *
   * Replaces the old approach of signing a NIP-98 event over the `ws://` URL
   * and passing it as `?auth=`. That put a signature made by the admin's
   * identity key into a URL, and the server did not verify it at all — it now
   * does, and also requires `virtual_machines::view`.
   *
   * Returns `null` when no ticket can be obtained; the caller distinguishes
   * "not ready yet" from "not allowed" via {@link permissionDenied}.
   */
  private async getAuthTicket(): Promise<string | null> {
    try {
      // The ticket request is itself NIP-98 authenticated, so the signer has to
      // be up before we can ask for one.
      const signerReady = await this.waitForSigner();
      if (!signerReady) {
        console.warn("Signer not available after waiting");
        return null;
      }

      const api = new AdminApi(this.getServerUrl());
      return await api.issueAuthTicket(JOB_FEEDBACK_PATH);
    } catch (error) {
      // Lacking `virtual_machines::view` will never succeed on retry, so stop
      // reconnecting rather than hammering a now rate-limited endpoint. Any
      // other failure is treated as transient and retried as before.
      if (isPermissionDenied(error)) {
        this.permissionDenied = true;
        console.warn("Job feedback WebSocket: account lacks virtual_machines::view, not connecting");
      } else {
        console.error("Failed to obtain job feedback ticket:", error);
      }
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

    // This account is not permitted to read the feedback stream; nothing to do.
    if (this.permissionDenied) {
      return;
    }

    this.isConnecting = true;

    try {
      const ticket = await this.getAuthTicket();
      if (!ticket) {
        this.isConnecting = false;
        // A permission failure will never resolve; only retry for transient
        // reasons (e.g. the NIP-07 extension had not loaded yet).
        if (!this.permissionDenied && this.listenerCount("feedback") > 0) {
          this.scheduleReconnect();
        }
        return;
      }

      const serverUrl = this.getServerUrl().replace("http", "ws");
      const wsUrl = `${serverUrl}${JOB_FEEDBACK_PATH}?ticket=${encodeURIComponent(ticket)}`;

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
    // A fresh login may have different permissions, so clear the latch.
    this.permissionDenied = false;
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global instance
export const jobFeedbackService = new JobFeedbackService();
