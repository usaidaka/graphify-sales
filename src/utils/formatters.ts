export function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCompactOmzet(value: number): string {
  if (!value || isNaN(value)) return '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000_000) {
    const formatted = (abs / 1_000_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    return `${sign}${formatted}T`;
  }
  if (abs >= 1_000_000_000) {
    const formatted = (abs / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    return `${sign}${formatted}M`;
  }
  if (abs >= 1_000_000) {
    const formatted = (abs / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    return `${sign}${formatted}Jt`;
  }
  if (abs >= 1_000) {
    const formatted = (abs / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    return `${sign}${formatted}K`;
  }
  return `${sign}${abs}`;
}

export function formatOmzetFaktur(totalDPP: number, invoiceCount: number): string {
  const omzetStr = formatCompactOmzet(totalDPP);
  return `${omzetStr}/${invoiceCount}F`;
}

