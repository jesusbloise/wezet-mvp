import { Request, Response, NextFunction } from "express";

export function requireProducer(req: Request, res: Response, next: NextFunction) {
  const role = req.user?.role || "";
  const orgId = req.user?.orgId || null;

  if (!orgId) return res.status(403).json({ ok: false, error: "No orgId" });

  const isProducer =
    role === "producer_owner" ||
    role === "producer_admin" ||
    role === "producer_member" ||
    role === "producer_viewer";

  if (!isProducer) return res.status(403).json({ ok: false, error: "Producer role required" });

  next();
}