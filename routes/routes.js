const express = require('express');
const router = express.Router();
const db = require('../config/database');

const Order = require('../models/Order');
const Container = require('../models/Container');
const Drone = require('../models/Drone');
const Product = require('../models/Product');
const { ContainerAssignmentService, DynamicContainerAssignmentService, OneContainerPerOrderService } = require('../services/ContainerAssignmentService');

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Retrieves available drones and containers from database for order assignment.
 * Filters for drones not assigned to routes and containers with sufficient battery.
 * Creates drone objects with assignable container data for container assignment service.
 * Functions Using This Method: POST /api/routes (order creation)
 * Description of Variables:
 * @returns {Array} Array of drone objects with assignable containers
 */
async function getAvailableDrones() {
    try {
        const dronesQuery = `
            SELECT drone_id, battery_percentage, location_id
            FROM drone 
            WHERE route_id IS NULL AND battery_percentage > 20
            ORDER BY drone_id
        `;
        
        const dronesResult = await db.query(dronesQuery);
        
        const containersQuery = `
            SELECT container_id, max_capacity, battery_percentage,
                   CASE WHEN temperature IS NOT NULL THEN true ELSE false END as is_cold
            FROM container 
            WHERE drone_id IS NULL AND battery_percentage > 20
            ORDER BY max_capacity DESC, container_id
        `;
        
        const containersResult = await db.query(containersQuery);
        
        const availableDrones = [];
        
        dronesResult.rows.forEach((droneRow) => {
            const drone = new Drone(droneRow.drone_id);
            drone.battery_percentage = parseFloat(droneRow.battery_percentage);
            drone.current_location = droneRow.location_id;
            drone.status = 'Available';
            
            drone.assignableContainers = containersResult.rows.map(containerRow => ({
                container_id: containerRow.container_id,
                max_capacity: parseFloat(containerRow.max_capacity),
                battery_percentage: parseFloat(containerRow.battery_percentage),
                is_cold: containerRow.is_cold,
                is_charged: parseFloat(containerRow.battery_percentage) > 20
            }));
            
            availableDrones.push(drone);
        });
        
        return availableDrones;
        
    } catch (error) {
        console.error('Error fetching available drones and containers:', error);
        throw error;
    }
}

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Retrieves all routes with associated drone and container information for dashboard display.
 * Aggregates route data with location names, drone counts, and delivery status for frontend consumption.
 * Functions Using This Method: Frontend dashboard API calls
 * Description of Variables:
 * @param req - Express request object
 * @param res - Express response object containing formatted routes array
 */
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT r.route_id, 
                   ls.city as starting_city, ls.country as starting_country,
                   le.city as ending_city, le.country as ending_country,
                   COUNT(d.drone_id) as assigned_drone_count,
                   COUNT(CASE WHEN d.location_id = 0 THEN 1 END) as in_flight_count,
                   ARRAY_AGG(d.drone_id) FILTER (WHERE d.drone_id IS NOT NULL) as drone_ids,
                   ARRAY_AGG(c.container_id) FILTER (WHERE c.container_id IS NOT NULL) as container_ids,
                   SUM(c.max_capacity) as total_capacity,
                   MIN(d.departure_time) as earliest_departure,
                   MAX(d.arrival_time) as latest_arrival,
                   CASE 
                       WHEN COUNT(d.drone_id) = 0 THEN 'Completed'
                       WHEN COUNT(CASE WHEN d.location_id = 0 THEN 1 END) > 0 THEN 'In-Transit'
                       ELSE 'Processing'
                   END as route_status
            FROM route r
            LEFT JOIN location ls ON r.starting_point = ls.location_id
            LEFT JOIN location le ON r.ending_point = le.location_id
            LEFT JOIN drone d ON r.route_id = d.route_id
            LEFT JOIN container c ON d.drone_id = c.drone_id
            GROUP BY r.route_id, ls.city, ls.country, le.city, le.country
            ORDER BY r.route_id DESC
        `;
        
        const result = await db.query(query);
        
        const formattedRoutes = result.rows.map(route => ({
            order_id: route.route_id,
            container_status: route.assigned_drone_count > 0 ? 'Container Selected' : 'Container Pending',
            container_id: route.container_ids && route.container_ids.length > 0 ? 
                route.container_ids.join(', ') : 'N/A',
            order_status: route.route_status === 'Completed' ? 'Delivered' : 'On-Time',
            delivery_status: route.route_status,
            departure_time: route.earliest_departure ? 
                new Date(route.earliest_departure).toLocaleString() : null,
            estimated_arrival: route.latest_arrival ? 
                new Date(route.latest_arrival).toLocaleString() : null,
            delivery_location: `${route.ending_city}, ${route.ending_country}`,
            pickup_location: `${route.starting_city}, ${route.starting_country}`,
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
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Retrieves detailed information for a specific route including assigned drones and containers.
 * Returns route data with drone assignments for detailed route management.
 * Functions Using This Method: Frontend route detail views, route modification interface
 * Description of Variables:
 * @param req - Express request object containing route ID parameter
 * @param res - Express response object containing detailed route information
 */
router.get('/:id', async (req, res) => {
    try {
        const routeId = req.params.id;
        
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
                               'container_capacity', c.maximum_capacity,
                               'is_cold', CASE WHEN EXISTS (
                                   SELECT 1 FROM refrigerated_container rc WHERE rc.container_id = c.container_id
                               ) THEN true ELSE false END
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
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Creates new delivery route with product validation and container assignment.
 * Validates products against database, checks for mixed temperature orders, calculates weights,
 * assigns appropriate containers, and creates or reuses routes. Supports both individual products
 * and quantity-based orders with detailed error handling and transaction management.
 * Functions Using This Method: Frontend order creation interface
 * Description of Variables:
 * @param req - Express request object containing products, delivery_location, arrival_time, pickup_location
 * @param res - Express response object containing route creation results and assignments
 */
router.post('/', async (req, res) => {
    const client = await db.connect();
    
    try {
        await client.query('BEGIN');
        
        const { products, delivery_location, arrival_time, pickup_location } = req.body;
        
        if (!products || !delivery_location || !arrival_time) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: products, delivery_location, arrival_time'
            });
        }

        // Validate products against database
        const orderItems = [];
        let totalWeight = 0;
        let requiresCold = false;
        const invalidProducts = [];

        for (const productData of products) {
            const productName = typeof productData === 'string' ? productData : productData.name;
            const quantity = typeof productData === 'string' ? 1 : (productData.quantity || 1);

            if (quantity <= 0) {
                invalidProducts.push(`${productName} (invalid quantity: ${quantity})`);
                continue;
            }

            try {
                const productQuery = `
                    SELECT product_id, product_name, product_weight,
                           CASE 
                               WHEN minimum_temperature IS NOT NULL OR maximum_temperature IS NOT NULL 
                               THEN true 
                               ELSE false 
                           END as requires_cold
                    FROM product
                    WHERE LOWER(product_name) = LOWER($1)
                    LIMIT 1
                `;
                
                const productResult = await client.query(productQuery, [productName]);
                
                if (productResult.rows.length === 0) {
                    // Try fallback to mock products
                    const Product = require('../models/Product');
                    const mockProduct = Product.getProductByName(productName);
                    
                    if (!mockProduct) {
                        invalidProducts.push(productName);
                        continue;
                    }
                    
                    // Use mock product
                    const itemTotalWeight = mockProduct.unit_weight * quantity;
                    orderItems.push({
                        productName: mockProduct.name,
                        quantity: quantity,
                        unitWeight: mockProduct.unit_weight,
                        totalWeight: itemTotalWeight,
                        requiresCold: mockProduct.requires_cold
                    });
                    totalWeight += itemTotalWeight;
                    if (mockProduct.requires_cold) requiresCold = true;
                } else {
                    // Use database product data
                    const dbProduct = productResult.rows[0];
                    const unitWeight = parseFloat(dbProduct.product_weight);
                    const itemTotalWeight = unitWeight * quantity;
                    
                    orderItems.push({
                        productName: dbProduct.product_name,
                        quantity: quantity,
                        unitWeight: unitWeight,
                        totalWeight: itemTotalWeight,
                        requiresCold: dbProduct.requires_cold
                    });
                    totalWeight += itemTotalWeight;
                    if (dbProduct.requires_cold) requiresCold = true;
                }
            } catch (error) {
                console.error('Error validating product:', productName, error);
                invalidProducts.push(productName);
            }
        }

        // Check for invalid products
        if (invalidProducts.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Invalid products: ${invalidProducts.join(', ')}`,
                error_type: 'INVALID_PRODUCTS',
                details: { invalidProducts }
            });
        }

        // Check for mixed temperature orders
        const coldItems = orderItems.filter(item => item.requiresCold);
        const nonColdItems = orderItems.filter(item => !item.requiresCold);

        if (coldItems.length > 0 && nonColdItems.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: "Orders cannot contain both cold and non-cold items. Please place separate orders.",
                error_type: "MIXED_ORDER_NOT_ALLOWED",
                details: {
                    coldItems: coldItems.map(item => `${item.productName} (${item.quantity}x)`),
                    nonColdItems: nonColdItems.map(item => `${item.productName} (${item.quantity}x)`),
                    suggestion: "Create one order for cold items and another for non-cold items"
                }
            });
        }

        // Create order object with validated data
        const tempOrder = {
            total_weight: Math.round(totalWeight * 100) / 100,
            requires_cold: requiresCold,
            cold_weight: Math.round(coldItems.reduce((sum, item) => sum + item.totalWeight, 0) * 100) / 100,
            non_cold_weight: Math.round(nonColdItems.reduce((sum, item) => sum + item.totalWeight, 0) * 100) / 100,
            order_items: orderItems
        };

        console.log(`Order breakdown: Total: ${tempOrder.total_weight}kg, Cold: ${tempOrder.cold_weight}kg, Non-cold: ${tempOrder.non_cold_weight}kg`);
        console.log(`Items: ${orderItems.map(item => `${item.productName} (${item.quantity}x ${item.unitWeight}kg each)`).join(', ')}`);

        const availableDrones = await getAvailableDrones();
        
        if (availableDrones.length === 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                success: false,
                message: 'No available drones at this time'
            });
        }
        
        const assignments = OneContainerPerOrderService.assignContainerToOrder(tempOrder, availableDrones);
        
        if (!assignments) {
            const rejectionReason = OneContainerPerOrderService.getOrderRejectionReason(tempOrder, availableDrones);
            
            await client.query('ROLLBACK');
            return res.status(409).json({
                success: false,
                message: rejectionReason.message,
                error_type: rejectionReason.error,
                details: {
                    ...rejectionReason.details,
                    orderItems: orderItems.map(item => ({
                        product: item.productName,
                        quantity: item.quantity,
                        totalWeight: `${item.totalWeight}kg`
                    }))
                }
            });
        }

        // Get location IDs
        const startLocationQuery = `SELECT location_id FROM location WHERE city ILIKE $1 LIMIT 1`;
        const endLocationQuery = `SELECT location_id FROM location WHERE city ILIKE $1 LIMIT 1`;

        const startLocationResult = await client.query(startLocationQuery, [pickup_location || 'Barcelona']);
        const endLocationResult = await client.query(endLocationQuery, [delivery_location.split(',')[0].trim()]);

        const startLocationId = startLocationResult.rows[0]?.location_id || 1;
        const endLocationId = endLocationResult.rows[0]?.location_id || 2;

        // Check for existing route
        const existingRouteQuery = `
            SELECT route_id 
            FROM route 
            WHERE starting_point = $1 AND ending_point = $2 
            LIMIT 1
        `;

        const existingRouteResult = await client.query(existingRouteQuery, [startLocationId, endLocationId]);
        let routeId;

        if (existingRouteResult.rows.length > 0) {
            routeId = existingRouteResult.rows[0].route_id;
            console.log(`Reusing existing route ${routeId} for path ${startLocationId} → ${endLocationId}`);
        } else {
            const insertRouteQuery = `
                INSERT INTO route (starting_point, ending_point)
                VALUES ($1, $2)
                RETURNING route_id
            `;
            
            const routeResult = await client.query(insertRouteQuery, [startLocationId, endLocationId]);
            routeId = routeResult.rows[0].route_id;
        }

        // Assign containers and drones
        const timeOnly = new Date(arrival_time).toTimeString().split(' ')[0];
        const droneAssignments = [];
        
        for (const assignment of assignments) {
            const assignContainerQuery = `UPDATE container SET drone_id = $1 WHERE container_id = $2`;
            await client.query(assignContainerQuery, [assignment.drone.drone_id, assignment.container.container_id]);
            
            const updateDroneQuery = `UPDATE drone SET route_id = $1, arrival_time = $2 WHERE drone_id = $3`;
            await client.query(updateDroneQuery, [routeId, timeOnly, assignment.drone.drone_id]);
            
            droneAssignments.push({
                drone_id: assignment.drone.drone_id,
                container_id: assignment.container.container_id,
                weight_allocated: assignment.weight,
                type: assignment.type
            });
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            data: {
                route_id: routeId,
                route_reused: existingRouteResult.rows.length > 0,
                drone_assignments: droneAssignments,
                delivery_status: 'Processing',
                total_weight: tempOrder.total_weight,
                drone_count: droneAssignments.length,
                cold_weight: tempOrder.cold_weight,
                non_cold_weight: tempOrder.non_cold_weight,
                order_items: orderItems
            },
            message: existingRouteResult.rows.length > 0 ? 
                `Order assigned to existing route ${routeId}` : 
                `New route ${routeId} created`
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create route'
        });
    } finally {
        client.release();
    }
});

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Updates existing route delivery location and arrival time with validation.
 * Prevents modification of completed routes or routes with drones in flight for safety.
 * Functions Using This Method: Frontend route modification interface
 * Description of Variables:
 * @param req - Express request object containing route ID and update fields
 * @param res - Express response object containing update confirmation
 */
router.put('/:id', async (req, res) => {
    try {
        const routeId = req.params.id;
        
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
        
        if (routeData.assigned_drone_count === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify completed routes'
            });
        }
        
        if (routeData.in_flight_count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify route with drones in flight'
            });
        }
        
        const { delivery_location, arrival_time } = req.body;
        
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
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Cancels route and frees assigned drones with safety validation.
 * Prevents cancellation of completed routes or routes with drones in flight.
 * Uses database transactions to ensure data consistency during cancellation.
 * Functions Using This Method: Frontend route management interface
 * Description of Variables:
 * @param req - Express request object containing route ID to cancel
 * @param res - Express response object containing cancellation confirmation and freed drone count
 */
router.delete('/:id', async (req, res) => {
    const client = await db.connect();
    
    try {
        const routeId = req.params.id;
        await client.query('BEGIN');
        
        const checkQuery = `
            SELECT COUNT(d.drone_id) as assigned_drone_count,
                   COUNT(CASE WHEN d.location_id = '0' THEN 1 END) as in_flight_count
            FROM route r
            LEFT JOIN drone d ON r.route_id = d.route_id
            WHERE r.route_id = $1
        `;
        const checkResult = await client.query(checkQuery, [routeId]);
        
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Route not found'
            });
        }
        
        const routeData = checkResult.rows[0];
        
        if (routeData.assigned_drone_count === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel completed routes'
            });
        }
        
        if (routeData.in_flight_count > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel route with drones in flight'
            });
        }
        
        const freeDronesQuery = `UPDATE drone SET route_id = NULL WHERE route_id = $1`;
        const freeResult = await client.query(freeDronesQuery, [routeId]);
        
        const deleteRouteQuery = 'DELETE FROM route WHERE route_id = $1';
        await client.query(deleteRouteQuery, [routeId]);
        
        await client.query('COMMIT');
        
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
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Initiates route execution by launching assigned drones with safety validation.
 * Sets departure time and updates drone location to in-flight status (location_id = 0).
 * Prevents starting routes with no drones or routes already in progress.
 * Functions Using This Method: Frontend route management interface, drone launch operations
 * Description of Variables:
 * @param req - Express request object containing route ID to start
 * @param res - Express response object containing launch confirmation and drone count
 */
router.post('/:id/start', async (req, res) => {
    const client = await db.connect();
    
    try {
        const routeId = req.params.id;
        await client.query('BEGIN');
        
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
        
        const updateRouteQuery = `UPDATE route SET departure_time = NOW() WHERE route_id = $1`;
        await client.query(updateRouteQuery, [routeId]);
        
        const startDronesQuery = `UPDATE drone SET location_id = '0' WHERE route_id = $1`;
        const droneResult = await client.query(startDronesQuery, [routeId]);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            data: {
                route_id: routeId,
                delivery_status: 'In-Transit',
                drones_launched: droneResult.rowCount,
                departure_time: new Date()
            },
            message: 'Route started successfully'
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
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Completes route delivery by returning drones to base and freeing resources.
 * Updates drone status to location_id = 1 (base) and removes route assignment.
 * Marks delivery as completed and makes drones available for new assignments.
 * Functions Using This Method: Frontend route management interface, delivery completion operations
 * Description of Variables:
 * @param req - Express request object containing route ID to complete
 * @param res - Express response object containing completion confirmation and freed drone count
 */
router.post('/:id/complete', async (req, res) => {
    const client = await db.connect();
    
    try {
        const routeId = req.params.id;
        await client.query('BEGIN');
        
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
        
        const completeDronesQuery = `
            UPDATE drone 
            SET route_id = NULL, location_id = 1
            WHERE route_id = $1
        `;
        const completeResult = await client.query(completeDronesQuery, [routeId]);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            data: {
                route_id: routeId,
                delivery_status: 'Completed',
                drones_freed: completeResult.rowCount
            },
            message: 'Route completed successfully'
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