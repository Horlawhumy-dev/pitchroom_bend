import extractFile from "../utils/extractFile";
import Logger from "../utils/logger";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";
import fs from "fs-extra";
import { exec } from "child_process";
import { promisify } from "util";

jest.mock("../utils/logger");
jest.mock("pdf-parse", () => jest.fn());
jest.mock("mammoth", () => ({
  extractRawText: jest.fn(),
}));
jest.mock("tesseract.js", () => ({
  recognize: jest
    .fn()
    .mockResolvedValueOnce({ data: { text: "OCR Extracted Text\n" } })
    .mockResolvedValueOnce({ data: { text: "OCR Extracted Text" } }),
}));

jest.mock("fs-extra", () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(() => ["temp-1.png", "temp-2.png"]),
}));
jest.mock("util", () => ({
  promisify: jest.fn(() =>
    jest.fn().mockResolvedValue({ stdout: "", stderr: "" }),
  ),
}));

describe("extractFile", () => {
  it("should extract text from a PDF file", async () => {
    const file = {
      originalname: "resume.pdf",
      buffer: Buffer.from("fake-pdf-content"),
    } as Express.Multer.File;

    const mockPdfData = { text: "Extracted PDF content" };
    (pdfParse as jest.Mock).mockResolvedValue(mockPdfData);

    const result = await extractFile(file);

    expect(result).toBe(mockPdfData.text);
    expect(pdfParse).toHaveBeenCalledWith(file.buffer);
    expect(Logger.info).toHaveBeenCalledWith(
      "PDF content extracted successfully (Typed PDF)",
    );
  });

  it("should extract text from a scanned PDF using OCR", async () => {
    const file = {
      originalname: "scanned.pdf",
      buffer: Buffer.from("fake-pdf-content"),
    } as Express.Multer.File;

    (pdfParse as jest.Mock).mockResolvedValue({ text: "" }); // No text detected
    (Tesseract.recognize as jest.Mock).mockResolvedValue({
      data: { text: "OCR Extracted Text" },
    });

    const result = await extractFile(file);

    expect(result.trim()).toBe("OCR Extracted Text");
    expect(Logger.warn).toHaveBeenCalledWith(
      "No text found in PDF, converting to images for OCR...",
    );
    expect(Logger.info).toHaveBeenCalledWith(
      "OCR text extracted successfully (Scanned PDF)",
    );
  });

  it("should extract text from a DOCX file", async () => {
    const file = {
      originalname: "resume.docx",
      buffer: Buffer.from("fake-docx-content"),
    } as Express.Multer.File;

    const mockMammothData = { value: "Extracted DOCX content" };
    (mammoth.extractRawText as jest.Mock).mockResolvedValue(mockMammothData);

    const result = await extractFile(file);

    expect(result).toBe(mockMammothData.value);
    expect(mammoth.extractRawText).toHaveBeenCalledWith({
      buffer: file.buffer,
    });
    expect(Logger.info).toHaveBeenCalledWith(
      "DOCX content extracted successfully",
    );
  });

  it("should return an empty string for unsupported file types", async () => {
    const file = {
      originalname: "resume.txt",
      buffer: Buffer.from("fake-text-content"),
    } as Express.Multer.File;

    const result = await extractFile(file);

    expect(result).toBe("");
    expect(Logger.error).toHaveBeenCalledWith(
      "Error extracting file content:",
      expect.any(Error),
    );
  });

  it("should throw an error if file is null or undefined", async () => {
    const result = await extractFile(null as unknown as Express.Multer.File);

    expect(result).toBe("");
    expect(Logger.error).toHaveBeenCalledWith(
      "Error extracting file content:",
      expect.any(Error),
    );
  });

  it("should throw an error if file buffer is missing", async () => {
    const file = {
      originalname: "resume.pdf",
      buffer: null,
    } as unknown as Express.Multer.File;

    const result = await extractFile(file);

    expect(result).toBe("");
    expect(Logger.error).toHaveBeenCalledWith(
      "Error extracting file content:",
      expect.any(Error),
    );
  });
});
