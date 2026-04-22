import { createClient, RedisClientType } from "redis";
import logger from "../utils/logger";
import configs from ".";

const redisClient: RedisClientType = createClient({
  url: configs.REDIS_URL,
  username: configs.REDIS_USERNAME,
  password: configs.REDIS_PASSWORD,
});

redisClient.on("error", (err) => {
  logger.error("Redis connection error:", err);
  process.exit(1);
});

export default redisClient;

export const connectRedis = async () => {
  let res = await redisClient.connect();
  if (!res) {
    logger.error("Failed to connect to Redis with URL:", configs.REDIS_URL);
    process.exit(1);
  } else {
    logger.info("Redis connected with URL:", configs.REDIS_URL);
  }
};
