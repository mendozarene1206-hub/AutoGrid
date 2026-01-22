const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface UploadResult {
    presignedUrl: string;
    fileKey: string;
}

export interface NotifyResult {
    jobId: string;
    status: string;
}

export interface JobStatus {
    jobId: string;
    state: string;
    progress: number;
    data: any;
    result: any;
    failedReason?: string;
}

/**
 * Get a presigned URL for direct R2 upload
 */
export async function getPresignedUrl(filename: string): Promise<UploadResult> {
    const response = await fetch(`${API_BASE_URL}/api/upload/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to get presigned URL');
    }

    return response.json();
}

/**
 * Upload file directly to R2 using presigned URL (Zero-Server-RAM)
 */
export async function uploadToR2(
    presignedUrl: string,
    file: File,
    onProgress?: (percent: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress?.(percent);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
        });

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        xhr.send(file);
    });
}

/**
 * Notify server that upload is complete and start processing
 */
export async function notifyUploadComplete(
    fileKey: string,
    userId: string,
    spreadsheetId: string
): Promise<NotifyResult> {
    const response = await fetch(`${API_BASE_URL}/api/upload/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey, userId, spreadsheetId }),
    });

    if (!response.ok) {
        throw new Error('Failed to notify server');
    }

    return response.json();
}

/**
 * Check job status
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${API_BASE_URL}/api/upload/status/${jobId}`);

    if (!response.ok) {
        throw new Error('Failed to get job status');
    }

    return response.json();
}

/**
 * Poll job status until complete
 */
export async function waitForJobCompletion(
    jobId: string,
    onProgress?: (status: JobStatus) => void,
    pollInterval = 2000
): Promise<JobStatus> {
    return new Promise((resolve, reject) => {
        const poll = async () => {
            try {
                const status = await getJobStatus(jobId);
                onProgress?.(status);

                if (status.state === 'completed') {
                    resolve(status);
                } else if (status.state === 'failed') {
                    reject(new Error(status.failedReason || 'Job failed'));
                } else {
                    setTimeout(poll, pollInterval);
                }
            } catch (error) {
                reject(error);
            }
        };

        poll();
    });
}
