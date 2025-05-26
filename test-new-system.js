const Order = require('./models/Order');
const Container = require('./models/Container');
const Drone = require('./models/Drone');
const Product = require('./models/Product');
const ContainerAssignmentService = require('./services/ContainerAssignmentService');

// Set up test data
console.log('🚀 Testing New Order Management System\n');

// Create drones with containers
const drone1 = new Drone('DRONE001');
const drone2 = new Drone('DRONE002');

// Add containers to drones
drone1.addContainer(new Container('35A', 'DRONE001')); // Regular container
drone1.containers[0].is_cold = false;
drone1.containers[0].is_charged = true;

drone1.addContainer(new Container('67D', 'DRONE001')); // Cold container
drone1.containers[1].is_cold = true;
drone1.containers[1].is_charged = true;

drone2.addContainer(new Container('88E', 'DRONE002')); // Cold container
drone2.containers[0].is_cold = true;
drone2.containers[0].is_charged = true;

const availableDrones = [drone1, drone2];

// Test orders from your UI mockup
console.log('📦 Creating test orders...\n');

const order1 = new Order(
    '56829348', 
    ['Medical Supplies'], 
    2.5, 
    'Coca Cola, Barcelona, Spain', 
    '2025-05-30T18:30:00'
);

const order2 = new Order(
    '85238767', 
    ['Electronics', 'Documents'], 
    2.3, 
    'Nestle, Barcelona, Spain', 
    '2025-05-31T17:00:00'
);

// Test container assignment
ContainerAssignmentService.assignContainerToOrder(order1, availableDrones);
ContainerAssignmentService.assignContainerToOrder(order2, availableDrones);

// Test order modifications
console.log('\n🔧 Testing order modifications...');
order2.modifyOrder('Henkel, Barcelona, Spain', '2025-05-31T19:00:00');

// Display final order status
console.log('\n📊 Final Order Status:');
console.log('Order 1:', {
    id: order1.order_id,
    container: order1.container_id,
    status: order1.delivery_status,
    location: order1.delivery_location
});

console.log('Order 2:', {
    id: order2.order_id,
    container: order2.container_id,
    status: order2.delivery_status,
    location: order2.delivery_location
});

console.log('\n🎉 System test complete!');