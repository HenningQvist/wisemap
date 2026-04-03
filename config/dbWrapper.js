// utils/dbWrapper.js
const db = require('../config/db'); 

/**
 * Wrapper som automatiskt injicerar created_by och updated_by
 * från req.userName till insert/update operationer.
 */
const dbWrapper = (req) => {
  if (!req) throw new Error("dbWrapper kräver req-objektet från Express");

  return {
    insert: (table, data) => {
      const enrichedData = {
        ...data,
        created_by: req.userName || "okänd",
        updated_by: req.userName || "okänd",
      };
      return db(table).insert(enrichedData);
    },

    update: (table, id, data) => {
      const enrichedData = {
        ...data,
        updated_by: req.userName || "okänd",
      };
      return db(table).where("id", id).update(enrichedData);
    },

    delete: (table, id) => {
      // Logga vem som tog bort om du vill
      console.log(`🗑️ ${req.userName} tog bort rad med id ${id} i tabell ${table}`);
      return db(table).where("id", id).del();
    },

    select: (table, where = {}) => {
      return db(table).where(where);
    },
  };
};

module.exports = dbWrapper;
