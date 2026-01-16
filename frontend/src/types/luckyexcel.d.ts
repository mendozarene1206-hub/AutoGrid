declare module 'luckyexcel' {
    interface LuckyExcelExportJson {
        sheets: any[];
        info: {
            name: string;
            creator: string;
            lastModifiedBy: string;
            createdTime: string;
            modifiedTime: string;
            company: string;
            appversion: string;
        };
    }

    interface LuckyExcelFile {
        fileName: string;
        worksheets: any[];
    }

    const LuckyExcel: {
        transformExcelToLucky(
            file: File | ArrayBuffer,
            callback: (exportJson: LuckyExcelExportJson, luckysheetFile: LuckyExcelFile) => void,
            errorCallback?: (error: any) => void
        ): void;
    };

    export default LuckyExcel;
}
