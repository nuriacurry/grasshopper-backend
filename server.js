const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const routesRoutes = require('./routes/routes');
const productsRoutes = require('./routes/products');
const locationsRoutes = require('./routes/locations');

// Health check endpoint
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Grasshopper Backend Server running on http://localhost:${PORT}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});