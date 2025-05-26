// Mock Products
class Product {
    constructor(product_id, name, weight, requires_cold = false) {
        this.product_id = product_id;
        this.name = name;
        this.weight = weight; // in kg
        this.requires_cold = requires_cold;
        this.category = 'General';
    }

    static getMockProducts() {
        return [
            new Product('PROD001', 'Medical Supplies', 2.5, true),
            new Product('PROD002', 'Electronics', 1.8, false),
            new Product('PROD003', 'Food Items', 3.2, true),
            new Product('PROD004', 'Documents', 0.5, false),
            new Product('PROD005', 'Pharmaceuticals', 1.2, true),
            new Product('PROD006', 'Books', 2.0, false),
            new Product('PROD007', 'Fresh Produce', 4.1, true),
            new Product('PROD008', 'Office Supplies', 1.5, false)
        ];
    }

    static getProductByName(name) {
        const products = this.getMockProducts();
        return products.find(product => product.name === name);
    }

    static calculateTotalWeight(productNames) {
        const products = this.getMockProducts();
        let totalWeight = 0;
        let requiresCold = false;

        productNames.forEach(name => {
            const product = products.find(p => p.name === name);
            if (product) {
                totalWeight += product.weight;
                if (product.requires_cold) requiresCold = true;
            }
        });

        return { totalWeight, requiresCold };
    }
}

module.exports = Product;