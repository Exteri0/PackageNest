"use strict";

import { Request, Response, NextFunction, response } from "express";
import * as utils from "../utils/writer";
import * as Default from "../service/DefaultService";
import { calculateMetrics } from "../Metrics/metricExport";
import { CustomError, OpenApiRequest } from "../utils/types";

// Things with an input like offset might cause trouble

export const CreateAuthToken = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
  body: any
): void => {
  Default.createAuthToken(body)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
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

    const response = await Default.packageCreate(body, xAuthorization);
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
  Default.packageIdCostGET(id, xAuthorization, dependency)
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
  const id: Default.PackageID = { id: req.params.name };
  try {
    const xAuthorization: Default.AuthenticationToken = {
      token: req.headers.authorization?.toString() ?? "",
    };
    console.log("xAuthorization token:", xAuthorization.token);

    const response = await Default.packageRate(id, xAuthorization);
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
  const id: Default.PackageID = { id: req.params.name };
  Default.packageRetrieve(xAuthorization, id)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const PackageUpdate = (
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
  const id: Default.PackageID = { id: req.params.name };
  Default.packageUpdate(body, id, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
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
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.tracksGET(xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
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
