const Container = require('./Container');

class Drone {
    constructor(drone_id, container_id, container_capacity = 10.0) {
        this.drone_id = drone_id;
        this.status = 'Available'; 
        this.current_location = 'Base';
        this.battery_percentage = 100;
        
        // Each drone has exactly one container
        this.container = new Container(container_id, drone_id, container_capacity);
        
        this.last_updated = new Date();
    }

    // Check if drone's container is available
    isAvailable() {
        return this.status === 'Available' && this.container.status === 'Available';
    }

    // Get remaining capacity of the container
    getRemainingCapacity() {
        return this.container.getRemainingCapacity();
    }

    // Check if this drone can handle an order
    canHandleOrder(orderWeight, requiresCold) {
        return this.isAvailable() && this.container.canHandleOrder(orderWeight, requiresCold);
    }

    // Start flight
    startFlight() {
        this.status = 'In-Flight';
        if (this.container.status === 'Assigned') {
            this.container.startTransit();
        }
        console.log(`Drone ${this.drone_id} started flight with container ${this.container.container_id}`);
    }

    // Land and complete delivery
    land() {
        this.status = 'Available';
        if (this.container.status === 'In-Transit') {
            this.container.completeDelivery();
        }
        console.log(`Drone ${this.drone_id} landed and completed delivery`);
    }
}

module.exports = Drone;