require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Use timestamp + original extension to avoid duplicate names
        const ext = path.extname(file.originalname);
        cb(null, `product_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
        ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir)); // Serve uploaded images
app.use(express.static('./')); // Serve the frontend from the same directory

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: 3306, // MySQL port
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'pos_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Connected to MySQL database');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Failed to connect to MySQL:', err.message);
        console.log('Please make sure your MySQL server is running and the database pos_system is created.');
    });

// ==========================================
// API Routes
// ==========================================

// 0. Upload product image
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return the public URL for this image
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});

// 1. Get all products
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
        // Convert prices from string to number before sending to frontend
        const products = rows.map(p => ({
            ...p,
            price: parseFloat(p.price)
        }));
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Add new product
app.post('/api/products', async (req, res) => {
    try {
        const { barcode, name, price, category, image } = req.body;

        // Basic validation
        if (!name || price === undefined || !category) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const query = 'INSERT INTO products (barcode, name, price, category, image) VALUES (?, ?, ?, ?, ?)';
        const [result] = await pool.query(query, [barcode || null, name, price, category, image || null]);

        res.status(201).json({ id: result.insertId, message: 'Product created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error, perhaps duplicate barcode?' });
    }
});

// 3. Update existing product
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { barcode, name, price, category, image } = req.body;

        const query = 'UPDATE products SET barcode=?, name=?, price=?, category=?, image=? WHERE id=?';
        const [result] = await pool.query(query, [barcode || null, name, price, category, image || null, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. Delete product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM products WHERE id=?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// ==========================================
// Start Server
// ==========================================
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
