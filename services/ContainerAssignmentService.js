class ContainerAssignmentService {
    static assignContainerToOrder(order, availableDrones) {
        console.log(`\n🔍 Finding container for order ${order.order_id}`);
        console.log(`Products: ${order.product_names.join(', ')}`);
        console.log(`Total weight: ${order.total_weight}kg`);

        // Calculate if cold storage is needed
        const Product = require('../models/Product');
        const { requiresCold } = Product.calculateTotalWeight(order.product_names);
        
        console.log(`Requires cold storage: ${requiresCold ? 'Yes' : 'No'}`);

        // Find suitable container
        for (let drone of availableDrones) {
            const suitableContainers = drone.containers.filter(container => 
                container.canHandleOrder(order, requiresCold)
            );

            if (suitableContainers.length > 0) {
                const selectedContainer = suitableContainers[0]; // Take first available
                order.assignContainer(selectedContainer);
                order.drone_id = drone.drone_id;
                
                console.log(`✅ Container ${selectedContainer.container_id} on drone ${drone.drone_id} assigned!`);
                console.log(`Container specs: Cold=${selectedContainer.is_cold}, Charged=${selectedContainer.is_charged}`);
                
                return selectedContainer;
            }
        }

        console.log(`❌ No suitable container found for order ${order.order_id}`);
        return null;
    }
}

module.exports = ContainerAssignmentService;