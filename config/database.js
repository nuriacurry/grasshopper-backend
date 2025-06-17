const { Pool } = require('pg');

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Validates that DATABASE_URL environment variable is set.
 * Exits application with error code 1 if database URL is missing to prevent runtime errors.
 * Functions Using This Method: Application startup validation
 * Description of Variables: None - environment validation only
 */
if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
}

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Creates PostgreSQL connection pool
 * Configures SSL and sets connection limits and timeouts.
 * Functions Using This Method: All database operations throughout the application
 * Description of Variables:
 * @param connectionString - Database URL from environment variables
 * @param ssl - SSL configuration based on NODE_ENV
 * @param max - Maximum number of connections in pool (20)
 * @param idleTimeoutMillis - Time before idle connections are closed (30 seconds)
 * @param connectionTimeoutMillis - Maximum time to wait for connection (2 seconds)
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: process.env.SSL_REJECT_UNAUTHORIZED !== 'false'
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Event handler for successful database connections.
 * Logs connection status for monitoring and debugging purposes.
 * Functions Using This Method: Database connection monitoring
 * Description of Variables:
 * @param client - PostgreSQL client instance that connected
 */
pool.on('connect', (client) => {
    console.log('Connected to Supabase PostgreSQL database');
});

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Event handler for database connection errors on idle clients.
 * Logs unexpected errors to help with debugging connection issues.
 * Functions Using This Method: Database error monitoring
 * Description of Variables:
 * @param err - Error object containing connection error details
 * @param client - PostgreSQL client instance that encountered the error
 */
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: zshutdown handler for SIGINT signal (Ctrl+C).
 * Closes all database connections properly before exiting
 * Functions Using This Method: Application shutdown process
 * Description of Variables: None - shutdown handler only
 */
process.on('SIGINT', () => {
    console.log('Shutting down...');
    pool.end(() => {
        console.log('Database pool has ended');
        process.exit(0);
    });
});

module.exports = pool;