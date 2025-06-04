class Product {
    constructor(product_id, name, unit_weight, requires_cold = false, description = '') {
        this.product_id = product_id;
        this.name = name;
        this.unit_weight = unit_weight; // Weight per individual unit in kg
        this.requires_cold = requires_cold;
        this.description = description;
    }

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

    static getProductByName(name) {
        const products = this.getMockProducts();
        return products.find(product => product.name === name);
    }

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