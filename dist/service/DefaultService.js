'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthToken = createAuthToken;
exports.packageByNameGet = packageByNameGet;
exports.packageByRegExGet = packageByRegExGet;
exports.packageCreate = packageCreate;
exports.packageDelete = packageDelete;
exports.packageIdCostGET = packageIdCostGET;
exports.packageRate = packageRate;
exports.packageRetrieve = packageRetrieve;
exports.packageUpdate = packageUpdate;
exports.packagesList = packagesList;
exports.registryReset = registryReset;
exports.tracksGET = tracksGET;
exports.testGET = testGET;
/**
 * (NON-BASELINE)
 * Create an access token.
 *
 * @param body AuthenticationRequest
 * @returns Promise<AuthenticationToken>
 */
function createAuthToken(body) {
    return new Promise(function (resolve, reject) {
        if (body) {
            const token = "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
            resolve({ token });
        }
        else {
            reject({
                message: "Missing required properties 'User' or 'Secret'",
                status: 400
            });
        }
    });
}
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
 * @param name PackageName
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
function packageByNameGet(name, xAuthorization) {
    return new Promise(function (resolve) {
        const examples = {
            'application/json': [
                {
                    "Action": "CREATE",
                    "User": {
                        "name": "Alfalfa",
                        "isAdmin": true
                    },
                    "PackageMetadata": {
                        "Version": "1.2.3",
                        "ID": "123567192081501",
                        "Name": "Name"
                    },
                    "Date": "2023-03-23T23:11:15Z"
                },
                {
                    "Action": "CREATE",
                    "User": {
                        "name": "Alfalfa",
                        "isAdmin": true
                    },
                    "PackageMetadata": {
                        "Version": "1.2.3",
                        "ID": "123567192081501",
                        "Name": "Name"
                    },
                    "Date": "2023-03-23T23:11:15Z"
                }
            ]
        };
        resolve(examples['application/json']);
    });
}
/**
 * (BASELINE)
 * Search for a package using a regular expression over package names and READMEs.
 *
 * @param body PackageQuery
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
function packageByRegExGet(body, xAuthorization) {
    return new Promise(function (resolve) {
        const examples = {
            'application/json': [
                {
                    "Version": "1.2.3",
                    "ID": "123567192081501",
                    "Name": "Name"
                },
                {
                    "Version": "1.2.3",
                    "ID": "123567192081501",
                    "Name": "Name"
                }
            ]
        };
        resolve(examples['application/json']);
    });
}
/**
 * (BASELINE)
 * Upload or Ingest a new package.
 *
 * @param body Package
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Package>
 */
function packageCreate(body, xAuthorization) {
    return new Promise(function (resolve) {
        const examples = {
            'application/json': {
                "metadata": {
                    "Version": "1.2.3",
                    "ID": "123567192081501",
                    "Name": "Name"
                },
                "data": {
                    "Content": "Content",
                    "debloat": true,
                    "JSProgram": "JSProgram",
                    "URL": "URL"
                }
            }
        };
        resolve(examples['application/json']);
    });
}
/**
 * (NON-BASELINE)
 * Delete a package that matches the ID.
 *
 * @param xAuthorization AuthenticationToken
 * @param id PackageID
 * @returns Promise<void>
 */
function packageDelete(xAuthorization, id) {
    return new Promise(function (resolve) {
        resolve();
    });
}
/**
 * (BASELINE)
 * Get the cost of a package.
 *
 * @param id PackageID
 * @param xAuthorization AuthenticationToken
 * @param dependency boolean (optional)
 * @returns Promise<PackageCost>
 */
function packageIdCostGET(id, xAuthorization, dependency) {
    return new Promise(function (resolve) {
        const examples = {
            'application/json': {
                "standaloneCost": 0.8008281904610115,
                "totalCost": 6.027456183070403
            }
        };
        resolve(examples['application/json']);
    });
}
/**
 * (BASELINE)
 * Get ratings for this package.
 *
 * @param id PackageID
 * @param xAuthorization AuthenticationToken
 * @returns Promise<PackageRating>
 */
function packageRate(id, xAuthorization) {
    return new Promise(function (resolve) {
        const examples = {
            'application/json': {
                "GoodPinningPractice": 4.145608029883936,
                "CorrectnessLatency": 5.962133916683182,
                "PullRequestLatency": 1.0246457001441578,
                "RampUpLatency": 2.3021358869347655,
                "PullRequest": 1.2315135367772556,
                "LicenseScore": 3.616076749251911,
                "BusFactorLatency": 6.027456183070403,
                "LicenseScoreLatency": 2.027123023002322,
                "GoodPinningPracticeLatency": 7.386281948385884,
                "Correctness": 1.4658129805029452,
                "ResponsiveMaintainerLatency": 9.301444243932576,
                "NetScoreLatency": 6.84685269835264,
                "NetScore": 1.4894159098541704,
                "ResponsiveMaintainer": 7.061401241503109,
                "RampUp": 5.637376656633329,
                "BusFactor": 0.8008281904610115
            }
        };
        resolve(examples['application/json']);
    });
}
/**
 * (BASELINE)
 * Return this package.
 *
 * @param xAuthorization AuthenticationToken
 * @param id PackageID
 * @returns Promise<Package>
 */
function packageRetrieve(xAuthorization, id) {
    return new Promise(function (resolve) {
        const examples = {
            'application/json': {
                "metadata": {
                    "Version": "1.2.3",
                    "ID": "123567192081501",
                    "Name": "Name"
                },
                "data": {
                    "Content": "Content",
                    "debloat": true,
                    "JSProgram": "JSProgram",
                    "URL": "URL"
                }
            }
        };
        resolve(examples['application/json']);
    });
}
/**
 * (BASELINE)
 * Update the content of the package.
 *
 * @param body Package
 * @param id PackageID
 * @param xAuthorization AuthenticationToken
 * @returns Promise<void>
 */
function packageUpdate(body, id, xAuthorization) {
    return new Promise(function (resolve) {
        resolve();
    });
}
/**
 * (BASELINE)
 * Get the packages from the registry.
 *
 * @param body Array<PackageQuery>
 * @param offset string (optional)
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<PackageQuery>>
 */
function packagesList(body, offset, xAuthorization) {
    return new Promise(function (resolve) {
        const examples = {
            'application/json': [
                {
                    "Version": "1.2.3",
                    "ID": "123567192081501",
                    "Name": "Name"
                },
                {
                    "Version": "1.2.3",
                    "ID": "123567192081501",
                    "Name": "Name"
                }
            ]
        };
        resolve(examples['application/json']);
    });
}
/*
Test input:
[
  {
    "Name": "Underscore",
    "Version": "1.2.3"
  },
  {
    "Name": "Lodash",
    "Version": "1.2.3-2.1.0"
  },
  {
    "Name": "React",
    "Version": "^1.2.3"
  }
]
*/
/**
 * (NON-BASELINE)
 * Resets the registry.
 *
 * @param xAuthorization AuthenticationToken
 * @returns Promise<void>
 */
function registryReset(xAuthorization) {
    return new Promise((resolve) => {
        resolve();
    });
}
/**
 * (NON-BASELINE)
 * Returns an array of track objects.
 *
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
function tracksGET(xAuthorization) {
    return new Promise((resolve) => {
        const examples = {
            'application/json': [
                {
                    "Version": "1.2.3",
                    "ID": "123567192081501",
                    "Name": "Name"
                },
                {
                    "Version": "1.2.3",
                    "ID": "123567192081501",
                    "Name": "Name"
                }
            ]
        };
        resolve(examples['application/json']);
    });
}
/**
 * (NON-BASELINE)
 * Testing
 *
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
function testGET(xAuthorization) {
    return new Promise((resolve) => {
        const examples = {
            'application/json': [
                {
                    "Version": "1.2.3",
                    "ID": "testing",
                    "Name": "Name"
                },
                {
                    "Version": "1.2.3",
                    "ID": "aaaaaaaa",
                    "Name": "Name"
                }
            ]
        };
        resolve(examples['application/json']);
    });
}
//# sourceMappingURL=DefaultService.js.map