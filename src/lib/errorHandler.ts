export interface EnhancedError extends Error {
  errorCode?: number;
  errorReason?: string;
  isHtmlError?: boolean;
}

export function isPermissionError(error: Error): boolean {
  const enhancedError = error as EnhancedError;

  return (
    enhancedError.errorCode === 403 ||
    error.message.includes("403") ||
    error.message.includes("Forbidden") ||
    enhancedError.errorReason === "Forbidden" ||
    error.message.toLowerCase().includes("permission denied")
  );
}

export function isAuthError(error: Error): boolean {
  const enhancedError = error as EnhancedError;

  return (
    enhancedError.errorCode === 401 ||
    error.message.includes("401") ||
    error.message.includes("Unauthorized") ||
    enhancedError.errorReason === "Unauthorized"
  );
}

export function handleApiError(error: Error) {
  // Just log the error, let components handle it
  console.error("API Error:", error);
  // You can add toast notifications here later if needed
}
