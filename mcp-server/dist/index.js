#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const supabase_js_1 = require("@supabase/supabase-js");
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const json_stable_stringify_1 = __importDefault(require("json-stable-stringify"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
// CONFIGURACIÓN EXPRESS (HTTP)
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase configuration in .env");
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_KEY);
const server = new index_js_1.Server({
    name: "autogrid-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Helper to calculate hash (DETERMINISTA)
function calculateHash(data) {
    // json-stable-stringify asegura que {a:1, b:2} sea siempre igual al stringificar
    return crypto_1.default.createHash("sha256").update((0, json_stable_stringify_1.default)(data) || "").digest("hex");
}
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "safe_update_cells",
                description: "Update spreadsheet cells with strict safety checks.",
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
                                    value: { type: "string" }, // or any
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
        ],
    };
});
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
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
            rawData.sheets = {}; // Init sheets if empty
        const sheet = rawData.sheets?.[sheet_name];
        if (!sheet)
            throw new Error(`Sheet '${sheet_name}' not found.`);
        if (!sheet.rows)
            sheet.rows = {}; // Init rows if empty
        // 3. Safety Checks & Updates
        for (const change of changes) {
            const { row, col, value } = change;
            if (!sheet.rows[row])
                sheet.rows[row] = {};
            const cell = sheet.rows[row]?.[col];
            if (cell) {
                // Shield: Image
                if (cell.type === "image") {
                    throw new Error(`Operation Blocked: Cell [${row},${col}] contains an image.`);
                }
                // Shield: Formula (Soft Shield with Detailed Error)
                if (cell.f && !override_formula_shield) {
                    const isComplex = cell.f.includes("!") || cell.f.includes(":");
                    const impact = isComplex ? "HIGH (affects other sheets/ranges)" : "LOW (local calculation)";
                    throw new Error(JSON.stringify({
                        error: "formula_shield_triggered",
                        message: `Cell [${row},${col}] contains a formula (${cell.f}).`,
                        details: {
                            formula: cell.f,
                            impact: impact,
                            instruction: "To proceed, retry safe_update_cells with 'override_formula_shield': true"
                        }
                    }));
                }
            }
            // FIX: MERGE to preserve styles/metadata
            sheet.rows[row][col] = {
                ...(sheet.rows[row][col] || {}),
                v: value
            };
        }
        // 4. Save
        const { error: updateError } = await supabase
            .from("spreadsheets")
            .update({ raw_data: rawData, updated_at: new Date().toISOString() })
            .eq("id", spreadsheet_id);
        if (updateError)
            throw new Error(`Update failed: ${updateError.message}`);
        return { content: [{ type: "text", text: "Successfully updated cells." }] };
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
    throw new Error(`Tool ${name} not found`);
});
// --- INFRAESTRUCTURA HTTP (SSE) ---
let transport;
// Endpoint para iniciar la conexión SSE
app.get("/sse", async (req, res) => {
    transport = new sse_js_1.SSEServerTransport("/messages", res);
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`AutoGrid MCP Server running on HTTP port ${PORT}`);
    console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);
});
