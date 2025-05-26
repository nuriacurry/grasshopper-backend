class Company {
    constructor(company_id, name) {
        this.company_id = company_id;
        this.name = name;
        this.created_at = new Date;

        // Relationships
        this.employee = []; // Array of Employee objects
        this.drones = []; // Array of Drone objects
        this.warehouses = []; // Array of Warehouse objects 

    }

    addEmployee(employee) {
        this.employee.push(employee);
        console.log(`Employee ${employee.name} added to ${this.name}`);
    }

    addDrone(drone) {
        this.drones.push(drone);
        console.log(`Drone ${drone.drone_id} added to ${this.name} fleet`);
    }

    removeDrone(drone_id) {
        this.drones = this.drones.filter(drone => drone.drone_id !== drone_id);
        console.log(`Drone ${drone_id} removed from ${this.name} fleet`);
    }

    viewFleet() {
        return this.drones;
    }

    getEmployeeCount() {
        return this.employees.length;
    }
}

module.exports = Company;