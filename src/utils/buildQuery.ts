export default function buildQuery(
  params: Record<string, any>,
): Record<string, any> {
  const { email, uid, sessionId, isActive, startDate, endDate } = params;
  const query: Record<string, any> = {};

  // Add search filters (email, uid, sessionId)
  const searchConditions = [];
  if (email) searchConditions.push({ "user.email": email });
  if (sessionId) searchConditions.push({ sessionId });
  if (uid) searchConditions.push({ "user.uid": uid });

  if (searchConditions.length > 0) {
    query["$or"] = searchConditions; // Use `$or` to match any of them
  }

  // Filter by isActive
  if (isActive !== undefined) query.isActive = isActive === "true";

  // Filter by date range (ignoring time)
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate)
      query.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) query.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  return query;
}
