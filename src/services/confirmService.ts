export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
}

export interface PromptOptions {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  inputType?: "text" | "number";
}

export type DialogRequest =
  | {
      id: number;
      kind: "confirm";
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      id: number;
      kind: "prompt";
      options: PromptOptions;
      resolve: (value: string | null) => void;
    };

type DialogListener = (request: DialogRequest | null) => void;

class ConfirmService {
  private current: DialogRequest | null = null;
  private listeners: Set<DialogListener> = new Set();
  private idCounter = 0;

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.current));
  }

  subscribe(listener: DialogListener): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => {
      this.listeners.delete(listener);
    };
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.current = {
        id: ++this.idCounter,
        kind: "confirm",
        options,
        resolve,
      };
      this.notify();
    });
  }

  prompt(options: PromptOptions): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.current = {
        id: ++this.idCounter,
        kind: "prompt",
        options,
        resolve,
      };
      this.notify();
    });
  }

  /** Resolve the active dialog and clear it. */
  resolveCurrent(value: boolean | string | null): void {
    const req = this.current;
    if (!req) return;
    this.current = null;
    this.notify();
    if (req.kind === "confirm") {
      req.resolve(value as boolean);
    } else {
      req.resolve(value as string | null);
    }
  }
}

// Global instance
export const confirmService = new ConfirmService();

/** Promise-based replacement for window.confirm. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return confirmService.confirm(options);
}

/** Promise-based replacement for window.prompt. */
export function promptDialog(options: PromptOptions): Promise<string | null> {
  return confirmService.prompt(options);
}
