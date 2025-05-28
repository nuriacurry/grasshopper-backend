const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get /api/locations - Get all delivery locations for dropdown 
router.get('/', async (req, res) => {
    try {
        console.log('Get /api/locations - Fetching delivery locations');

        // Try to get locations from database first
        const query = `
            SELECT location_id, address, street, city, state, zip, country
            FROM location
            ORDER BY city, address
        `;
    
        const result = await db.query(query);

        if (result.rows.length > 0) {
            // Format database locations
            const formattedLocations = result.rows.map(location => ({
                location_id: location.location_id,
                name: `${location.city}, ${location.country}`,
                address: `${location.address}${location.street ? ', ' + location.street : ''}, ${location.city}, ${location.country}`,
                city: location.city,
                country: location.country,
                type: 'CLIENT_LOCATION'
            }));
        } else {

            // Use mock locations if database is empty
            const mockLocations = [
            { location_id: 'MAD001', name: 'Madrid, Spain', address: 'Puerta del Sol, Madrid, Spain', city: 'Madrid', country: 'Spain', type: 'CLIENT_LOCATION' },
            { location_id: 'VAL001', name: 'Valencia, Spain', address: 'Plaza del Ayuntamiento, Valencia, Spain', city: 'Valencia', country: 'Spain', type: 'CLIENT_LOCATION' },
            { location_id: 'SEV001', name: 'Seville, Spain', address: 'Plaza de España, Seville, Spain', city: 'Seville', country: 'Spain', type: 'CLIENT_LOCATION' },
            { location_id: 'BIL001', name: 'Bilbao, Spain', address: 'Plaza Nueva, Bilbao, Spain', city: 'Bilbao', country: 'Spain', type: 'CLIENT_LOCATION' }
            ]

            res.json({
                success: true,
                data: mockLocations,
                message: `Retrieved ${mockLocations.length} mock locations`
            });
        }
    } catch(error) {
        console.error('Error fetching locations, using mock data: ', error);

        // Use mock locations on database error
        const mockLocations = [
                { location_id: 'BCN001', name: 'Barcelona, Spain', address: 'Plaça Catalunya, Barcelona, Spain', city: 'Barcelona', country: 'Spain', type: 'CLIENT_LOCATION' },
                { location_id: 'MAD001', name: 'Madrid, Spain', address: 'Puerta del Sol, Madrid, Spain', city: 'Madrid', country: 'Spain', type: 'CLIENT_LOCATION' },
                { location_id: 'VAL001', name: 'Valencia, Spain', address: 'Plaza del Ayuntamiento, Valencia, Spain', city: 'Valencia', country: 'Spain', type: 'CLIENT_LOCATION' },
                { location_id: 'SEV001', name: 'Seville, Spain', address: 'Plaza de España, Seville, Spain', city: 'Seville', country: 'Spain', type: 'CLIENT_LOCATION' },
                { location_id: 'BIL001', name: 'Bilbao, Spain', address: 'Plaza Nueva, Bilbao, Spain', city: 'Bilbao', country: 'Spain', type: 'CLIENT_LOCATION' }
            ];
        
        res.json({
            success: true,
            data: mockLocations,
            message: `Retrieved ${mockLocations.length} fallback locations`
        });
    }
});

module.exports = router;
