const loginAttemptModel = require('../models/loginAttempt'); // Lägg till denna rad för att importera modellen

// Funktion för att skapa ett inloggningsförsök
const createLoginAttempt = async (req, res) => {
  const { username, success, role } = req.body;  // Lägg till 'role' om du vill logga det också

  try {
    // Logga varje inloggningsförsök genom att anropa modellen
    const loginAttempt = await loginAttemptModel.createLoginAttempt({ username, success, role });
    
    res.status(201).json({
      message: 'Inloggningsförsök registrerat.',
      data: loginAttempt, // Skickar tillbaka den skapade login-posten
    });
  } catch (err) {
    console.error('❌ Fel vid skapande av inloggningsförsök:', err);  // För loggning vid fel
    res.status(500).json({
      message: 'Kunde inte registrera inloggningsförsök.',
      error: err.message,
    });
  }
};

// Funktion för att hämta alla login attempts
const getAllLoginAttempts = async (req, res) => {
  try {
    // Hämta alla login attempts från modellen
    const attempts = await loginAttemptModel.getAllLoginAttempts();
    res.json(attempts);
  } catch (err) {
    console.error('❌ Fel vid hämtning av loginförsök:', err);  // Logga fel här
    res.status(500).json({ error: 'Kunde inte hämta loginförsök' });
  }
};

module.exports = {
  createLoginAttempt,
  getAllLoginAttempts,
};
