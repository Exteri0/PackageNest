import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateSize, fetchPackageDependencies } from "../service/packageUtils.js";
import { s3 } from "../service/awsConfig.js";
import { getDbPool } from "../service/databaseConnection.js";
import { fetchUrl, urlMain } from "../Metrics/urlHandler.js";

// Mock dependencies
vi.mock("../service/awsConfig", () => ({
  s3: {
    headObject: vi.fn(() => ({
      promise: vi.fn(),
    })),
  },
}));

vi.mock("../service/databaseConnection", () => ({
  getDbPool: vi.fn(() => ({
    query: vi.fn(),
  })),
}));

vi.mock("../Metrics/urlHandler", () => ({
  fetchUrl: vi.fn(),
  urlMain: vi.fn(),
}));

const mockHeadObject = s3.headObject as ReturnType<typeof vi.fn>;
const mockGetDbPool = getDbPool as ReturnType<typeof vi.fn>;
const mockFetchUrl = fetchUrl as ReturnType<typeof vi.fn>;
const mockUrlMain = urlMain as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.S3_BUCKET_NAME = "mock-bucket";
  process.env.GITHUB_ACCESS_TOKEN = "mock-token";
});

describe("fetchPackageDependencies", () => {
  it("should fetch dependencies from the GitHub API", async () => {
    const mockPackageJson = {
      dependencies: {
        dep1: "^1.0.0",
        dep2: "~2.0.0",
      },
    };

    mockUrlMain.mockResolvedValue({ repoOwner: "test-owner", repoName: "test-repo" });
    mockFetchUrl.mockResolvedValue(mockPackageJson);

    const dependencies = await fetchPackageDependencies("test-package", "1.0.0");
    expect(dependencies).toEqual(["dep1", "dep2"]);
  });

  it("should throw an error if dependencies cannot be fetched", async () => {
    mockUrlMain.mockRejectedValue(new Error("API failure"));

    await expect(fetchPackageDependencies("test-package", "1.0.0")).rejects.toThrow(
      "Failed to fetch dependencies for test-package@1.0.0"
    );
  });
});

describe("calculateSize", () => {
  it("should calculate the size of a package including dependencies", async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
    mockGetDbPool.mockReturnValue({ query: mockQuery });

    mockHeadObject
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ ContentLength: 500 }),
      })
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ ContentLength: 300 }),
      });

    mockUrlMain.mockResolvedValue({ repoOwner: "test-owner", repoName: "test-repo" });
    mockFetchUrl.mockResolvedValue({
      dependencies: {
        dep1: "^1.0.0",
      },
    });

    const size = await calculateSize("test-package@1.0.0");
    expect(size).toBe(800);
  });

  it("should fetch cached size from the database", async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [{ size_cost: 1000 }] });
    mockGetDbPool.mockReturnValue({ query: mockQuery });

    const size = await calculateSize("test-package@1.0.0");
    expect(size).toBe(1000);
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT size_cost FROM packages WHERE package_id = $1",
      ["test-package@1.0.0"]
    );
  });

  it("should throw an error if the S3 bucket name is missing", async () => {
    delete process.env.S3_BUCKET_NAME;

    await expect(calculateSize("test-package@1.0.0")).rejects.toThrow(
      "S3_BUCKET_NAME is not defined in the environment variables."
    );
  });

  it("should handle database query failures gracefully", async () => {
    const mockQuery = vi.fn().mockRejectedValue(new Error("Database error"));
    mockGetDbPool.mockReturnValue({ query: mockQuery });

    await expect(calculateSize("test-package@1.0.0")).rejects.toThrow("Database error");
  });

});
