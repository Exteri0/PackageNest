// custom_s3_fs.ts

import {
  S3Client,
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  CommonPrefix,
  _Object,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage"; // Import Upload from lib-storage
import { Readable } from "stream";
import "dotenv/config";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const bucketName = process.env.S3_BUCKET_NAME;

function s3Path(key: string): string {
  // Normalize the key to avoid issues with leading slashes
  return key.replace(/^\/+/, "");
}

class S3FS {
  async readFile(
    filepath: string,
    options?: { encoding?: BufferEncoding }
  ): Promise<Buffer | string> {
    const key = s3Path(filepath);
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const response = (await s3.send(command)) as GetObjectCommandOutput;

      // Handle encoding options
      const encoding = options?.encoding;
      const chunks: Uint8Array[] = [];

      const data = await new Promise<Buffer>((resolve, reject) => {
        const stream = response.Body as Readable;
        stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      });

      return encoding ? data.toString(encoding) : data;
    } catch (error: any) {
      if (
        error.name === "NoSuchKey" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        const err = new Error(
          `ENOENT: no such file or directory, open '${filepath}'`
        );
        (err as any).code = "ENOENT";
        throw err;
      }
      throw error;
    }
  }

  async writeFile(
    filepath: string,
    data: Buffer | string | Readable,
    options?: any
  ): Promise<void> {
    const key = s3Path(filepath);
    try {
      if (data instanceof Readable) {
        // Use Upload class for streams
        const upload = new Upload({
          client: s3,
          params: {
            Bucket: bucketName,
            Key: key,
            Body: data,
          },
        });
        await upload.done();
      } else {
        const contentLength =
          typeof data === "string" ? Buffer.byteLength(data) : data.length;

        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: data,
          ContentLength: contentLength,
        });
        await s3.send(command);
      }
    } catch (error) {
      console.error(`Error writing file ${filepath}:`, error);
      throw error;
    }
  }

  async unlink(filepath: string): Promise<void> {
    const key = s3Path(filepath);
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      await s3.send(command);
    } catch (error: any) {
      if (
        error.name === "NoSuchKey" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        // File doesn't exist; mimic fs behavior
        const err = new Error(
          `ENOENT: no such file or directory, unlink '${filepath}'`
        );
        (err as any).code = "ENOENT";
        throw err;
      } else {
        console.error(`Error deleting file ${filepath}:`, error);
        throw error;
      }
    }
  }

  async readdir(dirpath: string): Promise<string[]> {
    const prefix = s3Path(dirpath).replace(/\/?$/, "/");
    let continuationToken: string | undefined = undefined;
    const allEntries: Set<string> = new Set();

    try {
      do {
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          Delimiter: "/",
          ContinuationToken: continuationToken,
        });
        const response = (await s3.send(command)) as ListObjectsV2CommandOutput;

        response.CommonPrefixes?.forEach((item: CommonPrefix) => {
          const dirName = item.Prefix?.substring(prefix.length).replace(
            /\/$/,
            ""
          );
          if (dirName) allEntries.add(dirName);
        });

        response.Contents?.forEach((item: _Object) => {
          const fileName = item.Key?.substring(prefix.length);
          if (fileName) allEntries.add(fileName);
        });

        continuationToken = response.IsTruncated
          ? response.NextContinuationToken
          : undefined;
      } while (continuationToken);

      return Array.from(allEntries);
    } catch (error) {
      console.error(`Error reading directory ${dirpath}:`, error);
      throw error;
    }
  }

  async mkdir(dirpath: string): Promise<void> {
    // S3 doesn't require directories to be explicitly created
    const key = s3Path(dirpath).replace(/\/?$/, "/");
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: "",
      });
      await s3.send(command);
    } catch (error) {
      console.error(`Error creating directory ${dirpath}:`, error);
      throw error;
    }
  }

  async rmdir(dirpath: string): Promise<void> {
    const prefix = s3Path(dirpath).replace(/\/?$/, "/");
    let continuationToken: string | undefined = undefined;

    try {
      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });
        const listResponse = (await s3.send(
          listCommand
        )) as ListObjectsV2CommandOutput;

        const objects =
          listResponse.Contents?.map((item: _Object) => ({
            Key: item.Key!,
          })) || [];

        if (objects.length > 0) {
          // S3 allows up to 1000 objects in a DeleteObjectsCommand
          // We batch delete operations to handle more than 1000 objects
          const deletePromises = [];
          for (let i = 0; i < objects.length; i += 1000) {
            const chunk = objects.slice(i, i + 1000);
            const deleteCommand = new DeleteObjectsCommand({
              Bucket: bucketName,
              Delete: {
                Objects: chunk,
                Quiet: true,
              },
            });
            deletePromises.push(s3.send(deleteCommand));
          }
          await Promise.all(deletePromises);
        }

        continuationToken = listResponse.IsTruncated
          ? listResponse.NextContinuationToken
          : undefined;
      } while (continuationToken);
    } catch (error) {
      console.error(`Error removing directory ${dirpath}:`, error);
      throw error;
    }
  }

  async stat(filepath: string): Promise<{
    isFile: () => boolean;
    isDirectory: () => boolean;
    mtimeMs: number;
    ctimeMs: number;
    size: number;
  }> {
    const key = s3Path(filepath);
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const response = (await s3.send(command)) as HeadObjectCommandOutput;
      const lastModified = response.LastModified
        ? response.LastModified.getTime()
        : Date.now();
      const contentLength = response.ContentLength || 0;
      return {
        isFile: () => !key.endsWith("/"),
        isDirectory: () => key.endsWith("/"),
        mtimeMs: lastModified,
        ctimeMs: lastModified,
        size: contentLength,
      };
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        // Check if it's a directory by attempting to list objects with the prefix
        const dirKey = key.endsWith("/") ? key : key + "/";
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: dirKey,
          MaxKeys: 1,
        });
        const listResponse = (await s3.send(
          listCommand
        )) as ListObjectsV2CommandOutput;
        if (listResponse.KeyCount && listResponse.KeyCount > 0) {
          // It's a directory
          return {
            isFile: () => false,
            isDirectory: () => true,
            mtimeMs: Date.now(),
            ctimeMs: Date.now(),
            size: 0,
          };
        } else {
          const err = new Error(
            `ENOENT: no such file or directory, stat '${filepath}'`
          );
          (err as any).code = "ENOENT";
          throw err;
        }
      } else {
        console.error(`Error stating file ${filepath}:`, error);
        throw error;
      }
    }
  }

  async lstat(filepath: string) {
    // For compatibility with isomorphic-git
    return this.stat(filepath);
  }

  async readlink(filepath: string) {
    // S3 doesn't support symlinks; throw an error
    const err = new Error(`EINVAL: invalid argument, readlink '${filepath}'`);
    (err as any).code = "EINVAL";
    throw err;
  }

  async symlink(target: string, path: string) {
    // S3 doesn't support symlinks; throw an error
    const err = new Error(`EPERM: operation not permitted, symlink '${path}'`);
    (err as any).code = "EPERM";
    throw err;
  }
}

export const s3fs = new S3FS();
