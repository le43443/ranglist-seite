const express = require('express');
const { Client } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // optional, nur wenn du public direkt serven willst

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true, ca: process.env.DB_CA },
};

const client = new Client(config);

client.connect().then(() => console.log('DB verbunden')).catch(err => console.error(err));

app.post('/api/score', async (req, res) => {
  const { name, strokes } = req.body;
  if (!name || typeof strokes !== 'number') return res.status(400).json({ error: 'Ungültige Eingabe' });

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        strokes INT NOT NULL
      )
    `);

    const result = await client.query('SELECT * FROM scores WHERE name = $1', [name]);
    if (result.rows.length) {
      if (strokes < result.rows[0].strokes)
        await client.query('UPDATE scores SET strokes = $1 WHERE name = $2', [strokes, name]);
    } else {
      await client.query('INSERT INTO scores (name, strokes) VALUES ($1, $2)', [name, strokes]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Fehler' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await client.query('SELECT name, strokes FROM scores ORDER BY strokes ASC, name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Fehler' });
  }
});

// Export als Serverless Handler für Vercel
module.exports = app;