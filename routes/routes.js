const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Import models
const Order = require('../models/Order');
const Container = require('../models/Container');
const Drone = require('../models/Drone');
const Product = require('../models/Product');
const ContainerAssignmentService = require('../services/ContainerAssignmentService');
const { DynamicContainerAssignmentService } = require('../services/ContainerAssignmentService');

// Helper function to get available drones from database
async function getAvailableDrones() {
    try {
        // Get drones that are available (not assigned to routes)
        const dronesQuery = `
            SELECT drone_id, battery_percentage, location_id
            FROM drone 
            WHERE route_id IS NULL AND battery_percentage > 20
            ORDER BY drone_id
        `;
        
        const dronesResult = await db.query(dronesQuery);
        console.log(`Found ${dronesResult.rows.length} available drones`);
        
        // Get available containers (not assigned to drones)
        const containersQuery = `
            SELECT container_id, max_capacity, battery_percentage,
                   CASE WHEN temperature IS NOT NULL THEN true ELSE false END as is_cold
            FROM container 
            WHERE drone_id IS NULL AND battery_percentage > 20
            ORDER BY max_capacity DESC, container_id
        `;
        
        const containersResult = await db.query(containersQuery);
        console.log(`Found ${containersResult.rows.length} available containers`);
        
        // Create drone objects with assignable containers
        const availableDrones = [];
        
        dronesResult.rows.forEach((droneRow, index) => {
            // For each drone, assign containers dynamically during order processing
            // For now, create drone objects that can accept container assignments
            const drone = new Drone(droneRow.drone_id);
            drone.battery_percentage = parseFloat(droneRow.battery_percentage);
            drone.current_location = droneRow.location_id;
            drone.status = 'Available';
            
            // Store available containers for assignment
            drone.assignableContainers = containersResult.rows.map(containerRow => ({
                container_id: containerRow.container_id,
                max_capacity: parseFloat(containerRow.max_capacity),
                battery_percentage: parseFloat(containerRow.battery_percentage),
                is_cold: containerRow.is_cold,
                is_charged: parseFloat(containerRow.battery_percentage) > 20
            }));
            
            availableDrones.push(drone);
        });
        
        console.log(`Created ${availableDrones.length} assignable drone-container combinations`);
        return availableDrones;
        
    } catch (error) {
        console.error('Error fetching available drones and containers:', error);
        throw error;
    }
}

// 1. GET /api/routes - Get all routes (customer orders) for dashboard
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/routes - Fetching all routes from database');

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
        
        // Format for frontend dashboard
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

// 2. GET /api/routes/:id - Get specific route
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

// 3. POST /api/routes - Create new route (customer order)
router.post('/', async (req, res) => {
    const client = await db.connect();
    
    try {
        console.log('POST /api/routes - Creating new route with dynamic container assignment');
        console.log('Request body:', req.body);
        
        await client.query('BEGIN');
        
        const { products, delivery_location, arrival_time, pickup_location } = req.body;
        
        if (!products || !delivery_location || !arrival_time) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: products, delivery_location, arrival_time'
            });
        }

        // Calculate order requirements
        const orderItems = products.map(productName => ({ productName, quantity: 1 }));
        const tempOrder = new Order(null, orderItems, delivery_location, new Date(arrival_time));
        
        // Get available drones and containers
        const availableDrones = await getAvailableDrones();
        
        if (availableDrones.length === 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                success: false,
                message: 'No available drones at this time'
            });
        }
        
        // Use dynamic container assignment
        const assignments = DynamicContainerAssignmentService.assignContainersToOrder(tempOrder, availableDrones);
        
        if (!assignments) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                success: false,
                message: 'No suitable drone-container combinations available',
                required_weight: tempOrder.total_weight,
                cold_required: tempOrder.requires_cold
            });
        }

        // Create route
        const startLocationQuery = `SELECT location_id FROM location WHERE city ILIKE $1 LIMIT 1`;
        const endLocationQuery = `SELECT location_id FROM location WHERE city ILIKE $1 LIMIT 1`;
        
        const startLocationResult = await client.query(startLocationQuery, [pickup_location || 'Barcelona']);
        const endLocationResult = await client.query(endLocationQuery, [delivery_location.split(',')[0].trim()]);
        
        const startLocationId = startLocationResult.rows[0]?.location_id || 1;
        const endLocationId = endLocationResult.rows[0]?.location_id || 2;
        
        const insertRouteQuery = `INSERT INTO route (starting_point, ending_point) VALUES ($1, $2) RETURNING route_id`;
        const routeResult = await client.query(insertRouteQuery, [startLocationId, endLocationId]);
        const routeId = routeResult.rows[0].route_id;

        // Assign drones to route AND assign containers to drones
        const droneAssignments = [];
        for (const assignment of assignments) {
            // 1. Assign container to drone
            const assignContainerQuery = `UPDATE container SET drone_id = $1 WHERE container_id = $2`;
            await client.query(assignContainerQuery, [assignment.drone.drone_id, assignment.container.container_id]);
            
            // 2. Assign drone to route
            const timeOnly = new Date(arrival_time).toTimeString().split(' ')[0]; // Gets "15:00:00"
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
        
        console.log(`Route ${routeId} created with ${droneAssignments.length} drone-container assignments`);
        
        res.status(201).json({
            success: true,
            data: {
                route_id: routeId,
                drone_assignments: droneAssignments,
                delivery_status: 'Processing',
                total_weight: tempOrder.total_weight,
                drone_count: droneAssignments.length,
                cold_weight: tempOrder.cold_weight,
                non_cold_weight: tempOrder.non_cold_weight
            },
            message: 'Route created with dynamic container assignments'
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating route with dynamic assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create route'
        });
    } finally {
        client.release();
    }
});

// 4. PUT /api/routes/:id - Update existing route
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
        
        // Cannot modify completed routes (no drones assigned)
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

// 5. DELETE /api/routes/:id - Cancel route
router.delete('/:id', async (req, res) => {
    const client = await db.connect();
    
    try {
        const routeId = req.params.id;
        console.log(`DELETE /api/routes/${routeId} - Cancelling route`);
        
        await client.query('BEGIN');
        
        // Check route status
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
        
        // Free up drones (set route_id to NULL)
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

// 6. POST /api/routes/:id/start - Start route (drones take off)
router.post('/:id/start', async (req, res) => {
    const client = await db.connect();
    
    try {
        const routeId = req.params.id;
        console.log(`POST /api/routes/${routeId}/start - Starting route`);
        
        await client.query('BEGIN');
        
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
        
        // Update route departure time
        const updateRouteQuery = `
            UPDATE route 
            SET departure_time = NOW()
            WHERE route_id = $1
        `;
        await client.query(updateRouteQuery, [routeId]);
        
        // Set all assigned drones to in-flight (location_id = '0')
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

// 7. POST /api/routes/:id/complete - Complete route (mark drones as delivered)
router.post('/:id/complete', async (req, res) => {
    const client = await db.connect();
    
    try {
        const routeId = req.params.id;
        console.log(`POST /api/routes/${routeId}/complete - Completing route`);
        
        await client.query('BEGIN');
        
        // Check if route has drones in flight
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
        
        // Complete the delivery - free up all drones (set route_id = NULL)
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