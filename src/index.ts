import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import routes from "./routes.js";
import cookieParser from "cookie-parser";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const app = express();
const port = 3000;

app.use(cookieParser());

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  console.log("Type of res:", typeof res);
  console.log("res properties:", Object.keys(res));
  res
    .status(500)
    .json({ error: err.message || "An unexpected error occurred" });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sslServer = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, "../cert/key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "../cert/cert.pem")),
  },
  app
);

app.listen(port, () => {
  console.log(`Server is running on https://localhost:${port}`);
  routes(app);
});

// console.log("is this worki");
// console.log("Before registering routes");
// routes(app);
// console.log("Routes registered");
