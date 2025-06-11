/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Creates container object with weight and temperature tracking.
 * Functions Using This Method: Drone constructor, container assignment
 * Description of Variables:
 * @param container_id - Container identifier
 * @param drone_id - Assigned drone identifier
 * @param max_weight_capacity - Maximum weight in kg
 */
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

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Checks if container can handle additional weight.
     * Functions Using This Method: Order assignment validation
     * Description of Variables:
     * @param additionalWeight - Weight to add in kg
     * @returns {boolean} True if weight fits
     */
    canAccommodateWeight(additionalWeight) {
        return (this.current_weight + additionalWeight) <= this.max_weight_capacity;
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Checks if container can handle order weight and temperature needs.
     * Functions Using This Method: Container assignment service
     * Description of Variables:
     * @param orderWeight - Order weight in kg
     * @param requiresCold - Whether order needs cold storage
     * @returns {boolean} True if container can handle order
     */
    canHandleOrder(orderWeight, requiresCold = false) {
        const weightCapacity = this.canAccommodateWeight(orderWeight);
        const temperature = !requiresCold || this.is_cold;
        const notFull = this.current_weight < this.max_weight_capacity;
        
        return weightCapacity && this.is_charged && temperature && notFull;
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Assigns container to order and updates weight and status.
     * Functions Using This Method: Container assignment service
     * Description of Variables:
     * @param order_id - Order identifier
     * @param weight - Weight to add in kg
     */
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

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Resets container to available state after delivery.
     * Functions Using This Method: Route completion operations
     * Description of Variables: None
     */
    completeDelivery() {
        this.status = 'Available';
        this.is_full = false;
        this.current_weight = 0.0;
        this.assigned_order_ids = [];
        this.last_updated = new Date();
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Calculates remaining weight capacity.
     * Functions Using This Method: Drone capacity checks, assignment validation
     * Description of Variables:
     * @returns {number} Available weight capacity in kg
     */
    getRemainingCapacity() {
        return this.max_weight_capacity - this.current_weight;
    }
}

module.exports = Container;