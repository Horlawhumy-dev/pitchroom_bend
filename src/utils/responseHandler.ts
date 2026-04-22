import { Response } from "express";

export interface ApiResponse {
  message: string;
  statusCode: number;
  error: any | null;
  data: any | null;
}

export const handleSuccess = (res: Response, message: string, data: any = null, statusCode: number = 200): void => {
  res.status(statusCode).json({
    message,
    statusCode,
    error: null,
    data,
  });
};

export const handleError = (res: Response, message: string, error: any = null, statusCode: number = 500): void => {
  res.status(statusCode).json({
    message,
    statusCode,
    error,
    data: null,
  });
};
