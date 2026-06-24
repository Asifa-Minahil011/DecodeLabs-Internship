
const express = require("express");
const cors    = require("cors");
const mysql   = require("mysql2/promise");

const app  = express();
const PORT = 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host:     "localhost",
  user:     "root",
  password: "asifa969",   
  database: "parkiq",
  waitForConnections: true,
  connectionLimit: 10,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(" MySQL connected successfully!");
    conn.release();
  } catch (err) {
    console.error("MySQL connection failed:", err.message);
    console.error("   Make sure MySQL is running and password is correct in server.js");
  }
}
testConnection();

app.get("/slots", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM slots ORDER BY id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Database error: " + err.message });
  }
});
app.post("/book", async (req, res) => {
  const { name, vehicle, type } = req.body;

  if (!name || !vehicle || !type) {
    return res.status(400).json({ message: "Name, vehicle, and type are required." });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Find next available slot
    const [available] = await conn.query(
      "SELECT id FROM slots WHERE status = 'available' LIMIT 1"
    );

    if (available.length === 0) {
      await conn.rollback();
      return res.status(409).json({ message: "No slots available right now." });
    }

    const slotId = available[0].id;

    // Update slot to occupied
    await conn.query(
      "UPDATE slots SET status = 'occupied' WHERE id = ?",
      [slotId]
    );

    // Insert booking record
    await conn.query(
      "INSERT INTO bookings (slot_id, name, vehicle, type) VALUES (?, ?, ?, ?)",
      [slotId, name, vehicle, type]
    );

    await conn.commit();

    res.status(201).json({
      message: "Slot reserved successfully.",
      slot:    slotId,
      booking: { name, vehicle, type },
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: "Booking failed: " + err.message });
  } finally {
    conn.release();
  }
});

// ── PATCH /cancel/:id — Update slot back to available ────────
app.patch("/cancel/:id", async (req, res) => {
  const slotId = req.params.id.toUpperCase();

  try {
    const [slot] = await pool.query(
      "SELECT * FROM slots WHERE id = ?", [slotId]
    );

    if (slot.length === 0) {
      return res.status(404).json({ message: `Slot ${slotId} not found.` });
    }

    if (slot[0].status === "available") {
      return res.status(400).json({ message: `Slot ${slotId} is already available.` });
    }

    await pool.query(
      "UPDATE slots SET status = 'available' WHERE id = ?", [slotId]
    );

    res.json({ message: `Slot ${slotId} cancelled successfully.`, slot: slotId });

  } catch (err) {
    res.status(500).json({ message: "Cancel failed: " + err.message });
  }
});

// ── GET /bookings — Read all booking history ─────────────────
app.get("/bookings", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM bookings ORDER BY booked_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Database error: " + err.message });
  }
});

app.delete("/bookings/:id", async (req, res) => {
  const bookingId = req.params.id;

  try {
    const [result] = await pool.query(
      "DELETE FROM bookings WHERE booking_id = ?", [bookingId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }

    res.json({ message: `Booking #${bookingId} deleted.` });
  } catch (err) {
    res.status(500).json({ message: "Delete failed: " + err.message });
  }
});
app.get("/stats", async (req, res) => {
  try {
    const [[{ total }]]    = await pool.query("SELECT COUNT(*) AS total FROM slots");
    const [[{ occupied }]] = await pool.query("SELECT COUNT(*) AS occupied FROM slots WHERE status = 'occupied'");
    res.json({ total, occupied, available: total - occupied });
  } catch (err) {
    res.status(500).json({ message: "Database error: " + err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.listen(PORT, () => {
  console.log(`\nParkIQ backend running at http://localhost:${PORT}`);
  console.log("   Press Ctrl+C to stop.\n");
});
