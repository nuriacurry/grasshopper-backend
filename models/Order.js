const Product = require('./Product');

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Order model constructor that creates order objects with calculated weight requirements and temperature validation.
 * Automatically calculates total weight, cold/non-cold weight distribution, and sets initial status tracking.
 * Provides order breakdown logging for monitoring and debugging purposes.
 * Functions Using This Method: Route creation API, order validation systems
 * Description of Variables:
 * @param order_id - Unique identifier for the order
 * @param order_items - Array of products with quantities for weight calculation
 * @param delivery_location - Destination address for the order
 * @param arrival_time - Scheduled delivery time
 */
class Order {
    constructor(order_id, order_items, delivery_location, arrival_time) {
        this.order_id = order_id;
        this.order_items = order_items;
        this.delivery_location = delivery_location;
        this.arrival_time = arrival_time;
        this.departure_time = null;
        this.estimated_arrival = arrival_time;
        
        // Calculate requirements
        const requirements = Product.calculateOrderRequirements(order_items);
        this.total_weight = Math.round(requirements.totalWeight * 100) / 100;
        this.requires_cold = requirements.requiresCold;
        this.item_details = requirements.itemDetails;
        
        this.cold_weight = this.calculateColdWeight();
        this.non_cold_weight = this.calculateNonColdWeight();
        
        // Status tracking
        this.order_status = 'On-Time';
        this.delivery_status = 'Processing';
        this.container_status = 'Container Pending';
        this.created_at = new Date();
        
        console.log(`Order breakdown: Total: ${this.total_weight}kg, Cold: ${this.cold_weight}kg, Non-cold: ${this.non_cold_weight}kg`);
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Calculates total weight of cold storage items in the order.
     * Filters item details for cold storage requirements and sums their weights
     * Functions Using This Method: Order constructor, container assignment validation
     * Description of Variables:
     * @returns {number} Total weight of cold items in kilograms rounded to 2 decimal places
     */
    calculateColdWeight() {
        if (!this.item_details || this.item_details.length === 0) {
            return 0;
        }

        const coldWeight = this.item_details
            .filter(item => item.requiresCold)
            .reduce((sum, item) => sum + item.totalWeight, 0);
        
        return Math.round(coldWeight * 100) / 100;
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Calculates total weight of non-cold storage items in the order.
     * Filters item details for standard temperature items and sums their weights.
     * Functions Using This Method: Order constructor, container assignment validation
     * Description of Variables:
     * @returns {number} Total weight of non-cold items in kilograms rounded to 2 decimal places
     */
    calculateNonColdWeight() {
        if (!this.item_details || this.item_details.length === 0) {
            return 0;
        }

        const nonColdWeight = this.item_details 
            .filter(item => !item.requiresCold)
            .reduce((sum, item) => sum + item.totalWeight, 0);
        
        return Math.round(nonColdWeight * 100) / 100;
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Static validation method for order items that prevents mixed temperature orders.
     * Checks for presence of both cold and non-cold items which require separate deliveries.
     * Provides error information for frontend display and user guidance.
     * Functions Using This Method: Route creation API, order validation middleware
     * Description of Variables:
     * @param order_items - Array of order items to validate for temperature compatibility
     * @returns {Object} Validation result with success status and detailed error information if invalid
     */
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

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Initiates delivery process by updating order status to in-transit and recording departure time.
     * Functions Using This Method: Route start API, delivery management system
     * Description of Variables: None - status update method only
     */
    startDelivery() {
        this.delivery_status = 'In-Transit';
        this.departure_time = new Date();
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Marks order as successfully delivered by updating both delivery and order status.
     * Functions Using This Method: Route completion API, delivery management system
     * Description of Variables: None - status update method only
     */
    completeDelivery() {
        this.delivery_status = 'Delivered';
        this.order_status = 'Delivered';
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Updates order delivery location and arrival time with fallback to existing values.
     * Functions Using This Method: Route modification API, order management interface
     * Description of Variables:
     * @param newLocation - Updated delivery location or null to keep existing
     * @param newArrivalTime - Updated arrival time or null to keep existing
     */
    modifyOrder(newLocation, newArrivalTime) {
        this.delivery_location = newLocation || this.delivery_location;
        this.arrival_time = newArrivalTime || this.arrival_time;
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Cancels order by updating status to cancelled for both order and delivery tracking.
     * Functions Using This Method: Route cancellation API, order management interface
     * Description of Variables: None - status update method only
     */
    cancelOrder() {
        this.order_status = 'Cancelled';
        this.delivery_status = 'Cancelled';
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Checks if order is delayed by comparing current time with scheduled arrival time.
     * Updates order status to delayed if past due and not yet delivered for accurate tracking.
     * Functions Using This Method: Order monitoring systems, status update processes
     * Description of Variables: None - status checking method only
     */
    checkIfDelayed() {
        const now = new Date();
        if (now > new Date(this.arrival_time) && this.delivery_status !== 'Delivered') {
            this.order_status = 'Delayed';
        }
    }
}

module.exports = Order;