import { Express, Request, Response, NextFunction } from "express";
import * as DefaultController  from "./controllers/Default";

export default (app: Express) => {

  // POST /packages (PackagesList expects req, res, next, body, offset)
  app.post("/packages", (req: Request, res: Response, next: NextFunction) => {
    const offset = req.query.offset?.toString() || ""; // assuming offset comes from query parameters
    DefaultController.PackagesList(req, res, next, req.body, offset);
  });

  // POST /package (PackageCreate expects req, res, next, body)
  app.post("/package", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.PackageCreate(req, res, next, req.body);
  });

  // DELETE /reset (RegistryReset expects req, res, next)
  app.delete("/reset", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.RegistryReset(req, res, next);
  });

  // GET /package/{id} (PackageRetrieve expects req, res, next)
  app.get("/package/:id", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.PackageRetrieve(req, res, next);
  });

  // PUT /package/{id} (PackageUpdate expects req, res, next, body)
  app.put("/package/:id", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.PackageUpdate(req, res, next, req.body);
  });

  // DELETE /package/{id} (PackageDelete expects req, res, next)
  app.delete("/package/:id", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.PackageDelete(req, res, next);
  });

  // GET /package/{id}/rate (PackageRate expects req, res, next)
  app.get("/package/:id/rate", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.PackageRate(req, res, next);
  });

  // GET /package/{id}/cost (packageIdCostGET expects req, res, next, dependency)
  app.get("/package/:id/cost", (req: Request, res: Response, next: NextFunction) => {
    const dependency = req.query.dependency === 'true';  // optional query param for dependency
    DefaultController.packageIdCostGET(req, res, next, dependency);
  });

  // PUT /authenticate (CreateAuthToken expects req, res, next, body)
  app.put("/authenticate", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.CreateAuthToken(req, res, next, req.body);
  });

  // GET /package/byName/{name} (PackageByNameGet expects req, res, next)
  app.get("/package/byName/:name", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.PackageByNameGet(req, res, next);
  });

  // POST /package/byRegEx (PackageByRegExGet expects req, res, next, body)
  app.post("/package/byRegEx", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.PackageByRegExGet(req, res, next, req.body);
  });

  // GET /tracks (tracksGET expects req, res, next)
  app.get("/tracks", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.tracksGET(req, res, next);
  });

  // GET /test (testGET expects req, res, next)
  app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.testGET(req, res, next);
  });

  // GET /test/metrics/{metric_name} (testMetricNameGET expects req, res, next)
  app.get("/test/metrics/:metric_name", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.testMetricNameGET(req, res, next);
  });
};
