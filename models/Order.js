const Product = require('./Product');

class Order {
    constructor(order_id, order_items, delivery_location, arrival_time) {
        this.order_id = order_id;
        this.order_items = order_items; // [{ productName, quantity }, ...]
        this.delivery_location = delivery_location;
        this.arrival_time = arrival_time;
        this.departure_time = null;
        this.estimated_arrival = arrival_time;
        
        // Calculate requirements with detailed breakdown
        const requirements = Product.calculateOrderRequirements(order_items);
        this.total_weight = Math.round(requirements.totalWeight * 100) / 100; // Fix floating point
        this.requires_cold = requirements.requiresCold;
        this.item_details = requirements.itemDetails;
        
        // NEW: Separate cold and non-cold weights for mixed assignment
        this.cold_weight = Math.round(requirements.itemDetails
            .filter(item => item.requiresCold)
            .reduce((sum, item) => sum + item.totalWeight, 0) * 100) / 100;
        this.non_cold_weight = Math.round((this.total_weight - this.cold_weight) * 100) / 100;
        
        // Status tracking
        this.order_status = 'On-Time'; // On-Time, Delayed, Delivered
        this.delivery_status = 'Processing'; // Processing, In-Transit, Delivered
        this.container_status = 'Container Pending'; // Container Pending, Container Selected
        
        // Assigned resources (can be multiple containers now!)
        this.assigned_containers = []; // Array of {container_id, drone_id, weight_allocated, item_type}
        this.drone_ids = []; // Multiple drones if needed
        
        this.created_at = new Date();
        
        console.log(`📦 Order breakdown: Total: ${this.total_weight}kg, Cold: ${this.cold_weight}kg, Non-cold: ${this.non_cold_weight}kg`);
    }

    // Assign container to order (can be called multiple times)
    assignContainer(container, weightToAllocate, itemType = 'mixed') {
        const assignment = {
            container_id: container.container_id,
            drone_id: container.drone_id,
            weight_allocated: Math.round(weightToAllocate * 100) / 100, // Fix floating point
            item_type: itemType // 'cold', 'non-cold', or 'mixed'
        };
        
        this.assigned_containers.push(assignment);
        
        // Track unique drones
        if (!this.drone_ids.includes(container.drone_id)) {
            this.drone_ids.push(container.drone_id);
        }
        
        // Update status
        const totalAllocated = Math.round(this.assigned_containers.reduce((sum, c) => sum + c.weight_allocated, 0) * 100) / 100;
        if (totalAllocated >= this.total_weight) {
            this.container_status = 'Container Selected';
        } else {
            this.container_status = 'Partial Assignment';
        }
        
        container.assignToOrder(this.order_id, assignment.weight_allocated);
        console.log(`Container ${container.container_id} assigned ${assignment.weight_allocated}kg (${itemType}) to order ${this.order_id}`);
    }

    // Check if order is fully allocated to containers
    isFullyAllocated() {
        const totalAllocated = Math.round(this.assigned_containers.reduce((sum, c) => sum + c.weight_allocated, 0) * 100) / 100;
        return totalAllocated >= this.total_weight;
    }

    // Get remaining weight to allocate
    getRemainingWeight() {
        const totalAllocated = Math.round(this.assigned_containers.reduce((sum, c) => sum + c.weight_allocated, 0) * 100) / 100;
        return Math.round(Math.max(0, this.total_weight - totalAllocated) * 100) / 100;
    }

    // Get remaining cold weight to allocate
    getRemainingColdWeight() {
        const coldAllocated = Math.round(this.assigned_containers
            .filter(c => c.item_type === 'cold' || c.item_type === 'mixed')
            .reduce((sum, c) => sum + c.weight_allocated, 0) * 100) / 100;
        return Math.round(Math.max(0, this.cold_weight - coldAllocated) * 100) / 100;
    }

    // Get remaining non-cold weight to allocate
    getRemainingNonColdWeight() {
        const nonColdAllocated = Math.round(this.assigned_containers
            .filter(c => c.item_type === 'non-cold' || c.item_type === 'mixed')
            .reduce((sum, c) => sum + c.weight_allocated, 0) * 100) / 100;
        return Math.round(Math.max(0, this.non_cold_weight - nonColdAllocated) * 100) / 100;
    }

    // Start delivery
    startDelivery() {
        if (!this.isFullyAllocated()) {
            throw new Error('Cannot start delivery: Order not fully allocated to containers');
        }
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