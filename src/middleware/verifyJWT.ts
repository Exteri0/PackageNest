import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import { JWTUser, OpenApiRequest } from "../utils/types.js";
import {
  getTokenByUserId,
  getUserByUsername,
  updateToken,
} from "../queries/userQueries.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "defaultSecret";

export const verifyJWT = async (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
  isAdmin: boolean,
  isBackend: boolean,
  mode = 1
) => {
  try {
    const authHeader = req.headers["x-authorization"] as string; // Extract token from the X-Authorization header
    const token =
      authHeader && authHeader.startsWith("bearer ")
        ? authHeader.split(" ")[1]
        : null; // Extract token from "Bearer <token>" format

    if (!token) {
      console.log("No token provided");
      console.log("Headers:", req.headers);
      return res.status(401).json({ message: "Access denied" });
    }

    const decoded = jwt.verify(token as string, JWT_SECRET);
    if (!decoded) {
      console.log("Invalid or expired token");
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = decoded as JWTUser; // Attach user info to request
    console.log("Decoded token:", decoded);
    const user = await getUserByUsername(req.user.name);
    const foundToken = await getTokenByUserId(user.id);
    if (!foundToken) {
      console.log("Token not found, please login again");
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    if (foundToken.num_interactions >= 5) {
      console.log("Token has expired");
      return res.status(403).json({ message: "Invalid or expired token" });
    } else {
      console.log(`curr num_interactions is ${foundToken.num_interactions}`);
      if (mode) await updateToken(user.id);
    }

    if (
      (isAdmin && !req.user.isAdmin) ||
      (isBackend && !req.user.isBackend && !req.user.isAdmin)
    ) {
      console.log("Access denied");
      return res.status(403).json({ message: "Access denied" });
    }
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    console.log("Error in verifyJWT middleware:", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
