const Container = require('./Container');

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Creates drone object with assigned container and sets initial status.
 * Functions Using This Method: Route creation, drone assignment
 * Description of Variables:
 * @param drone_id - Drone identifier
 * @param container_id - Container assigned to drone
 * @param container_capacity - Maximum weight capacity in kg
 */
class Drone {
    constructor(drone_id, container_id, container_capacity = 350.0) {
        this.drone_id = drone_id;
        this.status = 'Available'; 
        this.current_location = 'Base';
        this.battery_percentage = 100;
        this.container = new Container(container_id, drone_id, container_capacity);
        this.last_updated = new Date();
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Checks if drone and container are both available for assignment.
     * Functions Using This Method: Container assignment service
     * Description of Variables:
     * @returns {boolean} True if drone can accept new orders
     */
    isAvailable() {
        return this.status === 'Available' && this.container.status === 'Available';
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Gets remaining weight capacity from drone's container.
     * Functions Using This Method: Container assignment, weight validation
     * Description of Variables:
     * @returns {number} Available weight capacity in kg
     */
    getRemainingCapacity() {
        return this.container.getRemainingCapacity();
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Checks if drone can handle order based on weight and temperature needs.
     * Functions Using This Method: Container assignment service
     * Description of Variables:
     * @param orderWeight - Total order weight in kg
     * @param requiresCold - Whether order needs cold storage
     * @returns {boolean} True if drone can handle the order
     */
    canHandleOrder(orderWeight, requiresCold) {
        return this.isAvailable() && this.container.canHandleOrder(orderWeight, requiresCold);
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Sets drone status to in-flight and starts container transit.
     * Functions Using This Method: Route start operations
     * Description of Variables: None
     */
    startFlight() {
        this.status = 'In-Flight';
        if (this.container.status === 'Assigned') {
            this.container.startTransit();
        }
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Sets drone status to available and completes container delivery.
     * Functions Using This Method: Route completion operations
     * Description of Variables: None
     */
    land() {
        this.status = 'Available';
        if (this.container.status === 'In-Transit') {
            this.container.completeDelivery();
        }
    }
}

module.exports = Drone;