'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGET = exports.tracksGET = exports.RegistryReset = exports.PackagesList = exports.PackageUpdate = exports.PackageRetrieve = exports.PackageRate = exports.packageIdCostGET = exports.PackageDelete = exports.PackageCreate = exports.PackageByRegExGet = exports.PackageByNameGet = exports.CreateAuthToken = void 0;
const utils = __importStar(require("../utils/writer"));
const Default = __importStar(require("../service/DefaultService"));
const CreateAuthToken = (req, res, next, body) => {
    Default.createAuthToken(body)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.CreateAuthToken = CreateAuthToken;
const PackageByNameGet = (req, res, next) => {
    const name = { name: req.params.name };
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    Default.packageByNameGet(name, xAuthorization)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((error) => {
        utils.writeJson(res, error);
    });
};
exports.PackageByNameGet = PackageByNameGet;
const PackageByRegExGet = (req, res, next, body) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    Default.packageByRegExGet(body, xAuthorization)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.PackageByRegExGet = PackageByRegExGet;
const PackageCreate = (req, res, next, body) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    Default.packageCreate(body, xAuthorization)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.PackageCreate = PackageCreate;
const PackageDelete = (req, res, next) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    const id = { id: req.params.name };
    Default.packageDelete(xAuthorization, id)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.PackageDelete = PackageDelete;
const packageIdCostGET = (req, res, next, dependency) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    const id = { id: req.params.name };
    Default.packageIdCostGET(id, xAuthorization, dependency)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.packageIdCostGET = packageIdCostGET;
const PackageRate = (req, res, next) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    const id = { id: req.params.name };
    Default.packageRate(id, xAuthorization)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.PackageRate = PackageRate;
const PackageRetrieve = (req, res, next) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    const id = { id: req.params.name };
    Default.packageRetrieve(xAuthorization, id)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.PackageRetrieve = PackageRetrieve;
const PackageUpdate = (req, res, next, body) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    const id = { id: req.params.name };
    Default.packageUpdate(body, id, xAuthorization)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.PackageUpdate = PackageUpdate;
const PackagesList = (req, res, next, body, offset) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    Default.packagesList(body, offset, xAuthorization)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.PackagesList = PackagesList;
const RegistryReset = (req, res, next) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    Default.registryReset(xAuthorization)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.RegistryReset = RegistryReset;
const tracksGET = (req, res, next) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    Default.tracksGET(xAuthorization)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.tracksGET = tracksGET;
const testGET = (req, res, next) => {
    const xAuthorization = { token: req.headers.authorization ? req.headers.authorization.toString() : '' };
    Default.testGET(xAuthorization)
        .then((response) => {
        utils.writeJson(res, response);
    })
        .catch((response) => {
        utils.writeJson(res, response);
    });
};
exports.testGET = testGET;
//# sourceMappingURL=Default.js.map