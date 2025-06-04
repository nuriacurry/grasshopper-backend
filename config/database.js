const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', (client) => {
    console.log('Connected to Supabase PostgreSQL database');
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

// Shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    pool.end(() => {
        console.log('Database pool has ended');
        process.exit(0);
    });
});

module.exports = pool;