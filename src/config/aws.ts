import AWS from "aws-sdk";
import configs from "./index";

export const awsBucket = new AWS.S3({
  accessKeyId: configs.AWS_ACCESS_KEY,
  secretAccessKey: configs.AWS_SECRET_KEY,
  region: configs.AWS_SES_REGION_NAME,
});
