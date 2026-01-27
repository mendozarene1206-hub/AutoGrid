import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

/**
 * Security headers middleware (Helmet)
 * Protects against common web vulnerabilities
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    frameguard: { action: "deny" },
    noSniff: true,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
});

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        error: "Too many requests, please try again later",
        retryAfter: 900,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        // Use X-Forwarded-For if behind proxy, otherwise req.ip
        return (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || "unknown";
    },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: "Too many login attempts, please try again later",
        retryAfter: 900,
    },
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Expensive operation rate limiter (LLM calls)
 * 20 requests per hour
 */
export const llmLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: {
        error: "Rate limit exceeded for AI operations. Please wait before trying again.",
        retryAfter: 3600,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        // Rate limit per user if authenticated, otherwise per IP
        const authReq = req as any;
        return authReq.user?.userId || req.ip || "unknown";
    },
});

/**
 * Error sanitizer - prevents leaking internal details
 */
export function sanitizeErrors(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    console.error("[Error]", err);

    const isProduction = process.env.NODE_ENV === "production";

    res.status(500).json({
        error: isProduction ? "An internal error occurred" : err.message,
        ...(isProduction ? {} : { stack: err.stack }),
    });
}

/**
 * CORS configuration for AutoGrid
 */
export const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
