import { SupabaseClient } from "@supabase/supabase-js";

export interface ToolResponse {
    content: Array<{ type: string; text: string }>;
}

/**
 * Query a single concept from the catalog
 */
export async function handleQueryCatalog(
    supabase: SupabaseClient,
    args: { code: string }
): Promise<ToolResponse> {
    const { code } = args;
    const { data, error } = await supabase
        .from("catalog_concepts")
        .select("*")
        .eq("code", code)
        .single();

    if (error) {
        return {
            content: [{ type: "text", text: `Concept ${code} not found in catalog.` }],
        };
    }

    return {
        content: [{ type: "text", text: JSON.stringify(data) }],
    };
}

/**
 * Query multiple concepts from the catalog
 */
export async function handleBatchQueryCatalog(
    supabase: SupabaseClient,
    args: { codes: string[] }
): Promise<ToolResponse> {
    const { codes } = args;

    if (!codes || codes.length === 0) {
        return {
            content: [{ type: "text", text: JSON.stringify({ error: "No codes provided" }) }],
        };
    }

    if (codes.length > 50) {
        return {
            content: [{ type: "text", text: JSON.stringify({ error: "Maximum 50 codes allowed per batch" }) }],
        };
    }

    const { data, error } = await supabase
        .from("catalog_concepts")
        .select("*")
        .in("code", codes);

    if (error) {
        throw new Error(`Batch catalog query failed: ${error.message}`);
    }

    return {
        content: [{ type: "text", text: JSON.stringify(data) }],
    };
}
