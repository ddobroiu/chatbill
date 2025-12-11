const { z } = require('zod');

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema for validation
 * @param {string} source - Where to get data from: 'body', 'query', 'params'
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];

      // Parse and validate data
      const validatedData = schema.parse(dataToValidate);

      // Replace request data with validated (and potentially transformed) data
      req[source] = validatedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod errors into a readable format
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Validare eșuată',
          errors: formattedErrors
        });
      }

      // If not a Zod error, pass to error handler
      next(error);
    }
  };
};

/**
 * Validate request body
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate query parameters
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate URL parameters
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Partial validation - makes all fields optional
 */
const validatePartial = (schema, source = 'body') => {
  return validate(schema.partial(), source);
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validatePartial
};
