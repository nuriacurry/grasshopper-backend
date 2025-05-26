class Admin {
    constructor(admin_id, company_id, name, username, email) {
        this.admn_id = admin_id;
        this.company_id = company_id;
        this.oauth_key = null;
        this.name = name;
        this.username = username;
        this.password = null;
        this.email = email;
        this.created_at = new Date();
    }

    // Admin specifc methods
    manageUsers(users) {
        console.log(`${this.name} is managing ${users.length} users`);
        return users.filter(user => user.constructor.name != 'Admin'); // Can't manage other admins
    }

    approveSpecialCargo(pallet) {
        if (pallet.sensitivity != 'STANDARD') {
            pallet.status = 'APPROVED';
            console.log(`${this.name} approved special cargo: ${pallet.prodcut_name}`);
            return true;
        }
        return false;
    }

    viewAllDrones(company) {
        const drones = company.viewFleet();
        console.log(`{this.name} viewing all ${drones.length} drones`);
        return drones;
    }

    deleteUser(user_id, users) {
        console.log(`${this.name} deleted user ${user_id}`);
        return users.filter(user => user.employee_id !== user_id && user.admin_id !== user_id);
    }
}

module.exports = Admin;