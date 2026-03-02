import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const COOKIE_NAME = process.env.COOKIE_NAME || "wezet_token";

export type JwtPayload = {
  userId: string;
  role: string;
  orgId: string | null;
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function cookieName() {
  return COOKIE_NAME;
}