class Order {
    constructor(order_id, product_names, total_weight, delivery_location, arrival_time) {
        this.order_id = order_id;
        this.product_names = product_names; // Array of product names
        this.total_weight = total_weight;
        this.delivery_location = delivery_location;
        this.arrival_time = arrival_time;
        this.departure_time = null;
        this.estimated_arrival = arrival_time;
        
        // Status tracking
        this.order_status = 'On-Time'; // On-Time, Delayed, Delivered
        this.delivery_status = 'Processing'; // Processing, In-Transit, Delivered
        this.container_status = 'Container Pending'; // Container Pending, Container Selected
        
        // Assigned resources
        this.container_id = null;
        this.drone_id = null;
        
        this.created_at = new Date();
    }

    // Assign container to order
    assignContainer(container) {
        this.container_id = container.container_id;
        this.container_status = 'Container Selected';
        container.assignToOrder(this.order_id);
        console.log(`Container ${container.container_id} assigned to order ${this.order_id}`);
    }

    // Start delivery (drone takes off)
    startDelivery() {
        this.delivery_status = 'In-Transit';
        this.departure_time = new Date();
        console.log(`Order ${this.order_id} departed at ${this.departure_time}`);
    }

    // Complete delivery
    completeDelivery() {
        this.delivery_status = 'Delivered';
        this.order_status = 'Delivered';
        console.log(`Order ${this.order_id} delivered successfully`);
    }

    // Modify order (location/time)
    modifyOrder(newLocation, newArrivalTime) {
        this.delivery_location = newLocation || this.delivery_location;
        this.arrival_time = newArrivalTime || this.arrival_time;
        console.log(`Order ${this.order_id} modified - Location: ${this.delivery_location}, Time: ${this.arrival_time}`);
    }

    // Cancel order
    cancelOrder() {
        this.order_status = 'Cancelled';
        this.delivery_status = 'Cancelled';
        // Free up the container
        if (this.container_id) {
            // Logic to free container would go here
        }
        console.log(`Order ${this.order_id} cancelled`);
    }

    // Check if order is delayed
    checkIfDelayed() {
        const now = new Date();
        if (now > new Date(this.arrival_time) && this.delivery_status !== 'Delivered') {
            this.order_status = 'Delayed';
        }
    }
}

module.exports = Order;