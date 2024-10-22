import { Express, Request, Response } from "express";
import awsSdk from "aws-sdk";
import "dotenv/config";
import { PutObjectRequest } from "aws-sdk/clients/s3";

const bucketName = process.env.S3_BUCKET_NAME;
const s3 = new awsSdk.S3();

export default (app: Express) => {
  // POST /Packages
  app.post("/packages", (req: Request, res: Response) => {
    res.send(
      "This is a POST request to /packages - Get packages from the registry."
    );
  });

  // DELETE /reset
  app.delete("/reset", (req: Request, res: Response) => {
    res.send("This is a DELETE request to /reset - Reset the registry.");
  });

  // GET /package/{id}
  app.get("/package/:id", (req: Request, res: Response) => {
    res.send(
      `This is a GETrassadsad request to /package/${req.params.id} - Interact with the package with ID: ${req.params.id}`
    );
  });

  // PUT /package/{id}
  app.put("/package/:id", (req: Request, res: Response) => {
    const fileToUpload = {
      userId: "123456",
      email: "enrico@gmail.com",
      city: "London",
      country: "UK",
    };
    try {
      const params = {
        Bucket: bucketName,
        Key: `storage/${req.params.id}`,
        Body: JSON.stringify(fileToUpload),
      };
      console.log(
        `Uploading file to S3 with the name ${bucketName}/${params.Key}`
      );
      s3.upload(params as PutObjectRequest, (err, data) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error uploading data: " + err);
        } else {
          console.log("Upload success", data.Location);
          res.send("Upload success: " + data.Location);
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error uploading data: " + err);
    }
  });

  // DELETE /package/{id}
  app.delete("/package/:id", (req: Request, res: Response) => {
    res.send(
      `This is a DELETE request to /package/${req.params.id} - Delete the version of package with ID: ${req.params.id}`
    );
  });

  // POST /package
  app.post("/package", (req: Request, res: Response) => {
    res.send(
      "This is a POST request to /package - Upload or Ingest a new package."
    );
  });

  // GET /package/{id}/rate
  app.get("/package/:id/rate", (req: Request, res: Response) => {
    res.send(
      `This is a GET request to /package/${req.params.id}/rate - Get ratings for the package with ID: ${req.params.id}`
    );
  });

  // GET /package/{id}/cost
  app.get("/package/:id/cost", (req: Request, res: Response) => {
    res.send(
      `This is a GET request to /package/${req.params.id}/cost - Get the cost of the package with ID: ${req.params.id}`
    );
  });

  // PUT /authenticate
  app.put("/authenticate", (req: Request, res: Response) => {
    res.send("This is a PUT request to /authenticate - Authenticate a user.");
  });

  // GET /package/byName/{name}
  app.get("/package/byName/:name", (req: Request, res: Response) => {
    res.send(
      `This is a GET request to /package/byName/${req.params.name} - Get the package by name: ${req.params.name}`
    );
  });

  // POST /package/byRegEx
  app.post("/package/byRegEx", (req: Request, res: Response) => {
    res.send(
      "This is a POST request to /package/byRegEx - Get packages fitting the regular expression."
    );
  });

  // GET /tracks
  app.get("/tracks", (req: Request, res: Response) => {
    res.send(
      "This is a GET request to /tracks - Get the list of tracks a student has planned."
    );
  });

  // GET /test
  app.get("/test", (req: Request, res: Response) => {
    res.send("This is a GET request to /test - Test the system.");
  });
};
