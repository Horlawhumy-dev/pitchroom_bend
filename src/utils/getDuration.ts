/**
 * Calculate the duration string (e.g., "1h 54m" or "22m")
 * @param createdAt Date when the session was created
 * @returns Formatted duration string
 */
export function calculateDuration(createdAt: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60),
  );

  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
