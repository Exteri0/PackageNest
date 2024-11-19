import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import { JWTUser, OpenApiRequest } from "../utils/types.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "defaultSecret";

export const verifyJWT = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
  isAdmin: boolean,
  isBackend: boolean
) => {
  try {
    console.log(req.cookies);
    const token = req.cookies.authToken; // Access token from cookie

    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded)
      return res.status(403).json({ message: "Invalid or expired token" });
    req.user = decoded as JWTUser; // Attach user info to request
    console.log("Decoded token:", decoded);
    if (
      (isAdmin && !req.user.isAdmin) ||
      (isBackend && !req.user.isBackend && !req.user.isAdmin)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
