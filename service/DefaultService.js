'use strict';


/**
 * (NON-BASELINE)
 * Create an access token.
 *
 * body AuthenticationRequest 
 * returns AuthenticationToken
 **/
exports.createAuthToken = function(body) {
  return new Promise(function(resolve, reject) {
    if (body) {
      var token = "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      resolve({ token: token });
    } else {
      reject({
        message: "Missing required properties 'User' or 'Secret'",
        status: 400
      });
    }
  });
};
/*
Test body:
{
  "User": {
    "name": "ece30861defaultadminuser",
    "isAdmin": true
  },
  "Secret": {
    "password": "correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;"
  }
}
*/

/**
 * (NON-BASELINE)
 * Return the history of this package (all versions).
 *
 * name PackageName 
 * xAuthorization AuthenticationToken 
 * returns List
 **/
exports.packageByNameGet = function(name,xAuthorization) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = [ {
  "Action" : "CREATE",
  "User" : {
    "name" : "Alfalfa",
    "isAdmin" : true
  },
  "PackageMetadata" : {
    "Version" : "1.2.3",
    "ID" : "123567192081501",
    "Name" : "Name"
  },
  "Date" : "2023-03-23T23:11:15Z"
}, {
  "Action" : "CREATE",
  "User" : {
    "name" : "Alfalfa",
    "isAdmin" : true
  },
  "PackageMetadata" : {
    "Version" : "1.2.3",
    "ID" : "123567192081501",
    "Name" : "Name"
  },
  "Date" : "2023-03-23T23:11:15Z"
} ];
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Get any packages fitting the regular expression (BASELINE).
 * Search for a package using regular expression over package names and READMEs. This is similar to search by name.
 *
 * body PackageRegEx 
 * xAuthorization AuthenticationToken 
 * returns List
 **/
exports.packageByRegExGet = function(body,xAuthorization) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = [ {
  "Version" : "1.2.3",
  "ID" : "123567192081501",
  "Name" : "Name"
}, {
  "Version" : "1.2.3",
  "ID" : "123567192081501",
  "Name" : "Name"
} ];
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Upload or Ingest a new package. (BASELINE)
 * Upload or Ingest a new package. Packages that are uploaded may have the same name but a new version. Refer to the description above to see how an id is formed for a pacakge. 
 *
 * body PackageData 
 * xAuthorization AuthenticationToken 
 * returns Package
 **/
exports.packageCreate = function(body,xAuthorization) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "metadata" : {
    "Version" : "1.2.3",
    "ID" : "123567192081501",
    "Name" : "Name"
  },
  "data" : {
    "Content" : "Content",
    "debloat" : true,
    "JSProgram" : "JSProgram",
    "URL" : "URL"
  }
};
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Delete this version of the package. (NON-BASELINE)
 * Delete only the package that matches \"id\". (id is a unique identifier for a packge)
 *
 * xAuthorization AuthenticationToken 
 * id PackageID Package ID
 * no response value expected for this operation
 **/
exports.packageDelete = function(xAuthorization,id) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Get the cost of a package (BASELINE)
 *
 * id PackageID 
 * xAuthorization AuthenticationToken 
 * dependency Boolean  (optional)
 * returns PackageCost
 **/
exports.packageIdCostGET = function(id,xAuthorization,dependency) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "key" : {
    "standaloneCost" : 0.8008281904610115,
    "totalCost" : 6.027456183070403
  }
};
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Get ratings for this package. (BASELINE)
 *
 * id PackageID 
 * xAuthorization AuthenticationToken 
 * returns PackageRating
 **/
exports.packageRate = function(id,xAuthorization) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "GoodPinningPractice" : 4.145608029883936,
  "CorrectnessLatency" : 5.962133916683182,
  "PullRequestLatency" : 1.0246457001441578,
  "RampUpLatency" : 2.3021358869347655,
  "PullRequest" : 1.2315135367772556,
  "LicenseScore" : 3.616076749251911,
  "BusFactorLatency" : 6.027456183070403,
  "LicenseScoreLatency" : 2.027123023002322,
  "GoodPinningPracticeLatency" : 7.386281948385884,
  "Correctness" : 1.4658129805029452,
  "ResponsiveMaintainerLatency" : 9.301444243932576,
  "NetScoreLatency" : 6.84685269835264,
  "NetScore" : 1.4894159098541704,
  "ResponsiveMaintainer" : 7.061401241503109,
  "RampUp" : 5.637376656633329,
  "BusFactor" : 0.8008281904610115
};
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Interact with the package with this ID. (BASELINE)
 * Return this package.
 *
 * xAuthorization AuthenticationToken 
 * id PackageID ID of package to fetch
 * returns Package
 **/
exports.packageRetrieve = function(xAuthorization,id) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "metadata" : {
    "Version" : "1.2.3",
    "ID" : "123567192081501",
    "Name" : "Name"
  },
  "data" : {
    "Content" : "Content",
    "debloat" : true,
    "JSProgram" : "JSProgram",
    "URL" : "URL"
  }
};
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Update this content of the package. (BASELINE)
 * The name, version, and ID must match.  The package contents (from PackageData) will replace the previous contents.
 *
 * body Package 
 * id PackageID 
 * xAuthorization AuthenticationToken 
 * no response value expected for this operation
 **/
exports.packageUpdate = function(body,id,xAuthorization) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Get the packages from the registry. (BASELINE)
 * Get any packages fitting the query. Search for packages satisfying the indicated query.  If you want to enumerate all packages, provide an array with a single PackageQuery whose name is \"*\".  The response is paginated; the response header includes the offset to use in the next query.  In the Request Body below, \"Version\" has all the possible inputs. The \"Version\" cannot be a combinaiton fo the all the possibilities. 
 *
 * body List 
 * offset EnumerateOffset Provide this for pagination. If not provided, returns the first page of results. (optional)
 * xAuthorization AuthenticationToken 
 * returns List
 **/
exports.packagesList = function(body,offset,xAuthorization) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = [ {
  "Version" : "1.2.3",
  "ID" : "123567192081501",
  "Name" : "Name"
}, {
  "Version" : "1.2.3",
  "ID" : "123567192081501",
  "Name" : "Name"
} ];
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Reset the registry. (BASELINE)
 * Reset the registry to a system default state.
 *
 * xAuthorization AuthenticationToken 
 * no response value expected for this operation
 **/
exports.registryReset = function(xAuthorization) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Get the list of tracks a student has planned to implement in their code
 *
 * returns inline_response_200
 **/
exports.tracksGET = function() {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "plannedTracks" : [ "Performance track", "Performance track" ]
};
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}

