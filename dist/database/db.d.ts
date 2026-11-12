import { Pool } from 'pg';
/**
 * Initialises the PostgreSQL connection (embedded if no external PG is
 * configured) and runs the schema migrations.
 */
export declare function initDatabase(): Promise<void>;
export declare function getPool(): Pool;
/** Simple typed helper that runs a query and returns only the rows. */
export declare function query<T = any>(text: string, params?: any[]): Promise<T[]>;
/** Runs a single-row query and returns the first row or undefined. */
export declare function queryOne<T = any>(text: string, params?: any[]): Promise<T | undefined>;
export declare function closeDatabase(): Promise<void>;
//# sourceMappingURL=db.d.ts.map