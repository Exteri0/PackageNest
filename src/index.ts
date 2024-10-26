import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import routes from "./routes";
import serverless from "serverless-http";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res
    .status(500)
    .json({ error: err.message || "An unexpected error occurred" });
});

/* app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  routes(app);
});  */

console.log("Before registering routes");
console.log("GITHUBA CTIONS TESTING AGAINAS DASDAS");
routes(app);
console.log("Routes registered");

const handler = serverless(app);
export { handler };
