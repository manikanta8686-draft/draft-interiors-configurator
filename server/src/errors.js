export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends ApiError {
  constructor(message = "The configuration is invalid.") {
    super(400, "INVALID_CONFIGURATION", message);
  }
}

export class EnquiryValidationError extends ApiError {
  constructor(message = "The enquiry is invalid.") {
    super(400, "INVALID_ENQUIRY", message);
  }
}

export class RateLimitError extends ApiError {
  constructor() {
    super(429, "TOO_MANY_ENQUIRIES", "Too many enquiries were submitted. Please wait and try again.");
  }
}

export class NotFoundError extends ApiError {
  constructor() {
    super(404, "CONFIGURATION_NOT_FOUND", "Configuration not found.");
  }
}
