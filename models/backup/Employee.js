class Employee {
    contructor(employee_id, name, username, email) {
        this.employee_id = employee_id;
        this.company_id = company_id;
        this.oauth_key = null;  // Will be set during Google OAuth
        this.name = name;
        this.username = username;
        this.password = null; // Handled by OAuth
        this.email = email;
        this.created_at = new Date();
    }

    trackDrones(company) {
        const drones = company.viewFleet();
        console.log(`${this.name} is tracking ${drones.length} drones`);
        return drones;
    }

     placeOrder(pallet) {
        console.log(`${this.name} placed order for ${pallet.product_name}`);
        // Logic for placing orders will go here
    }

    viewContainers(drone) {
        console.log(`${this.name} is viewing containers for drone ${drone.drone_id}`);
        // Return container information
    }

    updateProfile(newInfo) {
        Object.assign(this, newInfo);
        console.log(`${this.name} updated their profile`);
    }
}

module.exports = Employee;