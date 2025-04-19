/**
 * Custom error class for API error responses
 * Makes it easier to create consistent error objects
 * that can be sent back in responses
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export default ErrorResponse; 