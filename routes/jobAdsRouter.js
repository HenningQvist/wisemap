const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/jobsearch
router.get('/', async (req, res) => {
  try {
    let {
      q,
      position,
      latitude,
      longitude,
      'position.radius': radius = 10,
      limit = 200
    } = req.query;

    // 🧠 Hantera båda fallen
    if (!position) {
      if (latitude && longitude) {
        position = `${latitude},${longitude}`;
      }
    }

    // ❗ Om fortfarande ingen position → error
    if (!position) {
      return res.status(400).json({ error: 'Latitude och longitude krävs.' });
    }

    const response = await axios.get('https://jobsearch.api.jobtechdev.se/search', {
      params: {
        q,
        position,
        'position.radius': Number(radius),
        limit: Number(limit),
      },
      headers: { accept: 'application/json' },
    });

    res.json(response.data);

  } catch (error) {
    console.error('JobSearch ERROR:', error.message);
    res.status(500).json({ error: 'Kunde inte hämta jobannonser.' });
  }
});

module.exports = router;