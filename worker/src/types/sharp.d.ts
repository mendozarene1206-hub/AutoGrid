declare module 'sharp' {
    interface Sharp {
        resize(width: number, height: number, options?: any): Sharp;
        webp(options?: { quality?: number; effort?: number }): Sharp;
        toBuffer(): Promise<Buffer>;
        metadata(): Promise<{
            width?: number;
            height?: number;
            format?: string;
            size?: number;
        }>;
    }

    function sharp(input: Buffer, options?: any): Sharp;
    export = sharp;
}
