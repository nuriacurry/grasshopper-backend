const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Create Express application
const app = express();

// Set port (use environment variable or default to 3000)
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies

// Import route files
const routesRoutes = require('./routes/routes');  // Main routes API (replaces orders)
const productsRoutes = require('./routes/products');
const locationsRoutes = require('./routes/locations');

// Basic route for testing
app.get('/api/health', (req, res) => {
    res.json({ 
        message: 'Grasshopper Backend Server is running!', 
        timestamp: new Date().toISOString(),
        status: 'healthy',
        database_connected: !!process.env.DATABASE_URL
    });
});

// Test route for system info
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Route-based API system ready',
        endpoints: [
            'GET /api/routes - List all customer orders',
            'POST /api/routes - Create new order',
            'PUT /api/routes/:id - Modify order',
            'DELETE /api/routes/:id - Cancel order',
            'POST /api/routes/:id/start - Launch drones',
            'POST /api/routes/:id/complete - Complete delivery',
            'GET /api/products - Available products',
            'GET /api/locations - Delivery locations'
        ],
        system: 'Route-based with Zachary\'s database schema'
    });
});

// API Routes
app.use('/api/routes', routesRoutes);    // Main order management
app.use('/api/products', productsRoutes); // Product catalog
app.use('/api/locations', locationsRoutes); // Delivery locations

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// // 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Grasshopper Backend Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Routes API (Orders): http://localhost:${PORT}/api/routes`);
    console.log(`Products API: http://localhost:${PORT}/api/products`);
    console.log(`Locations API: http://localhost:${PORT}/api/locations`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});
