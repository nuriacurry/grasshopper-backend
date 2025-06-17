const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Product = require('../models/Product');

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: Gets product by name from database
* Searches for product using case-insensitive name matching.
* Returns formatted product data 
* Functions Using This Method: Product lookup, order validation in routes
* Description of Variables:
* @param {Object} req - Express request object with name parameter
* @param {Object} res - Express response object with product data or error
*/
router.get('/name/:name', async (req, res) => {
    try {
        const productName = req.params.name;
        console.log(`GET /api/products/name/${productName} - Getting product by name`);
        
        const query = `
            SELECT product_id, product_name, product_weight,
                   CASE 
                       WHEN minimum_temperature IS NOT NULL THEN true 
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
                    unit_weight: parseFloat(product.product_weight),
                    requires_cold: product.requires_cold,
                    description: `${product.requires_cold ? 'Cold storage' : 'Standard'} product`,
                    category: product.requires_cold ? 'Cold' : 'Standard'
                },
                message: 'Product found in database'
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
    } catch (error) {
        console.error('Error getting product by name:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product'
        });
    }
});

/***
* Method Creation Date: 11/6/2025, Nuria Siddiqa
* Most Recent Change: 11/6/2025, Nuria Siddiqa
* Method Description: Gets product by ID from database
* Searches for product using product_id primary key.
* Returns product data with temperature requirements.
* Functions Using This Method: Product details view in frontend
* Description of Variables:
* @param {Object} req - Express request object with id parameter
* @param {Object} res - Express response object with product data or error
*/
router.get('/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        console.log(`GET /api/products/${productId} - Getting product by ID`);
        
        const query = `
            SELECT product_id, product_name, product_weight,
                   CASE 
                       WHEN minimum_temperature IS NOT NULL THEN true 
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
                    unit_weight: parseFloat(product.product_weight),
                    requires_cold: product.requires_cold,
                    description: `${product.requires_cold ? 'Cold storage' : 'Standard'} product`,
                    category: product.requires_cold ? 'Cold' : 'Standard'
                },
                message: 'Product found in database'
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
    } catch (error) {
        console.error('Error getting product by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product'
        });
    }
});

/***
 * Method Creation Date: 04/06/2025, Nuria Siddiqa
 * Most Recent Change: 04/06/2025, Nuria Siddiqa
 * Method Description: Retrieves all available products from database and fallback to mock data.
 * Formats product data for frontend
 * Provides automatic fallback to mock products if database is unavailable
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