import mongoose from "mongoose";
import logger from "../utils/logger";
import configs from ".";

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(configs.MONGO_URI, {});
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error: ${(error as Error).message}`);
    process.exit(1); // Exit with failure
  }
};

export default connectDB;
