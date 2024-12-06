"use strict";

import { Request, Response, NextFunction } from "express";
import * as utils from "../utils/writer.js";
import * as Default from "../service/DefaultService.js";
import { CustomError, OpenApiRequest } from "../utils/types.js";
import jwt from "jsonwebtoken";
import { stringify } from "querystring";

export const CreateAuthToken = async (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
  body: any
): Promise<void> => {
  try {
    console.log("Entered CreateAuthToken controller function");
    const token = await Default.createAuthToken(body).then(
      (response: { token: string }) => {
        console.log("Response from createAuthToken:", response);
        return response.token;
      }
    );
    console.log("Final token:", token);

    // Set the Content-Type to text/plain
    res.type("text/plain");

    // Send the token as a plain string
    res.send(`bearer ${token}`);
    console.log("Response sent from CreateAuthToken controller");
  } catch (error: any) {
    console.error("Error in CreateAuthToken controller:", error);
    if (error instanceof CustomError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || "An error occurred" });
    }
  }
};

export const PackageByNameGet = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  console.log("Entered PackageByNameGet controller function");
  const name: Default.PackageName = { name: req.params.name };
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.packageByNameGet(name, xAuthorization)
    .then((response: any) => {
      console.log("Response from packageByNameGet:", response);
      utils.writeJson(res, response);
      console.log("Response sent from PackageByNameGet controller");
    })
    .catch((error: any) => {
      console.error("Error in PackageByNameGet:", error);
      utils.writeJson(res, error);
    });
};

export const PackageByRegExGet = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
  body: any
): void => {
  console.log("Entered PackageByRegExGet controller function");
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.packageByRegExGet(body, xAuthorization)
    .then((response: any) => {
      console.log("Response from packageByRegExGet:", response);
      utils.writeJson(res, response);
      console.log("Response sent from PackageByRegExGet controller");
    })
    .catch((response: any) => {
      console.error("Error in PackageByRegExGet:", response);
      utils.writeJson(res, response);
    });
};

export const PackageCreate = async (
  req: Request,
  res: Response,
  next: NextFunction,
  body: any
): Promise<void> => {
  console.log("Entered PackageCreate controller function");
  try {
    const xAuthorization: Default.AuthenticationToken = {
      token: req.headers.authorization?.toString() ?? "",
    };
    console.log("xAuthorization token:", xAuthorization.token);

    const response = await Default.packageCreate(
      body.Content,
      body.URL,
      body.debloat,
      body.JSProgram,
      body.customName
    );
    console.log("Response from packageCreate:", response);

    res.json(response);
    console.log("Response sent from PackageCreate controller");
  } catch (error: any) {
    console.error("Error in PackageCreate controller:", error);
    if (error instanceof CustomError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || "An error occurred" });
    }
  }
};

export const PackageDelete = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  console.log("Entered PackageDelete controller function");
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  const id: Default.PackageID = { id: req.params.name };
  Default.packageDelete(xAuthorization, id)
    .then((response: any) => {
      console.log("Response from packageDelete:", response);
      utils.writeJson(res, response);
      console.log("Response sent from PackageDelete controller");
    })
    .catch((response: any) => {
      console.error("Error in PackageDelete:", response);
      utils.writeJson(res, response);
    });
};

export const packageIdCostGET = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
  dependency: boolean
): void => {
  console.log("Entered packageIdCostGET controller function");
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  const id: Default.PackageID = { id: req.params.name };
  Default.packageIdCostGET(id, dependency)
    .then((response: any) => {
      console.log("Response from packageIdCostGET:", response);
      utils.writeJson(res, response);
      console.log("Response sent from packageIdCostGET controller");
    })
    .catch((response: any) => {
      console.error("Error in packageIdCostGET:", response);
      utils.writeJson(res, response);
    });
};

export const PackageRate = async (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("Entered PackageRate controller function");
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  const id: Default.PackageID = { id: req.params.id };
  try {
    const xAuthorization: Default.AuthenticationToken = {
      token: req.headers.authorization?.toString() ?? "",
    };
    console.log("xAuthorization token:", xAuthorization.token);

    const response = await Default.packageRate(id, xAuthorization);
    console.log("Response from packageRate:", response);
    res.status(200).json(response);
    console.log("Response sent from PackageRate controller");
  } catch (error: any) {
    console.error("Error in Rate controller:", error);
    if (error instanceof CustomError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || "An error occurred" });
    }
  }
};

export const PackageRetrieve = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  console.log("Entered PackageRetrieve controller function");
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  const id = req.params.id;
  Default.packageRetrieve(xAuthorization, id)
    .then((response: any) => {
      console.log("Response from packageRetrieve:", response);
      utils.writeJson(res, response);
      console.log("Response sent from PackageRetrieve controller");
    })
    .catch((response: any) => {
      console.error("Error in PackageRetrieve:", response);
      utils.writeJson(res, response);
    });
};

export const PackageUpdate = async (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("Entered PackageUpdate controller function");
  try {
    const xAuthorization: Default.AuthenticationToken = {
      token: req.headers.authorization?.toString() || "",
    };
    const id = req.params.id; // Extracted ID from the URL path
    const body = req.body;

    const response = await Default.packageUpdate(
      id,
      body.Content,
      body.URL,
      body.debloat,
      body.JSProgram,
      body.customName
    );
    console.log("Response from packageUpdate:", response);

    res.status(200).json(response);
    console.log("Response sent from PackageUpdate controller");
  } catch (error: any) {
    console.error("Error in PackageUpdate controller:", error);
    if (error instanceof CustomError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || "An error occurred" });
    }
  }
};

export const PackagesList = async (
  req: Request,
  res: Response,
  next: NextFunction,
  offset?: string
  
): Promise<void> => {
  console.log("Entered PackagesList controller function");
  try {
    const xAuthorization: Default.AuthenticationToken = {
      token: req.headers.authorization?.toString() ?? "",
    };
    console.log("xAuthorization token received:", xAuthorization.token);

    const response = await Default.packagesList(req.body, offset, xAuthorization);
    console.log("Response from packagesList:", response);

    // Set the offset header if nextOffset exists
    if (response.nextOffset !== null && response.nextOffset !== undefined) {
      res.setHeader("offset", response.nextOffset.toString());
    }

    // Return the packages array
    res.status(200).json(response.packages);
    console.log("Response sent from PackagesList controller");
  } catch (error: any) {
    console.error("Error in PackagesList controller:", error);
    if (error instanceof CustomError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || "An error occurred" });
    }
  }
};

export const RegistryReset = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  console.log("Entered RegistryReset controller function");
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.registryReset(xAuthorization)
    .then((response: any) => {
      console.log("Response from registryReset:", response);
      utils.writeJson(res, response);
      console.log("Response sent from RegistryReset controller");
    })
    .catch((response: any) => {
      console.error("Error in RegistryReset:", response);
      utils.writeJson(res, response);
    });
};

export const tracksGET = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  console.log("Entered tracksGET controller function");
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  try {
    const tracks = Default.tracksGET(xAuthorization);
    console.log("Response from tracksGET:", tracks);
    res.status(200).json(tracks);
    console.log("Response sent from tracksGET controller");
  } catch (error: any) {
    console.error("Error in tracksGET controller:", error);
    throw new CustomError("Error in tracksGET controller", 500);
  }
};

export const testGET = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  console.log("Entered testGET controller function");
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.testGET(xAuthorization)
    .then((response: any) => {
      console.log("Response from testGET:", response);
      utils.writeJson(res, response);
      console.log("Response sent from testGET controller");
    })
    .catch((response: any) => {
      console.error("Error in testGET:", response);
      utils.writeJson(res, response);
    });
};

export function registerUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("Entered registerUser controller function");
  Default.registerUser(req.body).then((response: any) => {
    console.log("Response from registerUser:", response);
    utils.writeJson(res, response);
    console.log("Response sent from registerUser controller");
  }).catch((error:any)=>{
    console.error("Error in registerUser:", error);
    utils.writeJson(res, error);
  });
}

export function getUsers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("Entered getUsers controller function");
  Default.getUsers().then((response: any) => {
    console.log("Response from getUsers:", response);
    utils.writeJson(res, response);
    console.log("Response sent from getUsers controller");
  }).catch((error:any)=>{
    console.error("Error in getUsers:", error);
    utils.writeJson(res, error);
  });
}

export const populate = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  console.log("Entered populate controller function");
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.populatePackages(xAuthorization)
    .then((response: any) => {
      console.log("Response from populatePackages:", response);
      utils.writeJson(res, response);
      console.log("Response sent from populate controller");
    })
    .catch((response: any) => {
      console.error("Error in populate:", response);
      utils.writeJson(res, response);
    });
};

/* export const testMetricNameGET = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  const metricName: calculate = {name: req.openapi?.pathParams?.metric_name? req.openapi.pathParams.metric_name : ""}; 
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  if (metricName.name == "correctness") {
    Metrics.getCorrectnessJSON(undefined, undefined, xAuthorization.token)
      .then((response: any) => {
        utils.writeJson(res, response);
      })
      .catch((response: any) => {
        utils.writeJson(res, response);
      });
  }
}; */
