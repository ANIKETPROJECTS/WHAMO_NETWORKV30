import { Request, Response, NextFunction } from "express";

export function requireMasterAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== "masterAdmin") {
    return res.status(403).json({ message: "Master Admin access required" });
  }
  next();
}
