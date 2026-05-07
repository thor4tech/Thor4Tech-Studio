import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize S3 Client for Backblaze B2
  // We use this only if environment variables are provided
  let s3: S3Client | null = null;
  const getS3Client = () => {
    if (!s3) {
      if (!process.env.B2_ENDPOINT || !process.env.B2_REGION || !process.env.B2_KEY_ID || !process.env.B2_APP_KEY) {
        throw new Error("B2 Configuration is missing");
      }
      s3 = new S3Client({
        endpoint: process.env.B2_ENDPOINT,
        region: process.env.B2_REGION,
        credentials: {
          accessKeyId: process.env.B2_KEY_ID,
          secretAccessKey: process.env.B2_APP_KEY,
        },
      });
    }
    return s3;
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 1. getUploadUrl (HTTP) - gera presigned PUT
  app.post("/api/b2/getUploadUrl", async (req, res) => {
    try {
      const { filename, contentType } = req.body;
      if (!filename) {
         res.status(400).json({ error: "Missing filename" });
         return;
      }
      
      const client = getS3Client();
      const command = new PutObjectCommand({
        Bucket: process.env.B2_BUCKET,
        Key: filename,
        ContentType: contentType || "application/octet-stream",
      });
      // URL expires in 1 hour
      const url = await getSignedUrl(client, command, { expiresIn: 3600 });
      res.json({ url });
    } catch (error: any) {
      console.error("Upload URL Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate presigned URL" });
    }
  });

  // 2. getDownloadUrl (HTTP) - gera presigned GET
  app.post("/api/b2/getDownloadUrl", async (req, res) => {
    try {
      const { key } = req.body;
      if (!key) {
         res.status(400).json({ error: "Missing file key" });
         return
      }

      const client = getS3Client();
      const command = new GetObjectCommand({
        Bucket: process.env.B2_BUCKET,
        Key: key,
      });
      // URL expires in 1 hour
      const url = await getSignedUrl(client, command, { expiresIn: 3600 });
      res.json({ url });
    } catch (error: any) {
      console.error("Download URL Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate presigned URL" });
    }
  });

  // 3. Webhook test
  app.post("/api/webhook/notify", async (req, res) => {
    console.log("Mock Webhook Triggered:", req.body);
    // Here you would call N8N_WEBHOOK_URL
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // For Express 4
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
