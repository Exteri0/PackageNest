import express, { Request, Response } from "express";
import cors from "cors";
import routes from "./routes";
import serverless from "serverless-http";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
/* app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  routes(app);
});  */

routes(app);


const handler = serverless(app);
export { handler };
