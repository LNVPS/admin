export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  // Remove unnecessary decimal places if it's a whole number
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(dm);

  return formatted + " " + sizes[i];
}

export function bytesToGB(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  // Remove unnecessary decimal places if it's a whole number
  return (gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)) + "GB";
}

export function bytesToMB(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  // Remove unnecessary decimal places if it's a whole number
  return (mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)) + "MB";
}
