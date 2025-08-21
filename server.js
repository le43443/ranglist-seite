const express = require('express');
const path = require('path');
const pg = require('pg');
const http = require('http');
const socketIO = require('socket.io');

const config = {
    user: "avnadmin",
    password: "AVNS_vTg2cJxAA7nLomC6IUG",
    host: "pg-11513b77-ranglist-project.i.aivencloud.com",
    port: 14294,
    database: "defaultdb",
    ssl: {
        rejectUnauthorized: true,
        ca: `-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUf190zb75sxDCFe3YLvdfWUoKFckwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1MTZlNDVmN2YtZWY1YS00NzlmLWI2MjQtODFhN2UwMjU1
MTFmIEdFTiAxIFByb2plY3QgQ0EwHhcNMjUwODIxMTEwNzQxWhcNMzUwODE5MTEw
NzQxWjBAMT4wPAYDVQQDDDUxNmU0NWY3Zi1lZjVhLTQ3OWYtYjYyNC04MWE3ZTAy
NTUxMWYgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBAJi3y7weOa/MHmwYDP+40g6IdQkc15fw07c5MSwqCA6DbyNH1SxTk5cv
EJI1LkRV1sBfD8Te21XaaJCAE3eAsiISvRBpfzpt9v1n4Skb3djY30yZQR4r2O8a
xlincpZJxsaSEfYxLY8KxRH5qD2ABKoe+GGCrlu1ZtzyOcrn/z+l1bjA5g9HlvMk
ZvUbsJuE7GHfgwtejjoXWm40XzrYzDmO4a0InwBroWlH03PaWMM0OVrDTdHYOSIx
YLDxjDOzWZTg8Pm99XbRl9T1ZcMTA9fGM/qvJEw6ode3cj74BzgyWecCs0gxVfF3
to4Y+UyWjTj09SagDnbxnCqaBqquUctpQUd++GyvTFicU5x+UUx6T1r6/m68Y83t
H2qXh7pwA0gvjIiGL97ItYSZa02EgsBHAUBbfFKeZ6CPYIEpsAS5k6Ry63/b3DGA
Xpm1p7P+XJnp0r7j+gv1TDWhN1xdOiSx0Jk4OroCrGSR4jM3+6uQiqzVIytD9RrX
ipsW+y9KnwIDAQABo0IwQDAdBgNVHQ4EFgQU4SsBT2x2kEh3SEqwC/qhNsAuUDcw
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBABcOmi6vnQb4vpaYTJ3FQSo093h96S1QTyfpVlWwO+TvsMgs+pOeOnBIqQNt
1qtBBk1VxHwJv68Msg6bWbtpVeuVz2Xc6nX2RV36an6ozQvjO99NcQqJU6zZS49I
bFCCE3t90EkPv9J9jgpZrIWIhH+wlB0kkCx3EOFZVdSL2+gCtv2t96IkArv7Y2Et
ExNmMOTsaMhcbijg6mKOVKY19sm95TrFaSy+X+UlLqK3ddRJvzSv9V0aJqPDLkbF
jMUipgJLVd8iFM7l/U61HWQHTYCRrMnbbvemB8PkWXac7g10MUA6g1i4iIQshbtQ
HR67da3mpilEbR8vFacgc/Wq6yDfxoV/eynk+MBJQHQP4LrbiWt7yUkCzozcaL/s
m81sq21gpRRpTMFqMUC1WFxExho0olS/wKKlIp0Edy+WWcmc2E+y9g2DepWFPX96
7qaebTZpg/lJJkGJRKEjq+s5/BDOp2qixRHRZscCJT6mlMlbMl1QWVmznqf3rjjB
iU+csw==
-----END CERTIFICATE-----`,
    },
};

const client = new pg.Client(config);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

async function createTableIfNotExists() {
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                strokes INT NOT NULL
            )
        `);
        console.log('Tabelle "scores" bereit.');
    } catch (err) {
        console.error('Fehler beim Erstellen der Tabelle:', err);
    }
}

client.connect(async (err) => {
    if (err) {
        console.error('DB Verbindung fehlgeschlagen:', err);
        process.exit(1);
    }
    console.log('Mit DB verbunden:', client.host);

    await createTableIfNotExists();

    app.post('/api/score', async (req, res) => {
        const { name, strokes } = req.body;
        if (!name || typeof strokes !== 'number') {
            return res.status(400).json({ error: 'Ungültige Eingabe' });
        }
        try {
            const result = await client.query('SELECT * FROM scores WHERE name = $1', [name]);
            if (result.rows.length > 0) {
                // Update strokes only if smaller (better score)
                if (strokes < result.rows[0].strokes) {
                    await client.query('UPDATE scores SET strokes = $1 WHERE name = $2', [strokes, name]);
                }
            } else {
                await client.query('INSERT INTO scores (name, strokes) VALUES ($1, $2)', [name, strokes]);
            }
            res.json({ success: true });
        } catch (err) {
            console.error('POST /api/score Fehler:', err);
            res.status(500).json({ error: 'Server Fehler' });
        }
    });

    app.get('/api/leaderboard', async (req, res) => {
        try {
            const result = await client.query('SELECT name, strokes FROM scores ORDER BY strokes ASC, name ASC');
            res.json(result.rows);
        } catch (err) {
            console.error('GET /api/leaderboard Fehler:', err);
            res.status(500).json({ error: 'Server Fehler' });
        }
    });

    app.listen(PORT, () => {
        console.log(`Server läuft auf http://localhost:${PORT}`);
    });
});