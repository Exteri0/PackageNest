'use strict';

import { Request, Response, NextFunction } from 'express';
import * as utils from '../utils/writer';
import * as Default from '../service/DefaultService';

export const CreateAuthToken = (req: Request, res: Response, next: NextFunction, body: any): void => {
  Default.createAuthToken(body)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const PackageByNameGet = (req: Request, res: Response, next: NextFunction): void => {
  const name: Default.PackageName = { name: req.params.name }; 
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  Default.packageByNameGet(name, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((error: any) => {
      utils.writeJson(res, error);
    });
};

export const PackageByRegExGet = (req: Request, res: Response, next: NextFunction, body:any): void => {
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  Default.packageByRegExGet(body, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const PackageCreate = (req: Request, res: Response, next: NextFunction, body: any): void => {
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  Default.packageCreate(body, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const PackageDelete = (req: Request, res: Response, next: NextFunction): void => {
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  const id: Default.PackageID = { id: req.params.name }; 
  Default.packageDelete(xAuthorization, id)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const packageIdCostGET = (req: Request, res: Response, next: NextFunction,dependency:boolean): void => {
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  const id: Default.PackageID = { id: req.params.name }; 
  Default.packageIdCostGET(id, xAuthorization, dependency)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const PackageRate = (req: Request, res: Response, next: NextFunction): void => {
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  const id: Default.PackageID = { id: req.params.name }; 
  Default.packageRate(id, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const PackageRetrieve = (req: Request, res: Response, next: NextFunction): void => {
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  const id: Default.PackageID = { id: req.params.name };
  Default.packageRetrieve(xAuthorization, id)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const PackageUpdate = (req: Request, res: Response, next: NextFunction, body: any): void => {
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  const id: Default.PackageID = { id: req.params.name };
  Default.packageUpdate(body, id, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const PackagesList = (req: Request, res: Response, next: NextFunction, body: any, offset: string): void => {
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  Default.packagesList(body, offset, xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const RegistryReset = (req: Request, res: Response, next: NextFunction): void => {
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  Default.registryReset(xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};

export const tracksGET = (req: Request, res: Response, next: NextFunction): void => {
  const xAuthorization: Default.AuthenticationToken = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
  Default.tracksGET(xAuthorization)
    .then((response: any) => {
      utils.writeJson(res, response);
    })
    .catch((response: any) => {
      utils.writeJson(res, response);
    });
};
