-- Step 1: Create the database
CREATE DATABASE IF NOT EXISTS parkiq;

-- Step 2: Use it
USE parkiq;

-- Step 3: Create slots table
CREATE TABLE IF NOT EXISTS slots (
  id VARCHAR(5) PRIMARY KEY,
  status ENUM('available', 'occupied') NOT NULL DEFAULT 'available'
);

-- Step 4: Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  slot_id VARCHAR(5) NOT NULL,
  name VARCHAR(100) NOT NULL,
  vehicle VARCHAR(50) NOT NULL,
  type ENUM('Car', 'Bike', 'Van') NOT NULL,
  booked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (slot_id) REFERENCES slots(id)
);

INSERT IGNORE INTO slots (id, status) VALUES
  ('A1', 'available'),
  ('A2', 'available'),
  ('A3', 'available'),
  ('A4', 'available'),
  ('B1', 'available'),
  ('B2', 'available'),
  ('B3', 'available'),
  ('B4', 'available');

-- Done! Your database is ready.
SELECT 'Database setup complete!' AS message;
SELECT * FROM slots;
