class Drone {
    constructor(drone_id) {
        this.drone_id = drone_id;
        this.status = 'Available'; // Available, In-Flight, Maintenance
        this.current_location = 'Base'; // Current location
        this.battery_percentage = 100;
        
        // Containers this drone carries
        this.containers = [];
        
        this.last_updated = new Date();
    }

    // Add container to drone
    addContainer(container) {
        this.containers.push(container);
        container.drone_id = this.drone_id;
        console.log(`Container ${container.container_id} added to drone ${this.drone_id}`);
    }

    // Get available containers
    getAvailableContainers() {
        return this.containers.filter(container => 
            container.status === 'Available' && !container.is_full
        );
    }

    // Start flight
    startFlight() {
        this.status = 'In-Flight';
        this.containers.forEach(container => {
            if (container.status === 'Assigned') {
                container.startTransit();
            }
        });
        console.log(`Drone ${this.drone_id} started flight`);
    }

    // Land and complete deliveries
    land() {
        this.status = 'Available';
        this.containers.forEach(container => {
            if (container.status === 'In-Transit') {
                container.completeDelivery();
            }
        });
        console.log(`Drone ${this.drone_id} landed and completed deliveries`);
    }
}

module.exports = Drone;