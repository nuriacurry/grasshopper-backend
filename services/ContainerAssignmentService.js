class OneContainerPerOrderService {
    static assignContainerToOrder(order, availableDrones) {
        const maxContainerCapacity = 350; // kg - from database schema
        
        // Weight validation
        if (order.total_weight > maxContainerCapacity) {
            return null;
        }
        
        // Find suitable drone-container pairs
        const suitablePairs = [];
        availableDrones.forEach(drone => {
            drone.assignableContainers.forEach(container => {
                const temperatureMatch = order.requires_cold ? container.is_cold : true;
                const capacityMatch = container.max_capacity >= order.total_weight;
                const batteryOk = container.is_charged;
                
                if (temperatureMatch && capacityMatch && batteryOk) {
                    suitablePairs.push({
                        drone: drone,
                        container: container
                    });
                }
            });
        });
        
        if (suitablePairs.length === 0) {
            return null;
        }
        
        // Sort by capacity (largest first) for optimal space usage
        suitablePairs.sort((a, b) => b.container.max_capacity - a.container.max_capacity);
        
        const selectedPair = suitablePairs[0];
        
        console.log(`Assigned order to drone ${selectedPair.drone.drone_id}, container ${selectedPair.container.container_id} (${selectedPair.container.max_capacity}kg capacity)`);
        
        return [{
            drone: selectedPair.drone,
            container: selectedPair.container,
            weight: order.total_weight,
            type: order.requires_cold ? 'cold' : 'standard'
        }];
    }
    
    static canFulfillOrder(order, availableDrones) {
        const maxContainerCapacity = 350;
        
        if (order.total_weight > maxContainerCapacity) {
            return false;
        }
        
        let suitableContainers = 0;
        availableDrones.forEach(drone => {
            drone.assignableContainers.forEach(container => {
                const temperatureMatch = order.requires_cold ? container.is_cold : true;
                const capacityMatch = container.max_capacity >= order.total_weight;
                const batteryOk = container.is_charged;
                
                if (temperatureMatch && capacityMatch && batteryOk) {
                    suitableContainers++;
                }
            });
        });
        
        return suitableContainers > 0;
    }
    
    static getOrderRejectionReason(order, availableDrones) {
        const maxContainerCapacity = 350;
        
        if (order.total_weight > maxContainerCapacity) {
            return {
                error: 'ORDER_TOO_HEAVY',
                message: `Order weight (${order.total_weight}kg) exceeds maximum container capacity (${maxContainerCapacity}kg). Please reduce quantity or split into multiple orders.`,
                details: {
                    orderWeight: order.total_weight,
                    maxCapacity: maxContainerCapacity
                }
            };
        }
        
        if (order.requires_cold) {
            const coldContainers = availableDrones.reduce((count, drone) => 
                count + drone.assignableContainers.filter(c => 
                    c.is_cold && c.is_charged && c.max_capacity >= order.total_weight
                ).length, 0);
            
            if (coldContainers === 0) {
                return {
                    error: 'NO_COLD_STORAGE',
                    message: 'No refrigerated containers available with sufficient capacity. Cold storage orders require specialized containers.',
                    details: {
                        requiresCold: true,
                        availableColdContainers: coldContainers
                    }
                };
            }
        }
        
        const availableContainers = availableDrones.reduce((count, drone) => 
            count + drone.assignableContainers.filter(c => 
                c.is_charged && c.max_capacity >= order.total_weight
            ).length, 0);
        
        if (availableContainers === 0) {
            return {
                error: 'NO_CAPACITY',
                message: 'All drones are currently assigned to other deliveries. Please try again later or contact support.',
                details: {
                    totalDrones: availableDrones.length,
                    availableContainers: availableContainers
                }
            };
        }
        
        return {
            error: 'UNKNOWN',
            message: 'Unable to assign container to order. Please contact support.',
            details: {}
        };
    }
}

module.exports = { OneContainerPerOrderService };