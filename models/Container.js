class Container {
    constructor(container_id, drone_id) {
        this.container_id = container_id;
        this.drone_id = drone_id;
        
        // Container attributes (Y/N boolean values)
        this.is_cold = false;        // Cold capability (Y/N)
        this.is_full = false;        // Currently has products (Y/N)  
        this.is_charged = true;      // Battery charged (Y/N)
        
        // Assignment
        this.assigned_order_id = null;
        this.status = 'Available'; // Available, Assigned, In-Transit, Delivered
        
        this.last_updated = new Date();
    }

    // Check if container can handle the order requirements
    canHandleOrder(order, requiresCold = false) {
        const checks = {
            available: !this.is_full && this.assigned_order_id === null,
            charged: this.is_charged,
            temperature: !requiresCold || this.is_cold
        };
        
        return checks.available && checks.charged && checks.temperature;
    }

    // Assign container to an order
    assignToOrder(order_id) {
        this.assigned_order_id = order_id;
        this.is_full = true;
        this.status = 'Assigned';
        this.last_updated = new Date();
        console.log(`Container ${this.container_id} assigned to order ${order_id}`);
    }

    // Start transit
    startTransit() {
        this.status = 'In-Transit';
        this.last_updated = new Date();
    }

    // Complete delivery and reset container
    completeDelivery() {
        this.status = 'Available';
        this.is_full = false;
        this.assigned_order_id = null;
        this.last_updated = new Date();
        console.log(`Container ${this.container_id} delivered and reset`);
    }

    // Update container attributes
    updateAttributes(is_cold, is_full, is_charged) {
        this.is_cold = is_cold;
        this.is_full = is_full;
        this.is_charged = is_charged;
        this.last_updated = new Date();
    }
}

module.exports = Container;