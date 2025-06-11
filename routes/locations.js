const express = require('express');
const router = express.Router();
const db = require('../config/database');

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Retrieves all delivery locations from database with formatted address information.
 * Combines address components into readable format and filters out null values for clean display.
 * Orders locations by city and street for consistent frontend dropdown presentation.
 * Functions Using This Method: Frontend location dropdown population, order creation interface
 * Description of Variables:
 * @param req - Express request object
 * @param res - Express response object containing formatted locations array with id, name, address, city, and country
 */
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