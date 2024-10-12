'use strict';

var utils = require('../utils/writer.js');
var Default = require('../service/DefaultService');

module.exports.CreateAuthToken = function createAuthToken (req, res, next, body) {
  Default.createAuthToken(body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.PackageByNameGet = function packageByNameGet (req, res, next, name, xAuthorization) {
  Default.packageByNameGet(name, xAuthorization)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.PackageByRegExGet = function packageByRegExGet (req, res, next, body, xAuthorization) {
  Default.packageByRegExGet(body, xAuthorization)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.PackageCreate = function packageCreate (req, res, next, body, xAuthorization) {
  Default.packageCreate(body, xAuthorization)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.PackageDelete = function packageDelete (req, res, next, xAuthorization, id) {
  Default.packageDelete(xAuthorization, id)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.packageIdCostGET = function packageIdCostGET (req, res, next, id, xAuthorization, dependency) {
  Default.packageIdCostGET(id, xAuthorization, dependency)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.PackageRate = function packageRate (req, res, next, id, xAuthorization) {
  Default.packageRate(id, xAuthorization)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.PackageRetrieve = function packageRetrieve (req, res, next, xAuthorization, id) {
  Default.packageRetrieve(xAuthorization, id)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.PackageUpdate = function packageUpdate (req, res, next, body, id, xAuthorization) {
  Default.packageUpdate(body, id, xAuthorization)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.PackagesList = function packagesList (req, res, next, body, offset, xAuthorization) {
  Default.packagesList(body, offset, xAuthorization)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.RegistryReset = function registryReset (req, res, next, xAuthorization) {
  Default.registryReset(xAuthorization)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.tracksGET = function tracksGET (req, res, next) {
  Default.tracksGET()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};
