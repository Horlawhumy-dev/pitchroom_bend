import multer from "multer";
import { fileLimit } from "../utils/constants";

export const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory buffer
  limits: { fileSize: fileLimit }, // 5 MB file size limit
});
