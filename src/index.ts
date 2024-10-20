import express, { Request, Response } from "express";
import cors from "cors";
import routes from "./routes";
import serverless from "serverless-http";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, world!");
});

// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
//   routes(app);
// });

routes(app);

// const server = awsServerlessExpress.createServer(app);

// export const handler = (event: APIGatewayProxyEvent, context: Context) => {
//   return awsServerlessExpress.proxy(server, event, context);
// };

const handler = serverless(app);
export { handler };
