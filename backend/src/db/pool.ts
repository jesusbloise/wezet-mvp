import { Pool, PoolConfig } from "pg";

const baseConfig: PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
    }
  : {
      user: process.env.PGUSER || "postgres",
      host: process.env.PGHOST || "localhost",
      database: process.env.PGDATABASE || "WEZET",
      password: process.env.PGPASSWORD || "atomica",
      port: Number(process.env.PGPORT) || 5432,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
    };

const pool = new Pool(baseConfig);

export default pool;