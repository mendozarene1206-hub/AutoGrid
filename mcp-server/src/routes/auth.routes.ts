import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";
import {
    generateToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "../middleware/auth.js";
import { authLimiter } from "../middleware/security.js";
import { validateRequest, loginRequestSchema } from "../middleware/validation.js";

const router = Router();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
);

/**
 * POST /auth/login
 * Authenticate user and return JWT tokens
 */
router.post(
    "/login",
    authLimiter,
    validateRequest(loginRequestSchema),
    async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            // Fetch user from database
            const { data: user, error } = await supabase
                .from("users")
                .select("id, email, password_hash, role")
                .eq("email", email)
                .single();

            if (error || !user) {
                // Don't reveal if user exists
                res.status(401).json({ error: "Invalid credentials" });
                return;
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                res.status(401).json({ error: "Invalid credentials" });
                return;
            }

            // Generate tokens
            const token = generateToken({
                userId: user.id,
                email: user.email,
                role: user.role || "user",
            });
            const refreshToken = generateRefreshToken(user.id);

            // Store refresh token in database (for revocation capability)
            await supabase.from("refresh_tokens").insert({
                token: refreshToken,
                user_id: user.id,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });

            res.json({
                token,
                refreshToken,
                expiresIn: 3600,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (error: any) {
            console.error("[Auth] Login error:", error);
            res.status(500).json({ error: "An error occurred during login" });
        }
    }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(401).json({ error: "Refresh token required" });
            return;
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
            res.status(403).json({ error: "Invalid refresh token" });
            return;
        }

        // Check if refresh token exists and is not expired
        const { data: storedToken, error } = await supabase
            .from("refresh_tokens")
            .select("*")
            .eq("token", refreshToken)
            .eq("user_id", decoded.userId)
            .gt("expires_at", new Date().toISOString())
            .single();

        if (error || !storedToken) {
            res.status(403).json({ error: "Invalid or expired refresh token" });
            return;
        }

        // Fetch user details
        const { data: user } = await supabase
            .from("users")
            .select("id, email, role")
            .eq("id", decoded.userId)
            .single();

        if (!user) {
            res.status(403).json({ error: "User not found" });
            return;
        }

        // Generate new access token
        const newToken = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role || "user",
        });

        res.json({
            token: newToken,
            expiresIn: 3600,
        });
    } catch (error: any) {
        console.error("[Auth] Refresh error:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});

/**
 * POST /auth/logout
 * Invalidate refresh token
 */
router.post("/logout", async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Delete refresh token from database
            await supabase.from("refresh_tokens").delete().eq("token", refreshToken);
        }

        res.json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ error: "Logout failed" });
    }
});

export default router;
