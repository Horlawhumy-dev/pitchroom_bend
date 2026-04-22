import Logger from "./logger";
import { extname } from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";
import fs from "fs-extra";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

const extractFile = async (
  file: Express.Multer.File | null | undefined,
): Promise<string> => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid pitch deck file");
    }

    const fileExtension = extname(file.originalname).toLowerCase();

    if (fileExtension === ".pdf") {
      const data = await pdfParse(file.buffer);
      if (data.text.trim()) {
        Logger.info("PDF content extracted successfully (Typed PDF)");
        return data.text || "";
      } else {
        Logger.warn("No text found in PDF, converting to images for OCR...");

        // Save PDF to a temp file
        const tempPdfPath = `./temp-${Date.now()}.pdf`;
        await fs.writeFile(tempPdfPath, file.buffer);

        // Convert PDF to images (One image per page)
        const outputImagePath = `./temp-${Date.now()}-%d.png`;
        await execPromise(`pdftoppm -png ${tempPdfPath} ${outputImagePath}`);

        // Get list of generated images
        const imageFiles: string[] = fs
          .readdirSync("./")
          .filter((f: string) => f.startsWith("temp-") && f.endsWith(".png"));

        let extractedText = "";

        for (const image of imageFiles) {
          const { data: ocrData } = await Tesseract.recognize(image, "eng");
          extractedText += ocrData.text + "\n";
          fs.unlinkSync(image); // Delete temp images after OCR
        }

        fs.unlinkSync(tempPdfPath); // Delete temp PDF

        Logger.info("OCR text extracted successfully (Scanned PDF)");
        return extractedText.trim();
      }
    } else if (fileExtension === ".docx") {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      Logger.info("DOCX content extracted successfully");
      return result.value || "";
    } else {
      throw new Error("Only PDF and DOCX files are allowed.");
    }
  } catch (error) {
    Logger.error("Error extracting file content:", error);
    return "";
  }
};

export default extractFile;
