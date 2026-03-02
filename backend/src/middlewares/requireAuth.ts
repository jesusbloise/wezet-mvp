import { Request, Response, NextFunction } from "express";
import { cookieName, verifyToken, JwtPayload } from "../auth/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[cookieName()];
  if (!token) return res.status(401).json({ ok: false, error: "No auth cookie" });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}