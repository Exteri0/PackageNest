"use strict";

import { Request, Response, NextFunction, response } from "express";
import * as utils from "../utils/writer.js";
import * as Default from "../service/DefaultService.js";
import { calculateMetrics } from "../Metrics/metricExport.js";
import { CustomError, OpenApiRequest } from "../utils/types.js";
import jwt from "jsonwebtoken";
import { stringify } from "querystring";

// Things with an input like offset might cause trouble

export const CreateAuthToken = async (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
  body: any
): Promise<void> => {
  try {
    console.log("Entered CreateAuth controller function");
    const token = await Default.createAuthToken(body).then(
      (response: { token: string }) => {
        return response.token;
      }
    );
    console.log(token);
    res.json({ token: `bearer ${token}` });
  } catch (error: any) {
    console.error("Error in CreateAuth controller:", error);
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
  const name: Default.PackageName = { name: req.params.name };
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.packageByNameGet(name, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((error: any) => {
      utils.writeJson(res, error);
    });
};

export const PackageByRegExGet = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
  body: any
): void => {
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.packageByRegExGet(body, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
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
    console.log("Received response from service:", response);

    res.json(response);
    console.log("Response sent from controller");
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
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  const id: Default.PackageID = { id: req.params.name };
  Default.packageDelete(xAuthorization, id)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const packageIdCostGET = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
  dependency: boolean
): void => {
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  const id: Default.PackageID = { id: req.params.name };
  Default.packageIdCostGET(id, dependency) //xAuthorization,
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const PackageRate = async (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  console.log(`ID IN DEFAULTTS: ${req.params}`);
  const id: Default.PackageID = { id: req.params.id };
  try {
    const xAuthorization: Default.AuthenticationToken = {
      token: req.headers.authorization?.toString() ?? "",
    };
    console.log("xAuthorization token:", xAuthorization.token);

    const response = await Default.packageRate(id, xAuthorization);
    console.log("Received response from service:", response);
    res.status(200).json(response);
    console.log("Response sent from controller");
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
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  const id = req.params.id;
  Default.packageRetrieve(xAuthorization, id)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const PackageUpdate = async (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    res.status(200).json(response);
  } catch (error: any) {
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
  body: any,
  offset?: string
): Promise<void> => {
  console.log("Entered PackagesList controller function");
  try {
    const xAuthorization: Default.AuthenticationToken = {
      token: req.headers.authorization?.toString() ?? "",
    };
    console.log("xAuthorization token received");

    const response = await Default.packagesList(body, offset, xAuthorization);
    console.log("Received response from service:", response);

    // Set the offset for the next page in the response header
    if (response.nextOffset !== null) {
      res.setHeader("X-Next-Offset", response.nextOffset.toString());
    }

    // Send the packages in the response body
    res.json(response.packages);
    console.log("Response sent from controller");
  } catch (error: any) {
    if (error instanceof CustomError) {
      res.status(error.status).json({ error: error.message });
    } else {
      console.error("Error in PackagesList controller:", error);
      res.status(500).json({ error: error.message || "An error occurred" });
    }
  }
};

export const RegistryReset = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.registryReset(xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
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
    res.status(200).json(tracks);
    console.log(`Response sent from controller: ${tracks}`);
  } catch (error: any) {
    throw new CustomError("Error in tracksGET controller", 500);
  }
};

export const testGET = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.testGET(xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export function registerUser(
  req: Request<
    import("express-serve-static-core").ParamsDictionary,
    any,
    any,
    import("qs").ParsedQs,
    Record<string, any>
  >,
  res: Response<any, Record<string, any>>,
  next: NextFunction
) {
  Default.registerUser(req.body).then((response: any) => {
    utils.writeJson(res, response);
  });
}

export function getUsers(
  req: Request<
    import("express-serve-static-core").ParamsDictionary,
    any,
    any,
    import("qs").ParsedQs,
    Record<string, any>
  >,
  res: Response<any, Record<string, any>>,
  next: NextFunction
) {
  Default.getUsers().then((response: any) => {
    utils.writeJson(res, response);
  });
}

export const populate = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.populatePackages(xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
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
