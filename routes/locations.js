const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/locations
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT location_id, street, city, state, zip, country
            FROM location
            ORDER BY city, street
        `;
        
        const result = await db.query(query);
        
        const formattedLocations = result.rows.map(location => {
            const addressParts = [
                location.street,
                location.city,
                location.state,
                location.zip,
                location.country
            ].filter(part => part);
            
            return {
                location_id: location.location_id,
                name: `${location.city}, ${location.country}`,
                address: addressParts.join(', '),
                city: location.city,
                country: location.country
            };
        });
        
        res.json({
            success: true,
            data: formattedLocations,
            message: `Retrieved ${formattedLocations.length} locations`
        });
        
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch locations'
        });
    }
});

module.exports = router;