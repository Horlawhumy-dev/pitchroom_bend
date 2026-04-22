// axiosConfig.ts
import axios from "axios";
import axiosRetry from "axios-retry";
import Logger from "../utils/logger";

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    Logger.warn(`Retrying request... Attempt ${retryCount}`);
    return retryCount * 1000;
  },
  retryCondition: (error: any) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.response?.status >= 400
    );
  },
});

export default axios;
