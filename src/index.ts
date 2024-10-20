"use strict";
import serverless from "serverless-http";
import path from "path";
import http from "http";
import * as dotenv from "dotenv";
dotenv.config();

import * as oas3Tools from "oas3-tools";
import { Oas3AppOptions } from "oas3-tools/dist/middleware/oas3.options";
const serverPort = 8080;

// swaggerRouter configuration
const options = {
  routing: {
    controllers: path.join(__dirname, "./controllers"),
  },
};

const expressAppConfig = oas3Tools.expressAppConfig(
  path.join(__dirname, "./api/openapi.yaml"),
  options as unknown as Oas3AppOptions
);
const app = expressAppConfig.getApp();

app.get("/hello", (req, res) => {
  res.send("Hello World!");
});

// Initialize the Swagger middleware
http.createServer(app).listen(serverPort, function () {
  console.log(
    "Your server is listening on port %d (http://localhost:%d)",
    serverPort,
    serverPort
  );
  console.log(
    "Swagger-ui is available on http://localhost:%d/docs",
    serverPort
  );
});

export const handler = serverless(app);
