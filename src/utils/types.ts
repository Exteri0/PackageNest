// src/types.ts
import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

// Extend the Request interface to include the openapi property
export interface OpenApiRequest extends Request {
  openapi?: {
    pathParams: {
      metric_name: string | undefined;
    };
  };
  user?: JWTUser;
}

export interface JWTUser extends JwtPayload {
  name: string;
  isAdmin: boolean;
  isBackend: boolean;
  iat: number;
  exp: number;
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

export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  [key: string]: any; // For any additional fields
}

export interface PackageJsonResult {
  name: string;
  version: string;
  dependencies: Record<string, string>;
}

export interface PackageCostDetail {
  standaloneCost: number;
  totalCost: number;
}

