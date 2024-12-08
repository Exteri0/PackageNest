import { Express, Request, Response, NextFunction } from "express";
import * as DefaultController from "./controllers/Default.js";
import { verifyJWT } from "./middleware/verifyJWT.js";
import { CustomError } from "./utils/types.js";
import {
  packageIdCostGET,
  AuthenticationToken,
} from "./service/DefaultService.js";
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PackageNest API',
      version: '1.0.0',
      description: 'API documentation for the PackageNest project',
    },
  },
  apis: ['./routes.js'], // Path to the API routes
}

const swaggerSpec = swaggerJSDoc(swaggerOptions);

console.log("Routes file loaded");

// Define an interface for AuthenticatedRequest to include 'user'
export interface AuthenticatedRequest extends Request {
  user?: any;
}

export default (app: Express) => {

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  // POST /packages
  app.post(
    "/packages",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      console.log("Received POST /packages request");
      try {
        const offset = req.query.offset?.toString() ?? "";
        const body = req.body;
        console.log("Offset:", offset);
        console.log("Request Body:", body);

        await DefaultController.PackagesList(req, res, next, offset);

        console.log("Response sent successfully");
      } catch (error) {
        console.error("Error in /packages route handler:", error);
        next(error);
      }
    }
  );

  // POST /package
  app.post(
    "/package",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

  // DELETE /reset
  app.delete(
    "/reset",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, true, false); // Assuming only admin/backend can reset
    },
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      DefaultController.RegistryReset(req, res, next);
    }
  );

  

  // GET /package/{id}
  app.get(
    "/package/:id",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      DefaultController.PackageRetrieve(req, res, next);
    }
  );

  // POST /package/byRegEx
  app.post(
    "/package/byRegEx",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      DefaultController.PackageByRegExGet(req, res, next, req.body);
    }
  );

  // POST /package/{id}
  app.post(
    "/package/:id",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    async (req: AuthenticatedRequest, res: Response, next: NextFunction)=> {
      console.log("Received POST /package/:id request");
      console.log("ID is:", req.params.id);
      try {
        const body = req.body;
        console.log("Request Body:", body);

        await DefaultController.PackageUpdate(req, res, next);

        console.log("Response sent successfully");
      } catch (error) {
        console.error("Error in /package/:id route handler:", error);
        next(error);
      }
    }
  );

  // DELETE /package/{id}
  app.delete(
    "/package/:id",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      DefaultController.PackageDelete(req, res, next);
    }
  );

  // GET /package/{id}/rate
  app.get(
    "/package/:id/rate",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      DefaultController.PackageRate(req, res, next);
    }
  );

  // GET /package/{id}/cost
  app.get(
    "/package/:id/cost",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        console.log("Received GET /package/:id/cost request");
        await DefaultController.packageIdCostGET(req, res, next);
      } catch (error) {
        console.error("Error in /package/:id/cost route handler:", error);
        next(error);
      }
    }
  );

  // PUT /authenticate (No authentication required)
  app.put(
    "/authenticate",
    (req: Request, res: Response, next: NextFunction) => {
      console.log("Received PUT /authenticate request");
      DefaultController.CreateAuthToken(req, res, next, req.body);
    }
  );

  // GET /package/byName/{name}
  app.get(
    "/package/byName/:name",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      DefaultController.PackageByNameGet(req, res, next);
    }
  )

  // GET /tracks (tracksGET expects req, res, next)
  app.get("/tracks", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.tracksGET(req, res, next);
  });

  // GET /test
  app.get(
    "/test",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      DefaultController.testGET(req, res, next);
    }
  );

  // POST /register (No authentication required)
  app.post("/register", (req: Request, res: Response, next: NextFunction) => {
    DefaultController.registerUser(req, res, next);
  });

  // GET /getUsers (Assuming admin access required)
  app.get(
    "/getUsers",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, true, false);
    },
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      console.log("Received GET /getUsers request");
      DefaultController.getUsers(req, res, next);
    }
  );

  // POST /decode (Already set up)
  app.post(
    "/decode",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false, 0);
    },
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      console.log("Received POST /decode request");
      res.status(200).json({ user: req.user });
    }
  );

  // POST /populate
  app.post(
    "/populate",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      verifyJWT(req, res, next, false, false);
    },
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      console.log("Received POST /populate request");
      try {
        await DefaultController.populate(req, res, next);
        console.log("Populate response sent successfully");
      } catch (error) {
        console.error("Error in /populate route handler:", error);
        next(error);
      }
    }
  );
};
