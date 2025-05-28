const Order = require('./models/Order');
const Container = require('./models/Container');
const Drone = require('./models/Drone');
const Product = require('./models/Product');
const ContainerAssignmentService = require('./services/ContainerAssignmentService');

console.log('Testing One-Container-Per-Drone System\n');

// Create drones (each with their own container)
const drone1 = new Drone('DRONE001', '35A', 5.0);  // 5kg capacity, no cold
drone1.container.is_cold = false;
drone1.container.is_charged = true;

const drone2 = new Drone('DRONE002', '67D', 8.0);  // 8kg capacity, cold
drone2.container.is_cold = true;
drone2.container.is_charged = true;

const drone3 = new Drone('DRONE003', '88E', 12.0); // 12kg capacity, cold
drone3.container.is_cold = true;
drone3.container.is_charged = true;

const availableDrones = [drone1, drone2, drone3];

console.log('Fleet Overview:');
availableDrones.forEach(drone => {
    console.log(`Drone ${drone.drone_id}: Container ${drone.container.container_id} (${drone.container.max_weight_capacity}kg, Cold: ${drone.container.is_cold})`);
});

// Test Case 1: Order that fits in one drone
console.log('\n=== TEST CASE 1: Small Order (fits in one drone) ===');
const smallOrder = new Order(
    'ORD001',
    [
        { productName: 'Medical Supplies', quantity: 1 }, // 2.5kg, needs cold
        { productName: 'Documents', quantity: 2 }         // 1.0kg
    ],
    'Barcelona, Spain',
    '2025-05-30T18:30:00'
);

console.log(`Small order: ${smallOrder.total_weight}kg, Cold needed: ${smallOrder.requires_cold}`);
ContainerAssignmentService.assignContainersToOrder(smallOrder, availableDrones);

// Test Case 2: Order that needs multiple drones
console.log('\n=== TEST CASE 2: Large Order (needs multiple drones) ===');
const largeOrder = new Order(
    'ORD002',
    [
        { productName: 'Heavy Equipment', quantity: 1 },  // 8.5kg
        { productName: 'Fresh Produce', quantity: 2 },   // 8.2kg  
        { productName: 'Medical Supplies', quantity: 1 }  // 2.5kg
    ],
    'Madrid, Spain',
    '2025-05-31T19:00:00'
);

console.log(`Large order: ${largeOrder.total_weight}kg, Cold needed: ${largeOrder.requires_cold}`);
ContainerAssignmentService.assignContainersToOrder(largeOrder, availableDrones);

// Test Case 3: Order that can't fit (exceeds capacity)
console.log('\n=== TEST CASE 3: Oversized Order (exceeds total capacity) ===');
const oversizedOrder = new Order(
    'ORD003',
    [
        { productName: 'Heavy Equipment', quantity: 4 }   // 34kg total
    ],
    'Valencia, Spain',
    '2025-06-01T10:00:00'
);

console.log(`Oversized order: ${oversizedOrder.total_weight}kg`);
const canFulfill = ContainerAssignmentService.canFulfillOrder(oversizedOrder, availableDrones);
console.log(`Can fulfill order: ${canFulfill ? 'Yes' : 'No'}`);

if (canFulfill) {
    ContainerAssignmentService.assignContainersToOrder(oversizedOrder, availableDrones);
} else {
    console.log('Order exceeds total fleet capacity');
}

// Test Case 4: Cold storage requirement with limited cold drones
console.log('\n=== TEST CASE 4: Cold Order with Limited Cold Capacity ===');
const coldOrder = new Order(
    'ORD004',
    [
        { productName: 'Frozen Goods', quantity: 3 }     // 18kg, needs cold
    ],
    'Seville, Spain',
    '2025-06-02T14:00:00'
);

console.log(`Cold order: ${coldOrder.total_weight}kg, Cold needed: ${coldOrder.requires_cold}`);
console.log(`Available cold capacity: ${availableDrones.filter(d => d.container.is_cold).reduce((sum, d) => sum + d.getRemainingCapacity(), 0)}kg`);
ContainerAssignmentService.assignContainersToOrder(coldOrder, availableDrones);

console.log('\n Final Fleet Status:');
availableDrones.forEach(drone => {
    const container = drone.container;
    console.log(`Drone ${drone.drone_id} (${container.container_id}): ${container.current_weight}/${container.max_weight_capacity}kg - ${container.status}`);
    if (container.assigned_order_ids.length > 0) {
        console.log(`  └─ Assigned to orders: ${container.assigned_order_ids.join(', ')}`);
    }
});

console.log('\n One-container-per-drone system test complete!');

// Summary
const totalCapacity = availableDrones.reduce((sum, d) => sum + d.container.max_weight_capacity, 0);
const totalUsed = availableDrones.reduce((sum, d) => sum + d.container.current_weight, 0);
const coldCapacity = availableDrones.filter(d => d.container.is_cold).reduce((sum, d) => sum + d.container.max_weight_capacity, 0);

console.log('\n Fleet Summary:');
console.log(`Total Capacity: ${totalCapacity}kg`);
console.log(`Currently Used: ${totalUsed}kg`);
console.log(`Available: ${totalCapacity - totalUsed}kg`);
console.log(`Cold Storage Capacity: ${coldCapacity}kg`);
console.log(`Number of Drones: ${availableDrones.length}`);