export interface Manifest {
    version: 1;
    originalFileName: string;
    totalRows: number;
    totalColumns: number;
    chunkSize: number;
    chunks: ChunkMeta[];
    styles: Record<string, any>; // Simplified style data
    sheets: SheetMeta[];
}

export interface ChunkMeta {
    sheetId: string;
    startRow: number;
    endRow: number;
    key: string; // R2 path: chunks/chunk_0.json
}

export interface SheetMeta {
    id: string;
    name: string;
    rowCount: number;
    columnCount: number;
    mergeData: any[]; // Simplified merge range
    columnWidths: Record<number, number>;
}

export interface ProcessingJobData {
    fileKey: string;
    userId: string;
    spreadsheetId: string;
}
