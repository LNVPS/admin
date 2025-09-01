import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // Auto-dismiss after this many ms, 0 = no auto-dismiss
  actions?: ToastAction[];
}

export interface ToastAction {
  label: string;
  action: () => void;
  variant?: "primary" | "secondary";
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const TOAST_ICONS = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationCircleIcon,
  info: InformationCircleIcon,
};

const TOAST_COLORS = {
  success: {
    bg: "bg-green-900/20",
    border: "border-green-500/20",
    icon: "text-green-400",
    title: "text-green-300",
    message: "text-green-200/80",
  },
  error: {
    bg: "bg-red-900/20",
    border: "border-red-500/20",
    icon: "text-red-400",
    title: "text-red-300",
    message: "text-red-200/80",
  },
  warning: {
    bg: "bg-yellow-900/20",
    border: "border-yellow-500/20",
    icon: "text-yellow-400",
    title: "text-yellow-300",
    message: "text-yellow-200/80",
  },
  info: {
    bg: "bg-blue-900/20",
    border: "border-blue-500/20",
    icon: "text-blue-400",
    title: "text-blue-300",
    message: "text-blue-200/80",
  },
};

export function ToastComponent({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const IconComponent = TOAST_ICONS[toast.type];
  const colors = TOAST_COLORS[toast.type];

  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    // Auto-dismiss
    let dismissTimer: ReturnType<typeof setTimeout>;
    if (toast.duration && toast.duration > 0) {
      dismissTimer = setTimeout(() => {
        handleDismiss();
      }, toast.duration);
    }

    return () => {
      clearTimeout(showTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [toast.duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Match exit animation duration
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
        ${colors.bg} ${colors.border}
        border rounded-lg p-4 shadow-lg backdrop-blur-sm
        max-w-md w-full pointer-events-auto
      `}
    >
      <div className="flex items-start space-x-3">
        <IconComponent
          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${colors.icon}`}
        />

        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${colors.title}`}>{toast.title}</h4>

          {toast.message && (
            <p className={`mt-1 text-sm ${colors.message}`}>{toast.message}</p>
          )}

          {toast.actions && toast.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {toast.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-md transition-colors
                    ${
                      action.variant === "primary"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
