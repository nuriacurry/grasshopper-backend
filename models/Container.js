class Container {
    constructor(container_id, drone_id, max_weight_capacity = 350.0) {
        this.container_id = container_id;
        this.drone_id = drone_id;
        
        // Container attributes
        this.is_cold = false;
        this.is_full = false;
        this.is_charged = true;
        
        // Weight management
        this.max_weight_capacity = max_weight_capacity;
        this.current_weight = 0.0;
        
        // Assignment tracking
        this.assigned_order_ids = [];
        this.status = 'Available';
        this.last_updated = new Date();
    }

    canAccommodateWeight(additionalWeight) {
        return (this.current_weight + additionalWeight) <= this.max_weight_capacity;
    }

    canHandleOrder(orderWeight, requiresCold = false) {
        const weightCapacity = this.canAccommodateWeight(orderWeight);
        const temperature = !requiresCold || this.is_cold;
        const notFull = this.current_weight < this.max_weight_capacity;
        
        return weightCapacity && this.is_charged && temperature && notFull;
    }

    assignToOrder(order_id, weight) {
        this.assigned_order_ids.push(order_id);
        this.current_weight += weight;
        
        if (this.current_weight >= this.max_weight_capacity) {
            this.is_full = true;
            this.status = 'Full';
        } else {
            this.status = 'Partially_Filled';
        }
        
        this.last_updated = new Date();
    }

    completeDelivery() {
        this.status = 'Available';
        this.is_full = false;
        this.current_weight = 0.0;
        this.assigned_order_ids = [];
        this.last_updated = new Date();
    }

    getRemainingCapacity() {
        return this.max_weight_capacity - this.current_weight;
    }
}

module.exports = Container;