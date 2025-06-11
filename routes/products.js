const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Product = require('../models/Product');

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Retrieves all available products from database with temperature requirements and fallback to mock data.
 * Formats product data for frontend consumption including weight, cold storage needs, and categorization.
 * Provides automatic fallback to mock products if database is unavailable to ensure system reliability.
 * Functions Using This Method: Frontend product dropdown population, order creation interface
 * Description of Variables:
 * @param req - Express request object
 * @param res - Express response object containing formatted products array with id, name, weight, and temperature requirements
 */
router.get('/', async (req, res) => {
    try {
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
            message: `Retrieved ${formattedProducts.length} products`
        });
        
    } catch (error) {
        console.error('Error fetching products:', error);
        
        // Fallback to mock data
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
            message: `Retrieved ${products.length} fallback products`
        });
    }
});

module.exports = router;