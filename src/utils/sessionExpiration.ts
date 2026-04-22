export default function getSessionExpirationDate(
  unixTimestamp: number,
): string {
  const date = new Date(unixTimestamp * 1000);
  return date.toUTCString();
}
