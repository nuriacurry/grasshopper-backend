const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database');

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

app.get('/api/inspect', async (req, res) => {
    try {
        console.log('🔍 Inspecting database schema...');
        
        // Get all tables
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;
        
        const tables = await db.query(tablesQuery);
        console.log('📋 Available tables:', tables.rows.map(r => r.table_name));
        
        const schemaInfo = {};
        
        // Get columns for each table
        for (const table of tables.rows) {
            const tableName = table.table_name;
            
            const columnsQuery = `
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position;
            `;
            
            const columns = await db.query(columnsQuery, [tableName]);
            schemaInfo[tableName] = columns.rows;
            
            console.log(`📊 Table "${tableName}":`, columns.rows.map(c => `${c.column_name} (${c.data_type})`));
        }
        
        res.json({
            success: true,
            tables: tables.rows.map(r => r.table_name),
            schema: schemaInfo,
            message: 'Database schema inspected successfully'
        });
        
    } catch (error) {
        console.error('Error inspecting database:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to inspect database',
            error: error.message
        });
    }
});

app.get('/api/fleet-status', async (req, res) => {
    try {
        console.log('🚁 Checking fleet status...');
        
        // Check all drones
        const dronesQuery = `
            SELECT d.*, c.container_id, c.max_capacity, c.battery_percentage as container_battery,
                   CASE WHEN c.temperature IS NOT NULL THEN true ELSE false END as is_cold
            FROM drone d
            LEFT JOIN container c ON d.drone_id = c.drone_id
            ORDER BY d.drone_id
        `;
        
        const dronesResult = await db.query(dronesQuery);
        
        // Check available drones (your criteria)
        const availableQuery = `
            SELECT d.drone_id, d.battery_percentage, d.location_id, d.route_id,
                   c.container_id, c.max_capacity, c.battery_percentage as container_battery,
                   CASE WHEN c.temperature IS NOT NULL THEN true ELSE false END as is_cold
            FROM drone d
            JOIN container c ON d.drone_id = c.drone_id
            WHERE d.route_id IS NULL AND d.battery_percentage > 20 AND c.battery_percentage > 20
        `;
        
        const availableResult = await db.query(availableQuery);
        
        console.log(`Total drones: ${dronesResult.rows.length}`);
        console.log(`Available drones: ${availableResult.rows.length}`);
        
        res.json({
            success: true,
            total_drones: dronesResult.rows.length,
            available_drones: availableResult.rows.length,
            all_drones: dronesResult.rows,
            available_for_assignment: availableResult.rows,
            message: 'Fleet status retrieved'
        });
        
    } catch (error) {
        console.error('Error checking fleet status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check fleet status',
            error: error.message
        });
    }
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
