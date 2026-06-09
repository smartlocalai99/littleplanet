import jwt from "jsonwebtoken";
import { parse } from "cookie";
import { query } from "@/lib/db";

export const AUTH_COOKIE_NAME = "quantum_auth_token";

const FALLBACK_JWT_SECRET = "littleplanet-dev-jwt-secret-change-me";

function getJwtSecret() {
  return process.env.JWT_SECRET || FALLBACK_JWT_SECRET;
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export async function getUserFromRequest(req) {
  try {
    const cookies = parse(req?.headers?.cookie || "");
    const token = cookies[AUTH_COOKIE_NAME];

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);

    if (!payload?.id) {
      return null;
    }

    const result = await query(
      'SELECT id, username, role FROM public."Login_accounts" WHERE id = $1 LIMIT 1',
      [payload.id]
    );

    return result.rows[0] || null;
  } catch {
    return null;
  }
}
