interface OverviewData {
    apiKeys: Array<Record<string, any>>;
    emails: Array<Record<string, any>>;
    stats: {
        total: number;
        sent: number;
        failed: number;
        queued: number;
    };
}
export declare function renderOverview({ apiKeys, emails, stats }: OverviewData): string;
export {};
//# sourceMappingURL=overview.d.ts.map