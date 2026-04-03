// overpassRouter.js
const express = require("express");
const axios = require("axios");

const router = express.Router();

const BBOX = [61.45, 16.40, 62.10, 17.40];

// Cache
let cache = null;
let lastFetch = 0;
const CACHE_TIME = 1000 * 60 * 60;

// Smart retry
const fetchQuery = async (query, attempt = 1) => {
  try {
    return await axios.post(
      "https://overpass-api.de/api/interpreter",
      query,
      {
        headers: { "Content-Type": "text/plain" },
        timeout: 30000
      }
    );
  } catch (err) {
    const status = err.response?.status;
    if (status === 429 && attempt <= 3) {
      const delay = attempt * 3000;
      console.log(`⏳ 429 - väntar ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return fetchQuery(query, attempt + 1);
    }
    throw err;
  }
};

// GET /
router.get("/", async (req, res) => {
  try {
    if (cache && Date.now() - lastFetch < CACHE_TIME) {
      console.log("⚡ cache");
      return res.json(cache);
    }

    const queries = [
      `[out:json][timeout:25];(node["shop"](${BBOX.join(",")});node["office"](${BBOX.join(",")}););out body;`,
      `[out:json][timeout:25];(node["craft"](${BBOX.join(",")}););out body;`,
      `[out:json][timeout:25];(node["amenity"](${BBOX.join(",")}););out body;`
    ];

    let all = [];
    for (let i = 0; i < queries.length; i++) {
      console.log(`📦 Query ${i + 1}`);
      const resData = await fetchQuery(queries[i]);
      const elements = resData.data.elements || [];
      all = all.concat(elements);
      await new Promise(r => setTimeout(r, 4000));
    }

    const unique = new Map();
    all.forEach(el => {
      if (!unique.has(el.id)) unique.set(el.id, el);
    });

    const companies = Array.from(unique.values())
      .map(c => ({
        id: c.id,
        name: c.tags?.name || "Okänt företag",
        lat: c.lat,
        lon: c.lon,
        status: "aktiv",
        description: c.tags?.description || "",
        contact: c.tags?.contact || "",
        phone: c.tags?.phone || "",
        branch: c.tags?.industry || c.tags?.branch || "",
        tags: c.tags || {}
      }))
      .filter(c => c.lat && c.lon);

    cache = companies;
    lastFetch = Date.now();
    res.json(companies);

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    if (cache) return res.json(cache);
    res.json([]);
  }
});

module.exports = router;