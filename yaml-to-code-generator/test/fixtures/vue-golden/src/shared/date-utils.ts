// shared/date-utils.ts — Date formatting utilities

export function formatDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  return value ? new Date(value).toLocaleDateString(undefined, options) : '-';
}

export function formatDateTime(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  return value
    ? new Date(value).toLocaleDateString(undefined, options ?? { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '-';
  const now = Date.now();
  const date = new Date(value).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hours ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
