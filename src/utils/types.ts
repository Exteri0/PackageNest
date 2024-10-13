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
