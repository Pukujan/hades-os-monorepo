/**
 * Template — merge into backend/src/modules/<module>/routes/
 * Contract: documentPersistence v001
 */
import { Router } from "express";
import multer from "multer";

/**
 * @param {object} options
 * @param {ReturnType<import("../services/document-ingest.service.js").createDocumentIngestService>} options.ingest
 * @param {number} [options.maxUploadMb]
 */
export function createUploadRoutes({ ingest, maxUploadMb = 25 }) {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadMb * 1024 * 1024 }
  });

  router.post("/upload", upload.single("file"), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "file is required" });
      }
      const result = await ingest.uploadAndParse({
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
        caseId: req.body?.caseId
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  // TODO: GET /documents/:documentId, GET /documents/:documentId/versions, POST /documents/:documentId/parse

  return router;
}
