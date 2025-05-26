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
        console.log(`Employee ${employee.name} added to $`)
    }
}