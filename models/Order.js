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
        
        this.cold_weight = this.calculateColdWeight();
        this.non_cold_weight = this.calculateNonColdWeight();

        const mixedOrderError = this.validateOrderTypes();
        if (mixedOrderError) {
            throw new Error(mixedOrderError);
        }
        
        // Status tracking
        this.order_status = 'On-Time'; // On-Time, Delayed, Delivered
        this.delivery_status = 'Processing'; // Processing, In-Transit, Delivered
        this.container_status = 'Container Pending'; // Container Pending, Container Selected
        
        this.created_at = new Date();
        
        console.log(`Order breakdown: Total: ${this.total_weight}kg, Cold: ${this.cold_weight}kg, Non-cold: ${this.non_cold_weight}kg`);
    }

    calculateColdWeight() {
        if (!this.item_details || this.item_details.length === 0) {
            return 0;
        }

        const coldWeight = this.item_details
            .filter(item => item.requiresCold)
            .reduce((sum,item) => sum + item.totalWeight, 0);
        
        return Math.round(coldWeight * 100) / 100; // Round to 2 decimals
    }

    calculateNonColdWeight() {
        if (!this.item_details || this.item_details_length === 0) {
            return 0;
        }

        const nonColdWeight = this.item_details 
            .filter(item => !item.requiresCold)
            .reduce((sum, item) => sum + item.totalWeight, 0)
        
        return Math.round(nonColdWeight * 100) / 100; // Round to 2 decimals
    }

    validateOrderTypes() {
        if (!this.item_details || this.item_details.length === 0) {
            return null; // No items to validate
        }

        const coldItems = this.item_details.filter(item => item.requiresCold);
        const nonColdItems = this.item_details.filter(item => !item.requiresCold);

        // Check if we have both cold and non-cold items (MIXED ORDER - NOT ALLOWED)
        if (coldItems.length > 0 && nonColdItems.length > 0) {
            const coldItemNames = coldItems.map(item => item.productName).join(', ');
            const nonColdItemNames = nonColdItems.map(item => item.productName).join(', ');
            
            return `Mixed temperature orders not allowed. Cold items: ${coldItemNames}. Non-cold items: ${nonColdItemNames}. Please place separate orders for cold and non-cold items.`;
        }

        return null; // Order is valid (all cold OR all non-cold)
    }

    static validateOrderItems(order_items) {
        const requirements = Product.calculateOrderRequirements(order_items);
        
        if (!requirements.itemDetails || requirements.itemDetails.length === 0) {
            return { valid: false, error: "No valid products found in order" };
        }

        const coldItems = requirements.itemDetails.filter(item => item.requiresCold);
        const nonColdItems = requirements.itemDetails.filter(item => !item.requiresCold);

        // Check for mixed orders
        if (coldItems.length > 0 && nonColdItems.length > 0) {
            return {
                valid: false,
                error: "MIXED_ORDER_NOT_ALLOWED",
                message: "Orders cannot contain both cold and non-cold items. Please place separate orders.",
                details: {
                    coldItems: coldItems.map(item => item.productName),
                    nonColdItems: nonColdItems.map(item => item.productName),
                    suggestion: "Create one order for cold items and another for non-cold items"
                }
            };
        }

        return { valid: true };
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