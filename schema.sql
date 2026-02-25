-- Run this file in your MySQL database to create the necessary tables

CREATE DATABASE IF NOT EXISTS pos_system;
USE pos_system;

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    barcode VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    image VARCHAR(500)
);


-- Insert Default Grocery Data
INSERT IGNORE INTO products (barcode, name, price, category, image) VALUES
('8850029302114', 'Singha Drinking Water 600ml', 10.00, 'beverages', 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&q=80'),
('8850111162464', 'Lay''s Classic Potato Chips 50g', 20.00, 'snacks', 'https://images.unsplash.com/photo-1566478989037-e124c68e9e19?w=300&q=80'),
('8851111101925', 'M Mama Instant Noodles Tom Yum', 7.00, 'grocery', 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&q=80'),
('8850006501166', 'Colgate Toothpaste 150g', 45.00, 'personal', 'https://images.unsplash.com/photo-1553181816-ce2276c1dc9f?w=300&q=80'),
('8851932230058', 'Oishi Green Tea Original 500ml', 20.00, 'beverages', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&q=80'),
('8850987123992', 'Parrot Botanical Bar Soap', 15.00, 'personal', 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=300&q=80'),
('8850123984711', 'Thai Jasmine Rice 1kg', 55.00, 'grocery', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&q=80');

