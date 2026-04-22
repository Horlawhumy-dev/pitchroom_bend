import Logger from "./logger";
import { Response } from "express";
import { handleError as handleResponseError } from "./responseHandler";

// Handle edge cases dynamically using incoming error messages
const handleError = (
  res: Response,
  statusCode: number = 400,
  errorMessage: string,
) => {
  Logger.error(errorMessage);
  return handleResponseError(res, errorMessage, null, statusCode);
};

export default handleError;
