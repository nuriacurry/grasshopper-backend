
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Product = require('../models/Product'); // Keep as fallback

// GET /api/products - Get all available products for dropdown
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/products - Fetching available products');
        
        // Try to get products from database first
        const query = `
            SELECT product_id, product_name, weight,
                   CASE 
                       WHEN refrigerated IS NOT NULL THEN true 
                       ELSE false 
                   END as requires_cold
            FROM product
            ORDER BY product_name
        `;
        
        const result = await db.query(query);
        
        if (result.rows.length > 0) {
            // Use database products
            const formattedProducts = result.rows.map(product => ({
                product_id: product.product_id,
                name: product.product_name,
                unit_weight: parseFloat(product.weight),
                requires_cold: product.requires_cold,
                description: `${product.requires_cold ? 'Refrigerated' : 'Standard'} product`,
                category: product.requires_cold ? 'Refrigerated' : 'Standard'
            }));
            
            res.json({
                success: true,
                data: formattedProducts,
                message: `Retrieved ${formattedProducts.length} products from database`
            });
        } else {
            // Fallback to mock products if database is empty
            console.log('No products in database, using mock data');
            const products = Product.getMockProducts();
            
            const formattedProducts = products.map(product => ({
                product_id: product.product_id,
                name: product.name,
                unit_weight: product.unit_weight,
                requires_cold: product.requires_cold,
                description: product.description,
                category: product.category
            }));
            
            res.json({
                success: true,
                data: formattedProducts,
                message: `Retrieved ${products.length} mock products`
            });
        }
        
    } catch (error) {
        console.error('Error fetching products from database, using mock data:', error);
        
        // Fallback to mock products on database error
        try {
            const products = Product.getMockProducts();
            
            const formattedProducts = products.map(product => ({
                product_id: product.product_id,
                name: product.name,
                unit_weight: product.unit_weight,
                requires_cold: product.requires_cold,
                description: product.description,
                category: product.category
            }));
            
            res.json({
                success: true,
                data: formattedProducts,
                message: `Retrieved ${products.length} fallback products`,
                note: 'Using mock data due to database error'
            });
        } catch (mockError) {
            console.error('Error with mock products:', mockError);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch products'
            });
        }
    }
});

// GET /api/products/:id - Get specific product details
router.get('/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        console.log(`GET /api/products/${productId} - Fetching specific product`);
        
        // Try database first
        const query = `
            SELECT product_id, product_name, weight,
                   CASE 
                       WHEN refrigerated IS NOT NULL THEN true 
                       ELSE false 
                   END as requires_cold
            FROM product
            WHERE product_id = $1
        `;
        
        const result = await db.query(query, [productId]);
        
        if (result.rows.length > 0) {
            const product = result.rows[0];
            
            res.json({
                success: true,
                data: {
                    product_id: product.product_id,
                    name: product.product_name,
                    unit_weight: parseFloat(product.weight),
                    requires_cold: product.requires_cold,
                    description: `${product.requires_cold ? 'Refrigerated' : 'Standard'} product`,
                    category: product.requires_cold ? 'Refrigerated' : 'Standard'
                },
                message: 'Product retrieved from database'
            });
        } else {
            // Try mock data as fallback
            const product = Product.getProductByName(productId);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            res.json({
                success: true,
                data: {
                    product_id: product.product_id,
                    name: product.name,
                    unit_weight: product.unit_weight,
                    requires_cold: product.requires_cold,
                    description: product.description,
                    category: product.category
                },
                message: 'Product retrieved from mock data'
            });
        }
        
    } catch (error) {
        console.error('Error fetching specific product:', error);
        
        // Try mock data fallback
        try {
            const product = Product.getProductByName(req.params.id);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            res.json({
                success: true,
                data: {
                    product_id: product.product_id,
                    name: product.name,
                    unit_weight: product.unit_weight,
                    requires_cold: product.requires_cold,
                    description: product.description,
                    category: product.category
                },
                message: 'Product retrieved from fallback data'
            });
        } catch (mockError) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product'
            });
        }
    }
});

// GET /api/products/name/:name - Get product by name (for your existing business logic)
router.get('/name/:name', async (req, res) => {
    try {
        const productName = req.params.name;
        console.log(`GET /api/products/name/${productName} - Fetching product by name`);
        
        // Try database first
        const query = `
            SELECT product_id, product_name, weight,
                   CASE 
                       WHEN refrigerated IS NOT NULL THEN true 
                       ELSE false 
                   END as requires_cold
            FROM product
            WHERE LOWER(product_name) = LOWER($1)
        `;
        
        const result = await db.query(query, [productName]);
        
        if (result.rows.length > 0) {
            const product = result.rows[0];
            
            res.json({
                success: true,
                data: {
                    product_id: product.product_id,
                    name: product.product_name,
                    unit_weight: parseFloat(product.weight),
                    requires_cold: product.requires_cold,
                    description: `${product.requires_cold ? 'Refrigerated' : 'Standard'} product`,
                    category: product.requires_cold ? 'Refrigerated' : 'Standard'
                },
                message: 'Product found in database'
            });
        } else {
            // Fallback to mock data
            const product = Product.getProductByName(productName);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            res.json({
                success: true,
                data: {
                    product_id: product.product_id,
                    name: product.name,
                    unit_weight: product.unit_weight,
                    requires_cold: product.requires_cold,
                    description: product.description,
                    category: product.category
                },
                message: 'Product found in mock data'
            });
        }
        
    } catch (error) {
        console.error('Error fetching product by name:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product'
        });
    }
});

module.exports = router;