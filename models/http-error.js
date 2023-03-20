class HttpError extends Error {
  constructor(message, errorCode) {
    super(message); // To add a "message" property
    this.code = errorCode; // To add a "code" property
  }
}

module.exports = HttpError;
