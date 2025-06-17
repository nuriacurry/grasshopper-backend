/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Product model constructor that creates product objects with weight and temperature requirements.
 * Stores product information including cold storage needs
 * Functions Using This Method: Mock product generation, product validation systems
 * Description of Variables:
 * @param product_id - Unique identifier for the product
 * @param name - Product name for display and identification
 * @param unit_weight - Weight per individual unit in kilograms
 * @param requires_cold - Boolean indicating if product needs cold storage
 * @param description - Product description for user information
 */
class Product {
    constructor(product_id, name, unit_weight, requires_cold = false, description = '') {
        this.product_id = product_id;
        this.name = name;
        this.unit_weight = unit_weight; // Weight per individual unit in kg
        this.requires_cold = requires_cold;
        this.description = description;
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Static method that returns array of predefined mock products for testing and fallback scenarios.
     * Provides product catalog with varied weights and temperature requirements for system testing.
     * Functions Using This Method: Product validation fallback, order requirement calculations, system testing
     * Description of Variables:
     * @returns {Array} Array of Product objects with diverse weight and temperatures
     */
    static getMockProducts() {
        return [
            new Product('PROD001', 'Medical Supplies', 2.5, true, 'Temperature-sensitive medical equipment'),
            new Product('PROD002', 'Electronics', 1.8, false, 'Consumer electronics and components'),
            new Product('PROD003', 'Food Items', 3.2, true, 'Perishable food products'),
            new Product('PROD004', 'Documents', 0.5, false, 'Important documents and papers'),
            new Product('PROD005', 'Pharmaceuticals', 1.2, true, 'Prescription medications'),
            new Product('PROD006', 'Books', 2.0, false, 'Educational materials and books'),
            new Product('PROD007', 'Fresh Produce', 4.1, true, 'Fresh fruits and vegetables'),
            new Product('PROD008', 'Office Supplies', 1.5, false, 'Stationery and office equipment'),
            new Product('PROD009', 'Heavy Equipment', 8.5, false, 'Industrial tools and machinery'),
            new Product('PROD010', 'Frozen Goods', 6.0, true, 'Frozen food products')
        ];
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Static method that searches mock products by name and returns matching product object.
     * Provides product lookup functionality for order validation when database is unavailable.
     * Functions Using This Method: Order validation systems, product requirement calculations
     * Description of Variables:
     * @param name - Product name to search for in mock products catalog
     * @returns {Product|undefined} Product object if found, undefined if not found
     */
    static getProductByName(name) {
        const products = this.getMockProducts();
        return products.find(product => product.name === name);
    }

    /***
     * Method Creation Date: 04/06/2025, Nuria Siddiqa
     * Most Recent Change: 04/06/2025, Nuria Siddiqa
     * Method Description: Static method that calculates total weight and temperature requirements for order items.
     * Processes order items
     * Provides order analysis for container assignment and planning.
     * Functions Using This Method: Order model constructor, order validation systems, container assignment
     * Description of Variables:
     * @param orderItems - Array of objects containing productName and quantity for each item
     * @returns {Object} Order requirements including totalWeight, requiresCold, itemDetails, and productCount
     */
    static calculateOrderRequirements(orderItems) {
        const products = this.getMockProducts();
        let totalWeight = 0;
        let requiresCold = false;
        const itemDetails = [];

        orderItems.forEach(item => {
            const product = products.find(p => p.name === item.productName);
            if (product) {
                const itemWeight = product.unit_weight * item.quantity;
                totalWeight += itemWeight;
                if (product.requires_cold) requiresCold = true;
                
                itemDetails.push({
                    productName: item.productName,
                    quantity: item.quantity,
                    unitWeight: product.unit_weight,
                    totalWeight: itemWeight,
                    requiresCold: product.requires_cold
                });
            }
        });

        return { 
            totalWeight, 
            requiresCold, 
            itemDetails,
            productCount: orderItems.length 
        };
    }
}

module.exports = Product;