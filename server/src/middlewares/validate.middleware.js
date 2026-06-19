'use strict';

/**
 * Fabrique un middleware de validation Joi.
 * @param {import('joi').Schema} schema
 * @param {'body'|'query'|'params'} property
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      return res.status(400).json({
        error: 'Données invalides.',
        details: error.details.map((d) => ({ field: d.path.join('.'), message: d.message })),
      });
    }
    req[property] = value;
    return next();
  };
}

module.exports = { validate };
