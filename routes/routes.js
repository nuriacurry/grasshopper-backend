const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Import models
const Container = require('../models/Container');
const Drone = require('../models/Drone');

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: Gets available drones and their containers from database.
* Converts database results to Drone objects
* Functions Using This Method: POST /api/routes route creation
* Description of Variables:
* @returns {Array} availableDrones - Array of Drone objects with available containers
*/
async function getAvailableDrones() {
    try {
        // Get available containers (not assigned to any drone)
        const availableContainersQuery = `
            SELECT container_id, max_capacity, battery_percentage,
                   CASE WHEN temperature IS NOT NULL THEN true ELSE false END as is_cold
            FROM container 
            WHERE drone_id IS NULL 
              AND CAST(battery_percentage AS INTEGER) > 20
            ORDER BY max_capacity DESC, container_id
        `;
        
        const containerResult = await db.query(availableContainersQuery);
        
        // Get available drones (not assigned to any route)
        const availableDronesQuery = `
            SELECT drone_id, battery_percentage, location_id
            FROM drone 
            WHERE route_id IS NULL 
              AND CAST(battery_percentage AS INTEGER) > 20
            ORDER BY drone_id
        `;
        
        const droneResult = await db.query(availableDronesQuery);
        
        // Match drones with containers
        const drones = [];
        const usedContainers = new Set();
        
        droneResult.rows.forEach(droneRow => {
            // Find an available container for this drone
            const availableContainer = containerResult.rows.find(container => 
                !usedContainers.has(container.container_id)
            );
            
            if (availableContainer) {
                // Create drone with assigned container
                const drone = new Drone(droneRow.drone_id, availableContainer.container_id, availableContainer.max_capacity);
                drone.battery_percentage = droneRow.battery_percentage;
                drone.current_location = droneRow.location_id;
                
                // Set container properties
                drone.container.max_weight_capacity = parseInt(availableContainer.max_capacity);
                drone.container.is_cold = availableContainer.is_cold;
                drone.container.is_charged = parseInt(availableContainer.battery_percentage) > 20;
                drone.container.current_weight = 0;
                
                drones.push(drone);
                usedContainers.add(availableContainer.container_id);
            }
        });
        
        return drones;
    } catch (error) {
        console.error('Error fetching available drones:', error);
        throw error;
    }
}

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: Determines route status based on drone assignments and locations.
* Categorizes routes as Processing, In-Transit, or Completed.
* Functions Using This Method: GET /api/routes endpoint
* Description of Variables:
* @param {number} assignedDroneCount - Number of drones assigned to route
* @param {number} inFlightCount - Number of drones currently flying (location_id = '0')
* @returns {string} routeStatus - Route status (Processing, In-Transit, or Completed)
*/
function getRouteStatus(assignedDroneCount, inFlightCount) {
    if (assignedDroneCount === 0) {
        return 'Completed';
    }
    
    if (inFlightCount > 0) {
        return 'In-Transit';
    }
    
    return 'Processing';
}

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: POST endpoint to create new route with order assignment.
* Validates products exist in database and calculates weight from database.
* Assigns suitable drone based on weight and temperature requirements.
* Functions Using This Method: Frontend order creation form
* Description of Variables:
* @param {Object} req - Express request object containing products, delivery_location, arrival_time
* @param {Object} res - Express response object with route creation result
*/
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/routes - Fetching all routes from database');
        
        const query = `
            SELECT r.route_id, r.starting_point, r.ending_point, 
                d.arrival_time, 
                COUNT(d.drone_id) as assigned_drone_count,
                COUNT(CASE WHEN d.location_id = '0' THEN 1 END) as in_flight_count,
                ARRAY_AGG(d.drone_id) FILTER (WHERE d.drone_id IS NOT NULL) as drone_ids,
                ARRAY_AGG(c.container_id) FILTER (WHERE c.container_id IS NOT NULL) as container_ids,
                SUM(c.max_capacity) as total_capacity,
                CASE 
                    WHEN COUNT(d.drone_id) = 0 THEN 'Completed'
                    WHEN COUNT(CASE WHEN d.location_id = '0' THEN 1 END) > 0 THEN 'In-Transit'
                    ELSE 'Processing'
                END as route_status
            FROM route r
            LEFT JOIN drone d ON r.route_id = d.route_id
            LEFT JOIN container c ON d.drone_id = c.drone_id
            GROUP BY r.route_id, r.starting_point, r.ending_point, d.arrival_time
            ORDER BY r.route_id DESC
        `;
        
        const result = await db.query(query);
        
        // Format for frontend dashboard
        const formattedRoutes = result.rows.map(route => ({
            order_id: route.route_id,
            container_status: route.assigned_drone_count > 0 ? 'Container Selected' : 'Container Pending',
            container_id: route.container_ids && route.container_ids.length > 0 ? 
                route.container_ids.join(', ') : 'N/A',
            order_status: route.route_status === 'Completed' ? 'Delivered' : 'On-Time',
            delivery_status: route.route_status,
            departure_time: null,
            estimated_arrival: route.arrival_time ? 
                new Date(route.arrival_time).toLocaleDateString() + ' ' + 
                new Date(route.arrival_time).toLocaleTimeString() : null,
            delivery_location: route.ending_point,
            drone_count: route.assigned_drone_count || 0,
            total_capacity: route.total_capacity || 0
        }));
        
        res.json({
            success: true,
            data: formattedRoutes,
            message: `Retrieved ${result.rows.length} routes`
        });
        
    } catch (error) {
        console.error('Error fetching routes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch routes'
        });
    }
});

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: GET endpoint to retrieve specific route by ID.
* Returns route data including drone assignments and flight status.
* Functions Using This Method: Frontend route details view
* Description of Variables:
* @param {Object} req - Express request object with id parameter containing route_id
* @param {Object} res - Express response object with route details or error message
*/
router.get('/:id', async (req, res) => {
    try {
        const routeId = req.params.id;
        console.log(`GET /api/routes/${routeId} - Fetching specific route`);
        
        const query = `
            SELECT r.*, 
                   COUNT(d.drone_id) as assigned_drone_count,
                   COUNT(CASE WHEN d.location_id = '0' THEN 1 END) as in_flight_count,
                   CASE 
                       WHEN COUNT(d.drone_id) = 0 THEN 'Completed'
                       WHEN COUNT(CASE WHEN d.location_id = '0' THEN 1 END) > 0 THEN 'In-Transit'
                       ELSE 'Processing'
                   END as route_status,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'drone_id', d.drone_id,
                               'container_id', c.container_id,
                               'battery_percentage', d.battery_percentage,
                               'location_id', d.location_id,
                               'container_capacity', c.max_capacity,
                               'is_cold', CASE WHEN c.temperature IS NOT NULL THEN true ELSE false END
                           )
                       ) FILTER (WHERE d.drone_id IS NOT NULL), 
                       '[]'
                   ) as assigned_drones
            FROM route r
            LEFT JOIN drone d ON r.route_id = d.route_id
            LEFT JOIN container c ON d.drone_id = c.drone_id
            WHERE r.route_id = $1
            GROUP BY r.route_id
        `;
        
        const result = await db.query(query, [routeId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Route not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Route retrieved successfully'
        });
        
    } catch (error) {
        console.error('Error fetching route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch route'
        });
    }
});

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: POST endpoint to create new route with order assignment.
* Validates products exist in database and calculates weight from database.
* Assigns drone based on weight and temperature requirements.
* Functions Using This Method: Frontend order creation form
* Description of Variables:
* @param {Object} req - Express request object containing products, delivery_location, arrival_time
* @param {Object} res - Express response object with route creation result
*/

router.post('/', async (req, res) => {
    try {
        console.log('POST /api/routes - Creating new route');
        console.log('Request body:', req.body);
        
        // Validate required fields
        const { products, delivery_location, arrival_time } = req.body;
        
        if (!products || !delivery_location || !arrival_time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: products, delivery_location, arrival_time'
            });
        }

        // Validate products array
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Products array cannot be empty'
            });
        }

        // Process products
        const orderItems = products.map(product => {
            if (typeof product === 'string') {
                // Add validation for empty string
                if (!product || product.trim() === '') {
                    throw new Error('Product name cannot be empty');
                }
                return { productName: product, quantity: 1 };
            } else if (product.name && typeof product.quantity === 'number') {
                // Check quantity 
                if (product.quantity <= 0) {
                    throw new Error('Product quantity must be greater than 0');
                }
                // Check name
                if (!product.name || product.name.trim() === '') {
                    throw new Error('Product name cannot be empty');
                }
                return { productName: product.name, quantity: product.quantity };
            } else {
                throw new Error(`Invalid product format: ${JSON.stringify(product)}`);
            }
        });

        // Validate arrival time format
        const arrivalDate = new Date(arrival_time);
        if (isNaN(arrivalDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid arrival time format'
            });
        }

        // Validate arrival time is in future
        if (arrivalDate <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Arrival time must be in the future'
            });
        }

        // Validate products exist in database and calculate weight
        let totalWeight = 0;
        let requiresCold = false;
        const validatedItems = [];
        const invalidProducts = [];

        for (const item of orderItems) {
            const productQuery = `
                SELECT product_id, product_name, product_weight, minimum_temperature
                FROM product 
                WHERE LOWER(product_name) = LOWER($1)
            `;
            const productResult = await db.query(productQuery, [item.productName]);
            
            if (productResult.rows.length === 0) {
                invalidProducts.push(item.productName);
            } else {
                const product = productResult.rows[0];
                const itemWeight = parseFloat(product.product_weight) * item.quantity;
                totalWeight += itemWeight;
                
                if (product.minimum_temperature !== null) {
                    requiresCold = true;
                }
                
                validatedItems.push({
                    productName: product.product_name,
                    quantity: item.quantity,
                    unitWeight: parseFloat(product.product_weight),
                    totalWeight: itemWeight,
                    requiresCold: product.minimum_temperature !== null
                });
            }
        }

        // Check for invalid products
        if (invalidProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid products: ${invalidProducts.join(', ')}`
            });
        }

        // Check if order is too heavy
        if (totalWeight > 350) {
            return res.status(400).json({
                success: false,
                message: 'Order exceeds maximum weight capacity'
            });
        }

        console.log(`Order breakdown: Total: ${totalWeight}kg, Cold required: ${requiresCold}`);
        
        // Get available drones
        const availableDrones = await getAvailableDrones();
        
        if (availableDrones.length === 0) {
            return res.status(409).json({
                success: false,
                message: 'No available drones at this time'
            });
        }
        
        // Find suitable drone
        let suitableDrone = null;
        for (const drone of availableDrones) {
            const canHandleWeight = drone.container.max_weight_capacity >= totalWeight;
            const canHandleCold = !requiresCold || drone.container.is_cold;
            
            if (canHandleWeight && canHandleCold) {
                suitableDrone = drone;
                break;
            }
        }
        
        if (!suitableDrone) {
            return res.status(409).json({
                success: false,
                message: 'No suitable drones available for this order',
                required_weight: totalWeight,
                cold_required: requiresCold
            });
        }
        
        console.log(`Assigned order to drone ${suitableDrone.drone_id}, container ${suitableDrone.container.container_id}`);
        
        // Calculate cold and non-cold weights
        const coldWeight = validatedItems
            .filter(item => item.requiresCold)
            .reduce((sum, item) => sum + item.totalWeight, 0);
        const nonColdWeight = totalWeight - coldWeight;
        
        if (coldWeight > 0 && nonColdWeight > 0) {
            return res.status(400).json({
                success: false,
                message: 'Orders cannot contain both cold and non-cold items. Please place separate orders.',
                error_type: 'MIXED_ORDER_NOT_ALLOWED',
                details: {
                    coldItems: validatedItems.filter(item => item.requiresCold).map(item => `${item.productName} (${item.quantity}x)`),
                    nonColdItems: validatedItems.filter(item => !item.requiresCold).map(item => `${item.productName} (${item.quantity}x)`),
                    suggestion: 'Create one order for cold items and another for non-cold items'
                }
            });
        }

        res.status(201).json({
            success: true,
            data: {
                route_id: Math.floor(Math.random() * 1000) + 100, // Mock route ID
                drone_assignments: [{
                    drone_id: suitableDrone.drone_id,
                    container_id: suitableDrone.container.container_id,
                    weight_allocated: totalWeight,
                    type: requiresCold ? 'cold' : 'standard'
                }],
                delivery_status: 'Processing',
                total_weight: totalWeight,
                drone_count: 1,
                cold_weight: coldWeight,
                non_cold_weight: nonColdWeight,
                order_items: validatedItems
            },
            message: 'Order processed successfully (using database products)'
        });
        
    } catch (error) {
        console.error('Error creating route:', error);
        
        if (error.message.includes('quantity must be greater than 0')) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        } else if (error.message.includes('Invalid product format')) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to create route'
            });
        }
    }
});

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: PUT endpoint to update existing route details.
* Validates route exists and is not in flight before allowing updates.
* Only allows updates to delivery_location and arrival_time fields.
* Functions Using This Method: Frontend route modification interface
* Description of Variables:
* @param {Object} req - Express request object with route id and update fields
* @param {Object} res - Express response object with update result
*/
router.put('/:id', async (req, res) => {
    try {
        const routeId = req.params.id;
        console.log(`PUT /api/routes/${routeId} - Updating route`);
        
        // Check if route exists and no drones are in flight
        const checkQuery = `
            SELECT r.route_id, 
                   COUNT(d.drone_id) as assigned_drone_count,
                   COUNT(CASE WHEN d.location_id = '0' THEN 1 END) as in_flight_count
            FROM route r
            LEFT JOIN drone d ON r.route_id = d.route_id
            WHERE r.route_id = $1
            GROUP BY r.route_id
        `;
        const checkResult = await db.query(checkQuery, [routeId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Route not found'
            });
        }
        
        const routeData = checkResult.rows[0];
        
        // Cannot modify completed routes
        if (routeData.assigned_drone_count === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify completed routes'
            });
        }
        
        // Cannot modify routes with drones in flight
        if (routeData.in_flight_count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify route with drones in flight'
            });
        }
        
        const { delivery_location, arrival_time } = req.body;
        
        // Build update query
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        if (delivery_location) {
            updates.push(`ending_point = $${paramCount}`);
            values.push(delivery_location);
            paramCount++;
        }
        
        if (arrival_time) {
            updates.push(`arrival_time = $${paramCount}`);
            values.push(arrival_time);
            paramCount++;
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }
        
        values.push(routeId);
        
        const updateQuery = `
            UPDATE route 
            SET ${updates.join(', ')}
            WHERE route_id = $${paramCount}
            RETURNING route_id, ending_point, arrival_time
        `;
        
        const result = await db.query(updateQuery, values);
        
        console.log(`Route ${routeId} updated successfully`);
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Route updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update route'
        });
    }
});

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: DELETE endpoint to cancel route.
* Validates route exists and is not in flight before allowing cancellation.
* Frees assigned drones by setting route_id to NULL and removes route from database.
* Functions Using This Method: Frontend route cancellation interface
* Description of Variables:
* @param {Object} req - Express request object with route id parameter
* @param {Object} res - Express response object with cancellation result
*/
router.delete('/:id', async (req, res) => {
    const client = await db.connect();
    
    try {
        const routeId = req.params.id;
        console.log(`DELETE /api/routes/${routeId} - Cancelling route`);
        
        await client.query('BEGIN');
        
        // Check if route exists first
        const routeExistsQuery = `SELECT route_id FROM route WHERE route_id = $1`;
        const routeExistsResult = await client.query(routeExistsQuery, [routeId]);
        
        if (routeExistsResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Route not found'
            });
        }
        
        // Check route status
        const checkQuery = `
            SELECT COUNT(d.drone_id) as assigned_drone_count,
                   COUNT(CASE WHEN d.location_id = '0' THEN 1 END) as in_flight_count
            FROM route r
            LEFT JOIN drone d ON r.route_id = d.route_id
            WHERE r.route_id = $1
        `;
        const checkResult = await client.query(checkQuery, [routeId]);
        
        const routeData = checkResult.rows[0];
        
        // Cannot cancel completed routes
        if (routeData.assigned_drone_count === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel completed routes'
            });
        }
        
        // Cannot cancel routes with drones in flight
        if (routeData.in_flight_count > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel route with drones in flight'
            });
        }
        
        // Free up drones
        const freeDronesQuery = `
            UPDATE drone 
            SET route_id = NULL
            WHERE route_id = $1
        `;
        const freeResult = await client.query(freeDronesQuery, [routeId]);
        
        // Delete the route
        const deleteRouteQuery = 'DELETE FROM route WHERE route_id = $1';
        await client.query(deleteRouteQuery, [routeId]);
        
        await client.query('COMMIT');
        
        console.log(`Route ${routeId} cancelled and ${freeResult.rowCount} drones freed`);
        
        res.json({
            success: true,
            data: {
                route_id: routeId,
                drones_freed: freeResult.rowCount
            },
            message: 'Route cancelled successfully'
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error cancelling route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel route'
        });
    } finally {
        client.release();
    }
});

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: POST endpoint to start route by launching drones.
* Sets all assigned drones to in-flight status by updating location_id to '0'.
* Validates route has assigned drones and none are already in flight.
* Functions Using This Method: Frontend route interface
* Description of Variables:
* @param {Object} req - Express request object with route id parameter
* @param {Object} res - Express response object with launch result
*/
router.post('/:id/start', async (req, res) => {
    const client = await db.connect();
    
    try {
        const routeId = req.params.id;
        console.log(`POST /api/routes/${routeId}/start - Starting route`);
        
        await client.query('BEGIN');
        
        // Check if route exists first
        const routeExistsQuery = `SELECT route_id FROM route WHERE route_id = $1`;
        const routeExistsResult = await client.query(routeExistsQuery, [routeId]);
        
        if (routeExistsResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Route not found'
            });
        }
        
        // Check if route has assigned drones and none are in flight
        const checkQuery = `
            SELECT COUNT(d.drone_id) as assigned_drone_count,
                   COUNT(CASE WHEN d.location_id = '0' THEN 1 END) as in_flight_count
            FROM drone d
            WHERE d.route_id = $1
        `;
        const checkResult = await client.query(checkQuery, [routeId]);
        
        if (checkResult.rows[0].assigned_drone_count === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Cannot start route with no assigned drones'
            });
        }
        
        if (checkResult.rows[0].in_flight_count > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Route already has drones in flight'
            });
        }
        
        // Set all assigned drones to in-flight
        const startDronesQuery = `
            UPDATE drone 
            SET location_id = '0'
            WHERE route_id = $1
        `;
        const droneResult = await client.query(startDronesQuery, [routeId]);
        
        await client.query('COMMIT');
        
        console.log(`Route ${routeId} started with ${droneResult.rowCount} drones launched`);
        
        res.json({
            success: true,
            data: {
                route_id: routeId,
                delivery_status: 'In-Transit',
                drones_launched: droneResult.rowCount,
                departure_time: new Date()
            },
            message: 'Route started - drones launched successfully'
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error starting route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start route'
        });
    } finally {
        client.release();
    }
});

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: POST endpoint to complete route delivery.
* Frees all assigned drones by setting route_id to NULL and location_id to 'BASE'.
* Functions Using This Method: Frontend route completion interface
* Description of Variables:
* @param {Object} req - Express request object with route id parameter
* @param {Object} res - Express response object with completion result
*/
router.post('/:id/complete', async (req, res) => {
    const client = await db.connect();
    
    try {
        const routeId = req.params.id;
        console.log(`POST /api/routes/${routeId}/complete - Completing route`);
        
        await client.query('BEGIN');
        
        // Check if route exists first
        const routeExistsQuery = `SELECT route_id FROM route WHERE route_id = $1`;
        const routeExistsResult = await client.query(routeExistsQuery, [routeId]);
        
        if (routeExistsResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Route not found'
            });
        }
        
        // Check if route has assigned drones
        const checkQuery = `
            SELECT COUNT(CASE WHEN d.location_id = '0' THEN 1 END) as in_flight_count,
                   COUNT(d.drone_id) as assigned_drone_count
            FROM drone d
            WHERE d.route_id = $1
        `;
        const checkResult = await client.query(checkQuery, [routeId]);
        
        if (checkResult.rows[0].assigned_drone_count === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Route is already completed'
            });
        }
        
        // Complete the delivery - free up all drones
        const completeDronesQuery = `
            UPDATE drone 
            SET route_id = NULL, location_id = 'BASE'
            WHERE route_id = $1
        `;
        const completeResult = await client.query(completeDronesQuery, [routeId]);
        
        await client.query('COMMIT');
        
        console.log(`Route ${routeId} completed - ${completeResult.rowCount} drones freed and returned to base`);
        
        res.json({
            success: true,
            data: {
                route_id: routeId,
                delivery_status: 'Completed',
                drones_freed: completeResult.rowCount
            },
            message: 'Route completed successfully - drones returned to base'
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error completing route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete route'
        });
    } finally {
        client.release();
    }
});

module.exports = router;