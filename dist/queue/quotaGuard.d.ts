import type { Worker } from 'bullmq';
/** Thrown by producer-side enqueue when Redis is unreachable or quota-maxed. */
export declare class QueueUnavailableError extends Error {
    code: string;
    constructor(message: string);
}
export declare function isQuotaExceededError(err: Error | string | undefined | null): boolean;
export declare function attachQuotaGuard(worker: Worker, label: string): void;
//# sourceMappingURL=quotaGuard.d.ts.map