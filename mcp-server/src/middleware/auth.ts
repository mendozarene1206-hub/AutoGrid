import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "autogrid-development-secret-change-in-production";

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches user to request
 */
export function authenticateToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({ error: "Access token required" });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            email: string;
            role: string;
        };
        req.user = decoded;
        next();
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            res.status(401).json({ error: "Token expired" });
            return;
        }
        res.status(403).json({ error: "Invalid token" });
    }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...allowedRoles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: "Insufficient permissions" });
            return;
        }

        next();
    };
}

/**
 * Generate JWT token for a user
 */
export function generateToken(user: { userId: string; email: string; role: string }): string {
    return jwt.sign(
        {
            userId: user.userId,
            email: user.email,
            role: user.role,
        },
        JWT_SECRET,
        {
            expiresIn: "1h",
            issuer: "autogrid-mcp",
            audience: "autogrid-clients",
        }
    );
}

/**
 * Generate refresh token (longer-lived)
 */
export function generateRefreshToken(userId: string): string {
    const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + "-refresh";
    return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
    const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + "-refresh";
    try {
        return jwt.verify(token, REFRESH_SECRET) as { userId: string };
    } catch {
        return null;
    }
}
