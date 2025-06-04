const Container = require('./Container');

class Drone {
    constructor(drone_id, container_id, container_capacity = 350.0) {
        this.drone_id = drone_id;
        this.status = 'Available'; 
        this.current_location = 'Base';
        this.battery_percentage = 100;
        this.container = new Container(container_id, drone_id, container_capacity);
        this.last_updated = new Date();
    }

    isAvailable() {
        return this.status === 'Available' && this.container.status === 'Available';
    }

    getRemainingCapacity() {
        return this.container.getRemainingCapacity();
    }

    canHandleOrder(orderWeight, requiresCold) {
        return this.isAvailable() && this.container.canHandleOrder(orderWeight, requiresCold);
    }

    startFlight() {
        this.status = 'In-Flight';
        if (this.container.status === 'Assigned') {
            this.container.startTransit();
        }
    }

    land() {
        this.status = 'Available';
        if (this.container.status === 'In-Transit') {
            this.container.completeDelivery();
        }
    }
}

module.exports = Drone;