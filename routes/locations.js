const express = require('express');
const router = express.Router();
const db = require('../config/database');

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Retrieves all delivery locations from database
 * Combines address components into readable format and filters out null values
 * Orders locations by city and street
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
    
    // Fallback to mock locations
    const mockLocations = [
        { location_id: 'BCN001', name: 'Barcelona, Spain', address: 'Plaça Catalunya, Barcelona, Spain', city: 'Barcelona', country: 'Spain' },
        { location_id: 'MAD001', name: 'Madrid, Spain', address: 'Puerta del Sol, Madrid, Spain', city: 'Madrid', country: 'Spain' },
        { location_id: 'VAL001', name: 'Valencia, Spain', address: 'Plaza del Ayuntamiento, Valencia, Spain', city: 'Valencia', country: 'Spain' },
        { location_id: 'SEV001', name: 'Seville, Spain', address: 'Plaza de España, Seville, Spain', city: 'Seville', country: 'Spain' },
        { location_id: 'BIL001', name: 'Bilbao, Spain', address: 'Plaza Nueva, Bilbao, Spain', city: 'Bilbao', country: 'Spain' }
    ];
    
    res.json({
        success: true,
        data: mockLocations,
        message: 'Retrieved 5 fallback locations'
    });
}
});

module.exports = router;