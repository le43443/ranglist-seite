import { Client } from 'pg';

export default async function handler(req, res) {
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.DB_CA,
    },
  });

  try {
    await client.connect();

    // Tabelle erstellen, falls nicht vorhanden
    await client.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        strokes INT NOT NULL
      )
    `);

    if (req.method === 'GET') {
      // Leaderboard abrufen
      const result = await client.query(
        'SELECT name, strokes FROM scores ORDER BY strokes ASC, name ASC'
      );
      res.status(200).json(result.rows);
    }
    else if (req.method === 'POST') {
      const { name, strokes } = req.body;
      if (!name || typeof strokes !== 'number') {
        return res.status(400).json({ error: 'Ungültige Eingabe' });
      }

      // Prüfen, ob Spieler schon existiert
      const existing = await client.query('SELECT * FROM scores WHERE name = $1', [name]);
      if (existing.rows.length > 0) {
        // Update nur, wenn besserer Score
        if (strokes < existing.rows[0].strokes) {
          await client.query('UPDATE scores SET strokes = $1 WHERE name = $2', [strokes, name]);
        }
      } else {
        await client.query('INSERT INTO scores (name, strokes) VALUES ($1, $2)', [name, strokes]);
      }

      res.status(200).json({ success: true });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Fehler' });
  } finally {
    await client.end();
  }
}