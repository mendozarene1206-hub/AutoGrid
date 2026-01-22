#!/usr/bin/env node
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";
import stringify from "json-stable-stringify";
import { z } from "zod";
import { evaluate } from 'mathjs';
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import pLimit from "p-limit";
import workflowRoutes from "./routes/workflow.routes.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
console.log("Supabase URL:", process.env.SUPABASE_URL);
console.log("API Key Start:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.substring(0, 8));
// CONFIGURACIÓN EXPRESS (HTTP)
const app = express();
app.use(cors());
app.use(express.json()); // Essential for parsing POST bodies
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase configuration in .env");
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const server = new Server({
    name: "autogrid-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
        prompts: {},
    },
});
// 1. CONCURRENCY CONTROL (Limit Gemini API calls)
const limit = pLimit(1); // Reducido a 1 para mayor estabilidad con Gemini Free/Preview
// 2. RETRY LOGIC (Exponential Backoff)
async function withRetry(fn, retries = 3, delay = 5000) {
    try {
        return await fn();
    }
    catch (error) {
        console.error(`[withRetry] Error detectado. Mensaje: ${error.message}`);
        const isRateLimit = error.status === 429 ||
            error.statusCode === 429 ||
            error.response?.status === 429 ||
            error.message?.includes("RESOURCE_EXHAUSTED") ||
            error.message?.includes("429") ||
            error.name === "AI_RetryError";
        if (retries > 0 && isRateLimit) {
            console.warn(`[Retry Logic] Reintentando en ${delay}ms... (${retries} reintentos restantes).`);
            await new Promise(res => setTimeout(res, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}
// Helper to calculate hash (DETERMINISTA)
function calculateHash(data) {
    // json-stable-stringify asegura que {a:1, b:2} sea siempre igual al stringificar
    return crypto.createHash("sha256").update(stringify(data) || "").digest("hex");
}
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
        prompts: [
            {
                name: "autogrid_core",
                description: "Load the specialized AutoGrid Core persona (Cost Engineer & Auditor).",
            }
        ]
    };
});
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    if (name === "autogrid_core") {
        const promptPath = path.join(__dirname, "system_prompt.md");
        let promptContent = "";
        try {
            promptContent = fs.readFileSync(promptPath, "utf-8");
        }
        catch (err) {
            console.error("Error reading system prompt:", err);
            promptContent = "Error: Could not load system prompt file.";
        }
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: "Please adopt the following persona and rules for this session:\n\n" + promptContent
                    }
                }
            ]
        };
    }
    throw new Error("Prompt not found");
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "query_catalog",
                description: "Search the official catalog for unit prices and contract volumes using a concept code (e.g., '5.2.4.1').",
                inputSchema: {
                    type: "object",
                    properties: {
                        code: { type: "string" },
                    },
                    required: ["code"],
                },
            },
            {
                name: "batch_query_catalog",
                description: "Search multiple concept codes in the catalog at once.",
                inputSchema: {
                    type: "object",
                    properties: {
                        codes: {
                            type: "array",
                            items: { type: "string" }
                        },
                    },
                    required: ["codes"],
                },
            },
            {
                name: "safe_update_cells",
                description: "Update spreadsheet cells with strict safety checks. Now includes support for styles and validation feedback.",
                inputSchema: {
                    type: "object",
                    properties: {
                        spreadsheet_id: { type: "string" },
                        sheet_name: { type: "string" },
                        override_formula_shield: { type: "boolean" },
                        changes: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    row: { type: "number" },
                                    col: { type: "number" },
                                    value: { type: "string" },
                                    style: { type: "object" }, // Support for "pixel-perfect" cloning
                                    comment: { type: "string" }
                                },
                                required: ["row", "col", "value"],
                            },
                        },
                    },
                    required: ["spreadsheet_id", "sheet_name", "changes"],
                },
            },
            {
                name: "audit_integrity",
                description: "Verify the integrity of the spreadsheet data against the signature log",
                inputSchema: {
                    type: "object",
                    properties: { spreadsheet_id: { type: "string" } },
                    required: ["spreadsheet_id"],
                },
            },
            {
                name: "manage_workflow",
                description: "Transition the status of a spreadsheet",
                inputSchema: {
                    type: "object",
                    properties: {
                        spreadsheet_id: { type: "string" },
                        action: { type: "string", enum: ["request_review", "approve", "reject"] },
                    },
                    required: ["spreadsheet_id", "action"],
                },
            },
            {
                name: "math_evaluate",
                description: "Safely evaluate a mathematical expression to verify spreadsheet calculations. Use this for ALL arithmetic operations instead of calculating mentally.",
                inputSchema: {
                    type: "object",
                    properties: {
                        expression: {
                            type: "string",
                            description: "Math expression. Examples: '24.5 * 10 * 1.16', '100 - 5%', 'sum([1,2,3,4])'"
                        },
                        context: {
                            type: "string",
                            description: "Brief context for logging (e.g., 'Verifying row 15 total')"
                        }
                    },
                    required: ["expression"],
                },
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === "query_catalog") {
        const { code } = args;
        const { data, error } = await supabase
            .from("catalog_concepts")
            .select("*")
            .eq("code", code)
            .single();
        if (error)
            return { content: [{ type: "text", text: `Concept ${code} not found in catalog.` }] };
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
    if (name === "batch_query_catalog") {
        const { codes } = args;
        const { data, error } = await supabase
            .from("catalog_concepts")
            .select("*")
            .in("code", codes);
        if (error)
            throw new Error(`Batch catalog query failed: ${error.message}`);
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
    if (name === "safe_update_cells") {
        const { spreadsheet_id, sheet_name, changes, override_formula_shield } = args;
        // 1. Fetch current data
        const { data: spreadsheet, error } = await supabase
            .from("spreadsheets")
            .select("raw_data, status")
            .eq("id", spreadsheet_id)
            .single();
        if (error || !spreadsheet)
            throw new Error(`Spreadsheet not found: ${error?.message}`);
        // 2. Status Check
        if (spreadsheet.status !== "draft" && spreadsheet.status !== "changes_requested") {
            throw new Error(`Operation Blocked: Status is '${spreadsheet.status}'.`);
        }
        const rawData = spreadsheet.raw_data;
        if (!rawData.sheets)
            rawData.sheets = {};
        const sheet = rawData.sheets?.[sheet_name];
        if (!sheet)
            throw new Error(`Sheet '${sheet_name}' not found.`);
        if (!sheet.rows)
            sheet.rows = {};
        // 3. Safety Checks & Updates
        for (const change of changes) {
            const { row, col, value, style, comment } = change;
            if (!sheet.rows[row])
                sheet.rows[row] = {};
            const cell = sheet.rows[row]?.[col] || {};
            // Shield: Image
            if (cell.type === "image") {
                throw new Error(`Operation Blocked: Cell [${row},${col}] contains an image.`);
            }
            // Shield: Formula
            if (cell.f && !override_formula_shield) {
                throw new Error(`Formula Shield: Cell [${row},${col}] has a formula.`);
            }
            // APPLY UPDATE with Style Cloning support
            sheet.rows[row][col] = {
                ...cell,
                v: value,
                m: value, // Display value
            };
            if (style)
                sheet.rows[row][col].s = { ...(sheet.rows[row][col].s || {}), ...style };
            if (comment)
                sheet.rows[row][col].ps = { "item": { "title": "AutoGrid", "content": comment } };
        }
        // 4. Save
        const { error: updateError } = await supabase
            .from("spreadsheets")
            .update({ raw_data: rawData, updated_at: new Date().toISOString() })
            .eq("id", spreadsheet_id);
        if (updateError)
            throw new Error(`Update failed: ${updateError.message}`);
        return { content: [{ type: "text", text: "Successfully updated cells and styles." }] };
    }
    if (name === "audit_integrity") {
        const { spreadsheet_id } = args;
        const { data: spreadsheet, error } = await supabase
            .from("spreadsheets")
            .select("raw_data")
            .eq("id", spreadsheet_id)
            .single();
        if (error || !spreadsheet)
            throw new Error("Spreadsheet not found");
        const currentHash = calculateHash(spreadsheet.raw_data);
        // Get latest signature
        const { data: signatures, error: sigError } = await supabase
            .from("signatures")
            .select("snapshot_hash")
            .eq("spreadsheet_id", spreadsheet_id)
            .order("signed_at", { ascending: false })
            .limit(1);
        if (sigError)
            throw new Error(`Error fetching signatures: ${sigError.message}`);
        const lastSignature = signatures?.[0];
        if (!lastSignature) {
            return { content: [{ type: "text", text: "No signatures found. Integrity: UNKNOWN (Unsigned)" }] };
        }
        const isValid = lastSignature.snapshot_hash === currentHash;
        return {
            content: [{ type: "text", text: `Integrity Check: ${isValid ? "VALID" : "TAMPERED"}` }],
        };
    }
    if (name === "manage_workflow") {
        const { spreadsheet_id, action } = args;
        let newStatus = "";
        if (action === "request_review")
            newStatus = "in_review";
        if (action === "approve")
            newStatus = "approved_internal";
        if (action === "reject")
            newStatus = "changes_requested";
        if (!newStatus)
            throw new Error("Invalid action");
        const { error } = await supabase
            .from("spreadsheets")
            .update({ status: newStatus })
            .eq("id", spreadsheet_id);
        if (error)
            throw new Error(`Workflow update failed: ${error.message}`);
        return { content: [{ type: "text", text: `Status updated to ${newStatus}` }] };
    }
    if (name === "math_evaluate") {
        const { expression, context } = args;
        try {
            const result = evaluate(expression);
            console.log(`[Math] ${context || 'Calculation'}: ${expression} = ${result}`);
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            expression,
                            result: typeof result === 'number' ? result : result.toString(),
                            formatted: typeof result === 'number'
                                ? new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(result)
                                : result.toString()
                        })
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({ error: `Invalid expression: ${error.message}` })
                    }]
            };
        }
    }
    throw new Error(`Tool ${name} not found`);
});
// --- INFRAESTRUCTURA HTTP (SSE) ---
let transport;
// Endpoint para iniciar la conexión SSE
app.get("/sse", async (req, res) => {
    transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
});
// Endpoint para recibir mensajes del cliente (Antigravity)
app.post("/messages", async (req, res) => {
    if (!transport) {
        res.sendStatus(400);
        return;
    }
    await transport.handlePostMessage(req, res);
});
// --- API DE AUDITORÍA (Bridge para el Frontend) ---
app.post("/api/audit", async (req, res) => {
    try {
        const { sheetContext, userMessage } = req.body;
        const context = sheetContext;
        const message = userMessage;
        const promptPath = path.join(__dirname, "system_prompt.md");
        const SYSTEM_PROMPT = fs.readFileSync(promptPath, "utf-8");
        console.log(`[Audit API] Nueva solicitud recibida. Agregando a la cola...`);
        const result = await limit(() => {
            console.log(`[Audit API] Procesando solicitud (Cola liberada).`);
            return withRetry(async () => {
                return await generateText({
                    model: google('gemini-2.0-flash-lite-preview-02-05'),
                    system: SYSTEM_PROMPT,
                    messages: [
                        {
                            role: 'user',
                            content: `Analiza esta hoja de estimación: ${JSON.stringify(context)}. 
                                   Pregunta del usuario: ${message || "Audita la hoja completa."}`
                        }
                    ],
                    tools: {
                        query_catalog: {
                            description: 'Search the official catalog for unit prices and contract volumes using a concept code (e.g., "5.2.4.1").',
                            parameters: z.object({
                                code: z.string().describe('The concept code to search for.')
                            }),
                            execute: async ({ code }) => {
                                console.log(`Searching catalog for concept: ${code}`);
                                const { data, error } = await supabase
                                    .from("catalog_concepts")
                                    .select("*")
                                    .eq("code", code)
                                    .single();
                                if (error) {
                                    console.error(`Catalog query error for ${code}:`, error);
                                    return `Concept ${code} not found in catalog.`;
                                }
                                return JSON.stringify(data);
                            }
                        },
                        batch_query_catalog: {
                            description: 'Search multiple concept codes in the catalog at once.',
                            parameters: z.object({
                                codes: z.array(z.string()).describe('The concept codes to search for.')
                            }),
                            execute: async ({ codes }) => {
                                console.log(`Searching catalog for batch: ${codes.join(", ")}`);
                                const { data, error } = await supabase
                                    .from("catalog_concepts")
                                    .select("*")
                                    .in("code", codes);
                                if (error) {
                                    console.error(`Batch catalog query error:`, error);
                                    return `Error querying batch: ${error.message}`;
                                }
                                return JSON.stringify(data);
                            }
                        },
                        math_evaluate: {
                            description: 'Safely evaluate a mathematical expression. Use for ALL calculations.',
                            parameters: z.object({
                                expression: z.string().describe('Math expression (e.g., "24.5 * 10 * 1.16")'),
                                context: z.string().optional().describe('Brief context for logging')
                            }),
                            execute: async ({ expression, context }) => {
                                try {
                                    // Basic sanitation
                                    const sanitized = expression.replace(/=/g, '');
                                    const result = evaluate(sanitized);
                                    console.log(`[Gemini Math] ${context || 'Calc'}: ${expression} = ${result}`);
                                    return JSON.stringify({
                                        expression,
                                        result,
                                        formatted: typeof result === 'number'
                                            ? new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(result)
                                            : result.toString()
                                    });
                                }
                                catch (e) {
                                    return JSON.stringify({ error: `Math error: ${e.message}` });
                                }
                            }
                        }
                    },
                    maxSteps: 5,
                });
            });
        });
        console.log("Audit result generated successfully.");
        res.json({
            analysis: result.text,
            highlightCoordinates: (result.text.match(/[A-Z]\d+/g) || [])
        });
    }
    catch (error) {
        console.error("DETAILED AUDIT ERROR:", error);
        // Log the full error object for better debugging
        if (error.response) {
            console.error("Error Response Data:", error.response.data);
        }
        res.status(500).json({ error: error.message, details: error.toString() });
    }
});
// Mount workflow routes
app.use('/workflow', workflowRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`AutoGrid MCP Server running on HTTP port ${PORT}`);
    console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);
    console.log(`Audit API: http://localhost:${PORT}/api/audit`);
    console.log(`Workflow API: http://localhost:${PORT}/workflow`);
});
