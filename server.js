// Import required packages
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

// Basic route for testing
app.get('/api/health', (req, res) => {
    res.json({ 
        message: 'Grasshopper Backend Server is running!', 
        timestamp: new Date().toISOString(),
        status: 'healthy'
    });
});

// Test route for UML entities
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API endpoints ready for UML implementation',
        entities: ['Company', 'Employee', 'Admin', 'Super_Admin', 'Drone', 'Pallet', 'Route', 'Location', 'Warehouse']
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Grasshopper Backend Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});