import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = "spotter_secret"; // for assessment only (use env in real apps)

export type JwtUser = { id: number; role: "Annotator" | "Admin"; email: string };

export function signToken(user: JwtUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: any, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireRole(role: "Annotator" | "Admin") {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}