/**
 * Pagination utility functions
 */

/**
 * Calculate pagination parameters
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @returns {object} Pagination params for Prisma
 */
function getPaginationParams(page = 1, limit = 10) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10)); // Max 100 items per page

  const skip = (pageNum - 1) * limitNum;
  const take = limitNum;

  return {
    skip,
    take,
    page: pageNum,
    limit: limitNum
  };
}

/**
 * Build pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
function getPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
}

/**
 * Format paginated response
 * @param {Array} data - Data items
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Formatted paginated response
 */
function formatPaginatedResponse(data, total, page, limit) {
  return {
    success: true,
    data,
    pagination: getPaginationMeta(total, page, limit)
  };
}

/**
 * Get sort parameters for Prisma
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order ('asc' or 'desc')
 * @param {string} defaultSortBy - Default sort field
 * @returns {object} Sort params for Prisma
 */
function getSortParams(sortBy, sortOrder = 'desc', defaultSortBy = 'createdAt') {
  const validSortOrders = ['asc', 'desc'];
  const order = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
  const field = sortBy || defaultSortBy;

  return {
    [field]: order
  };
}

module.exports = {
  getPaginationParams,
  getPaginationMeta,
  formatPaginatedResponse,
  getSortParams
};
