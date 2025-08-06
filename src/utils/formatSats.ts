export function formatSats(sats: number): string {
  if (sats === 0) return "0 sats";

  if (sats < 1000) {
    return `${sats} sats`;
  }

  if (sats < 1000000) {
    return `${(sats / 1000).toFixed(1)}k sats`;
  }

  if (sats < 100000000) {
    return `${(sats / 1000000).toFixed(2)}M sats`;
  }

  // Convert to Bitcoin (100M sats = 1 BTC)
  const btc = sats / 100000000;
  return `₿${btc.toFixed(8)}`;
}

export function satsToFormattedString(sats: number): string {
  const btc = sats / 100000000;

  if (btc >= 0.01) {
    return `₿${btc.toFixed(6)}`;
  } else if (sats >= 1000) {
    return `${(sats / 1000).toFixed(1)}k sats`;
  } else {
    return `${sats} sats`;
  }
}

export function satsToBTC(sats: number): number {
  return sats / 100000000;
}
