export const calculatePaginationValues = (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const recordsPerPage = limit;
  return { skip, recordsPerPage };
};
