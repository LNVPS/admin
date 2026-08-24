export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / k ** i;

  // Remove unnecessary decimal places if it's a whole number
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(dm);

  return formatted + "" + sizes[i];
}

/**
 * Transfer volume in decimal (base-1000) units.
 *
 * Traffic allowances (`transfer_gb`) are counted by the API as 1 GB = 1e9
 * bytes, so usage must be rendered on the same scale — base-1024 formatting
 * would make a VM look ~7% under its quota.
 */
export function formatTransferBytes(bytes: number, decimals: number = 2): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
  const value = bytes / 1000 ** i;
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(decimals);
  return `${formatted} ${units[i]}`;
}

/** Bytes in one GB of transfer allowance (decimal, matching the API). */
export const TRANSFER_GB_BYTES = 1_000_000_000;

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
