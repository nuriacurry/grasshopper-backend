const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Product = require('../models/Product');

// GET /api/products 
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/products - Fetching available products');
        
        const query = `
            SELECT product_id, product_name, product_weight,
                   CASE 
                       WHEN minimum_temperature IS NOT NULL OR maximum_temperature IS NOT NULL 
                       THEN true 
                       ELSE false 
                   END as requires_cold
            FROM product
            ORDER BY product_name
        `;
        
        const result = await db.query(query);
        
        if (result.rows.length > 0) {
            const formattedProducts = result.rows.map(product => ({
                product_id: product.product_id,
                name: product.product_name,
                unit_weight: parseFloat(product.product_weight),
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
            // Fallback to mock data if database is empty
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

module.exports = router;