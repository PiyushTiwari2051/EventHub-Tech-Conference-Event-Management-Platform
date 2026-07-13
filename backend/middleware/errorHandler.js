const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging (only in development or for critical issues)
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new Error(message);
    error.statusCode = 404;
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    error = new Error(message);
    error.statusCode = 400;
  }

  let statusCode = error.statusCode || err.statusCode;
  if (!statusCode) {
    statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  }

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
