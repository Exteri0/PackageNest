"use strict";

import { Request, Response, NextFunction, response } from "express";
import * as utils from "../utils/writer";
import * as Default from "../service/DefaultService";
import * as Metrics from "../Metrics/metricExport";
import { OpenApiRequest } from "../utils/types";

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

export const PackageCreate = (
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
  Default.packageCreate(body, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
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

export const PackageRate = (
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
  Default.packageRate(id, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
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

export const PackagesList = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
  body: any,
  offset: string
): void => {
  const xAuthorization: Default.AuthenticationToken = {
    token: req.headers.authorization
      ? req.headers.authorization.toString()
      : "",
  };
  Default.packagesList(body, offset, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
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

export const testMetricNameGET = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction
): void => {
  const metricName: Metrics.metricInterface = {name: req.openapi?.pathParams?.metric_name? req.openapi.pathParams.metric_name : ""}; 
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
};
