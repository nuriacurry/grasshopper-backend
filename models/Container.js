class Container {
    constructor(container_id, drone_id, max_weight_capacity = 10.0) { // Default 10kg capacity
        this.container_id = container_id;
        this.drone_id = drone_id;
        
        // Container attributes (Y/N boolean values)
        this.is_cold = false;        // Cold capability (Y/N)
        this.is_full = false;        // Currently has products (Y/N)  
        this.is_charged = true;      // Battery charged (Y/N)
        
        // Weight management
        this.max_weight_capacity = max_weight_capacity; // kg (e.g., 10kg)
        this.current_weight = 0.0;   // Current weight inside container
        this.available_weight = max_weight_capacity;    // Remaining capacity
        
        // Assignment
        this.assigned_order_ids = []; 
        this.status = 'Available';    // Available, Assigned, In-Transit, Delivered
        
        this.last_updated = new Date();
    }

    // Check if container can handle additional weight
    canAccommodateWeight(additionalWeight) {
        return (this.current_weight + additionalWeight) <= this.max_weight_capacity;
    }

    // Updated method to check if container can handle order requirements
    canHandleOrder(orderWeight, requiresCold = false) {
        const checks = {
            weightCapacity: this.canAccommodateWeight(orderWeight),
            charged: this.is_charged,
            temperature: !requiresCold || this.is_cold,
            notFull: this.current_weight < this.max_weight_capacity
        };
        
        console.log(`Container ${this.container_id} capacity check:`, {
            orderWeight,
            currentWeight: this.current_weight,
            maxCapacity: this.max_weight_capacity,
            canFit: checks.weightCapacity,
            requiresCold,
            hasCold: this.is_cold
        });
        
        return checks.weightCapacity && checks.charged && checks.temperature && checks.notFull;
    }

    // Assign container to an order (can be partial)
    assignToOrder(order_id, weight) {
        this.assigned_order_ids.push(order_id);
        this.current_weight += weight;
        this.available_weight = this.max_weight_capacity - this.current_weight;
        
        // Update status based on weight
        if (this.current_weight >= this.max_weight_capacity) {
            this.is_full = true;
            this.status = 'Full';
        } else {
            this.status = 'Partially_Filled';
        }
        
        this.last_updated = new Date();
        console.log(`Container ${this.container_id}: Added ${weight}kg, Total: ${this.current_weight}/${this.max_weight_capacity}kg`);
    }

    // Complete delivery and reset container
    completeDelivery() {
        this.status = 'Available';
        this.is_full = false;
        this.current_weight = 0.0;
        this.available_weight = this.max_weight_capacity;
        this.assigned_order_ids = [];
        this.last_updated = new Date();
        console.log(`Container ${this.container_id} delivered and reset`);
    }

    // Get remaining capacity
    getRemainingCapacity() {
        return this.max_weight_capacity - this.current_weight;
    }
}

module.exports = Container;