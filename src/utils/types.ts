// src/types.ts
import { Request } from "express";

// Extend the Request interface to include the openapi property
export interface OpenApiRequest extends Request {
  openapi?: {
    pathParams: {
      metric_name: string | undefined;
    };
  };
}

export interface PackageMetrics {
  dependencies: number;
  pinnedDependencies: number;
  codeReviewFraction: number;
}

export class CustomError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
