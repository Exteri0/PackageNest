import { Express, Request, Response, NextFunction } from "express";
import * as DefaultController from "./controllers/Default";
import { verifyJWT } from "./middleware/verifyJWT";
import { CustomError } from "/home/shay/a/manjuna0/461/PackageNest/src/utils/types.js";
import { packageIdCostGET } from "/home/shay/a/manjuna0/461/PackageNest/src/service/DefaultService.js";
import { AuthenticationToken } from "/home/shay/a/manjuna0/461/PackageNest/src/service/DefaultService.js"




export default (app: Express) => {
  // POST /packages (PackagesList expects req, res, next, body, offset)
  app.post(
    "/packages",
    async (req: Request, res: Response, next: NextFunction) => {
      console.log("Received POST /packages request");
      try {
        const offset = req.query.offset?.toString() ?? "";
        const body = req.body;
        console.log("Offset:", offset);
        console.log("Request Body:", body);

        await DefaultController.PackagesList(req, res, next, body, offset);

        console.log("Response sent successfully");
      } catch (error) {
        console.error("Error in /packages route handler:", error);
        next(error);
      }
    }
  );

  // POST /package (PackageCreate expects req, res, next, body)
  app.post(
    "/package",
    async (req: Request, res: Response, next: NextFunction) => {
      console.log("Received POST /package request");
      try {
        const body = req.body;
        console.log("Request Body:", body);

        await DefaultController.PackageCreate(req, res, next, body);

        console.log("Response sent successfully");
      } catch (error) {
        console.error("Error in /package route handler:", error);
        next(error);
      }
    }
  );

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
  app.delete(
    "/package/:id",
    (req: Request, res: Response, next: NextFunction) => {
      DefaultController.PackageDelete(req, res, next);
    }
  );

  // GET /package/{id}/rate (PackageRate expects req, res, next)
  app.get(
    "/package/:id/rate",
    (req: Request, res: Response, next: NextFunction) => {
      DefaultController.PackageRate(req, res, next);
    }
  );

  // GET /package/{id}/cost (packageIdCostGET expects req, res, next, dependency)
  /*app.get(
    "/package/:id/cost",
    (req: Request, res: Response, next: NextFunction) => {
      const dependency = req.query.dependency === "true"; // optional query param for dependency
      DefaultController.packageIdCostGET(req, res, next, dependency);
    }
  );*/
  app.get("/package/:id/cost", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const packageId = req.params.id;
        //const xAuthorization = req.headers.authorization;
        const dependency = req.query.dependency === "true"; // optional query param for dependency
      
        const cost = await packageIdCostGET({ id: packageId }, dependency);
        res.json(cost);
    } catch (error) {
        if (error instanceof CustomError) {
            res.status(error.status || 500).json({ message: error.message });
        } else {
            next(error); // Pass to default error handler
        }
    }
});

  // PUT /authenticate (CreateAuthToken expects req, res, next, body)
  app.put(
    "/authenticate",
    (req: Request, res: Response, next: NextFunction) => {
      console.log("Received PUT /authenticate request");
      DefaultController.CreateAuthToken(req, res, next, req.body);
    }
  );

  // GET /package/byName/{name} (PackageByNameGet expects req, res, next)
  app.get(
    "/package/byName/:name",
    (req: Request, res: Response, next: NextFunction) => {
      DefaultController.PackageByNameGet(req, res, next);
    }
  );

  // POST /package/byRegEx (PackageByRegExGet expects req, res, next, body)
  app.post(
    "/package/byRegEx",
    (req: Request, res: Response, next: NextFunction) => {
      DefaultController.PackageByRegExGet(req, res, next, req.body);
    }
  );

  // GET /tracks (tracksGET expects req, res, next)
  app.get("/tracks", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.tracksGET(req, res, next);
  });

  // GET /test (testGET expects req, res, next)
  app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.testGET(req, res, next);
  });

  app.post("/register", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.registerUser(req, res, next);
  });

  app.get("/getUsers", (req: Request, res: Response, next: NextFunction) => {
    console.log("Received GET /getUsers request");
    DefaultController.getUsers(req, res, next);
  });

  app.get(
    "/protected",
    (req: Request, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, true);
    },
    (req: Request, res: Response, next: NextFunction) => {
      console.log("Received GET /protected request");
      res.status(200).send("Protected route accessed");
    }
  );

  // GET /test/metrics/{metric_name} (testMetricNameGET expects req, res, next)
  /* app.get("/test/metrics/:metric_name", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.testMetricNameGET(req, res, next);
  }); */
};
