class ContainerAssignmentService {
    static assignContainersToOrder(order, availableDrones) {
        console.log(`Finding containers for order ${order.order_id}`);
        console.log(`Total weight: ${order.total_weight}kg`);
        console.log(`Cold items: ${order.cold_weight}kg, Non-cold items: ${order.non_cold_weight}kg`);
        console.log(`Items:`, order.item_details);

        const assignedContainers = [];

        // Strategy: Assign cold items first (they have limited container options)
        // Then assign non-cold items to any available container
        
        // PHASE 1: Assign cold items to cold containers
        if (order.cold_weight > 0) {
            console.log(`\n PHASE 1: Assigning ${order.cold_weight}kg of cold items`);
            const coldAssignments = this.assignColdItems(order, availableDrones);
            assignedContainers.push(...coldAssignments);
        }

        // PHASE 2: Assign non-cold items to any available container
        if (order.getRemainingNonColdWeight() > 0) {
            console.log(`\n PHASE 2: Assigning ${order.getRemainingNonColdWeight()}kg of non-cold items`);
            const nonColdAssignments = this.assignNonColdItems(order, availableDrones);
            assignedContainers.push(...nonColdAssignments);
        }

        // Check final result
        const remainingWeight = order.getRemainingWeight();
        if (remainingWeight > 0.01) { // Account for floating point precision
            console.log(`Could not fully allocate order. Remaining weight: ${remainingWeight}kg`);
            console.log(`Need ${Math.ceil(remainingWeight)}kg more capacity`);
            return null;
        }

        console.log(`Order ${order.order_id} fully allocated across ${assignedContainers.length} assignments!`);
        console.log(`Assignment summary:`, assignedContainers.map(a => ({
            drone: a.drone.drone_id,
            container: a.container.container_id,
            weight: `${a.weight}kg`,
            type: a.type
        })));
        
        return assignedContainers;
    }

    // Phase 1: Assign cold items to cold-capable containers
    static assignColdItems(order, availableDrones) {
        let remainingColdWeight = order.cold_weight;
        const coldAssignments = [];

        while (remainingColdWeight > 0.01) { // Account for floating point precision
            console.log(`\n Still need to allocate: ${remainingColdWeight}kg of cold items`);
            
            // Get cold-capable drones with remaining capacity
            const coldDrones = availableDrones.filter(drone => {
                const hasCapacity = drone.getRemainingCapacity() > 0.01;
                const isCold = drone.container.is_cold;
                const isCharged = drone.container.is_charged;
                
                return hasCapacity && isCold && isCharged;
            });

            if (coldDrones.length === 0) {
                console.log(`No more cold containers available`);
                break;
            }

            // Sort by remaining capacity (largest first)
            coldDrones.sort((a, b) => b.getRemainingCapacity() - a.getRemainingCapacity());

            console.log(`Available cold drones:`, coldDrones.map(d => ({
                droneId: d.drone_id,
                containerId: d.container.container_id,
                remaining: `${d.getRemainingCapacity()}kg`
            })));

            // Assign to best available cold drone
            const bestDrone = coldDrones[0];
            const containerCapacity = bestDrone.getRemainingCapacity();
            const weightToAllocate = Math.round(Math.min(remainingColdWeight, containerCapacity) * 100) / 100;

            if (weightToAllocate > 0) {
                console.log(`Assigning ${weightToAllocate}kg cold items to drone ${bestDrone.drone_id}`);
                
                order.assignContainer(bestDrone.container, weightToAllocate, 'cold');
                coldAssignments.push({
                    drone: bestDrone,
                    container: bestDrone.container,
                    weight: weightToAllocate,
                    type: 'cold'
                });
                remainingColdWeight = Math.round((remainingColdWeight - weightToAllocate) * 100) / 100;

                console.log(`Assigned ${weightToAllocate}kg cold items to drone ${bestDrone.drone_id}`);
            } else {
                break;
            }
        }

        return coldAssignments;
    }

    // Phase 2: Assign non-cold items to any available container
    static assignNonColdItems(order, availableDrones) {
        let remainingNonColdWeight = order.getRemainingNonColdWeight();
        const nonColdAssignments = [];

        while (remainingNonColdWeight > 0.01) { // Account for floating point precision
            console.log(`\nStill need to allocate: ${remainingNonColdWeight}kg of non-cold items`);
            
            // Get ANY drones with remaining capacity (cold or non-cold)
            const availableAnyDrones = availableDrones.filter(drone => {
                const hasCapacity = drone.getRemainingCapacity() > 0.01;
                const isCharged = drone.container.is_charged;
                
                return hasCapacity && isCharged;
            });

            if (availableAnyDrones.length === 0) {
                console.log(`No more containers available`);
                break;
            }

            // Sort by remaining capacity (largest first)
            availableAnyDrones.sort((a, b) => b.getRemainingCapacity() - a.getRemainingCapacity());

            console.log(`Available drones for non-cold items:`, availableAnyDrones.map(d => ({
                droneId: d.drone_id,
                containerId: d.container.container_id,
                remaining: `${d.getRemainingCapacity()}kg`,
                cold: d.container.is_cold
            })));

            // Assign to best available drone
            const bestDrone = availableAnyDrones[0];
            const containerCapacity = bestDrone.getRemainingCapacity();
            const weightToAllocate = Math.round(Math.min(remainingNonColdWeight, containerCapacity) * 100) / 100;

            if (weightToAllocate > 0) {
                console.log(`Assigning ${weightToAllocate}kg non-cold items to drone ${bestDrone.drone_id}`);
                
                order.assignContainer(bestDrone.container, weightToAllocate, 'non-cold');
                nonColdAssignments.push({
                    drone: bestDrone,
                    container: bestDrone.container,
                    weight: weightToAllocate,
                    type: 'non-cold'
                });
                remainingNonColdWeight = Math.round((remainingNonColdWeight - weightToAllocate) * 100) / 100;

                console.log(`Assigned ${weightToAllocate}kg non-cold items to drone ${bestDrone.drone_id}`);
            } else {
                break;
            }
        }

        return nonColdAssignments;
    }

    // Helper method to check if an order can be fulfilled
    static canFulfillOrder(order, availableDrones) {
        // Check cold capacity
        const coldDrones = availableDrones.filter(drone => 
            drone.container.is_cold && drone.container.is_charged
        );
        const totalColdCapacity = coldDrones.reduce((sum, drone) => sum + drone.getRemainingCapacity(), 0);
        
        // Check total capacity
        const allDrones = availableDrones.filter(drone => drone.container.is_charged);
        const totalCapacity = allDrones.reduce((sum, drone) => sum + drone.getRemainingCapacity(), 0);
        
        console.log(`  Order feasibility check:`);
        console.log(`  Order needs: ${order.total_weight}kg (${order.cold_weight}kg cold, ${order.non_cold_weight}kg non-cold)`);
        console.log(`  Available cold capacity: ${totalColdCapacity}kg`);
        console.log(`  Available total capacity: ${totalCapacity}kg`);
        
        const canFulfillCold = order.cold_weight <= totalColdCapacity;
        const canFulfillTotal = order.total_weight <= totalCapacity;
        
        return canFulfillCold && canFulfillTotal;
    }

    // Method to get fleet status
    static getFleetStatus(drones) {
        return drones.map(drone => ({
            drone_id: drone.drone_id,
            container_id: drone.container.container_id,
            capacity: `${drone.container.current_weight}/${drone.container.max_weight_capacity}kg`,
            remaining: `${drone.getRemainingCapacity()}kg`,
            status: drone.container.status,
            is_cold: drone.container.is_cold,
            assigned_orders: drone.container.assigned_order_ids
        }));
    }
}

module.exports = ContainerAssignmentService;