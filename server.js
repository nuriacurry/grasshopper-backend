const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Configures middleware for cross-origin requests and JSON parsing.
 * Sets up CORS to allow frontend communication and express.json() to parse request bodies.
 * Functions Using This Method: All incoming HTTP requests
 * Description of Variables: None - middleware configuration only
 */
app.use(cors());
app.use(express.json());

// Import routes
const routesRoutes = require('./routes/routes');
const productsRoutes = require('./routes/products');
const locationsRoutes = require('./routes/locations');

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Health check endpoint that returns server status and database connectivity.
 * Used for monitoring and debugging to verify backend is operational.
 * Functions Using This Method: Frontend health checks, monitoring systems
 * Description of Variables:
 * @param req - Express request object
 * @param res - Express response object containing health status
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        message: 'Grasshopper Backend Server is running!', 
        timestamp: new Date().toISOString(),
        status: 'healthy',
        database_connected: !!process.env.DATABASE_URL
    });
});

// API Routes
app.use('/api/routes', routesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/locations', locationsRoutes);

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Global error handling middleware that catches unhandled errors
 * and returns standardized error responses to prevent server crashes.
 * Functions Using This Method: All route handlers when errors occur
 * Description of Variables:
 * @param err - Error object containing error details
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for middleware chain
 */
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: 404 handler for undefined API endpoints. Returns standardized
 * error response when requested endpoint does not exist.
 * Functions Using This Method: Any request to non-existent endpoints
 * Description of Variables:
 * @param req - Express request object
 * @param res - Express response object containing 404 error
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Starts the Express server on specified port and logs startup information.
 * Displays server URL and database connection status for debugging.
 * Functions Using This Method: Application startup
 * Description of Variables:
 * @param PORT - Port number from environment variable or default 3000
 */
app.listen(PORT, () => {
    console.log(`Grasshopper Backend Server running on http://localhost:${PORT}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});