import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/constants.js';
import type { JWTPayload } from '../types/index.js';

/**
 * Generate a JWT token
 * @param payload - Data to encode in the token
 * @returns JWT token string
 */
export function generateToken(payload: JWTPayload): string {
  // @ts-ignore - JWT_CONFIG.EXPIRES_IN is a valid string format for expiresIn
  return jwt.sign(payload, JWT_CONFIG.SECRET, {
    expiresIn: JWT_CONFIG.EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_CONFIG.SECRET) as JWTPayload;
}
