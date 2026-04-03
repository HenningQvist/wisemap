const adminModel = require('../models/adminModel'); // Importera din modell för användare


// Funktion för att hämta alla användare
const getUsers = async (req, res) => {
  try {
    // Kontrollera om användaren är admin innan vi hämtar alla användare
    const user = req.user;  // Detta antas vara användaren från auth-tokenen (skickas via middleware)
    if (!user || !user.admin) {
      return res.status(403).json({ message: 'Åtkomst förbjuden: Ingen administratörsbehörighet' });
    }

    const users = await adminModel.getAllUsers(); // Hämta alla användare från modellen
    res.status(200).json(users); // Returnera användarna som JSON
  } catch (err) {
    console.error('Fel vid hämtning av användare:', err);
    res.status(500).json({ message: 'Fel vid hämtning av användare', error: err.message });
  }
};

// Controller-funktion för att uppdatera användare
const updateUser = async (req, res) => {
  const { id } = req.params;  // Hämta id från URL-parametern
  const { username, email, admin, role } = req.body;  // Hämta uppdaterad data inklusive admin och role

  console.log('Inkommande förfrågan:', req.body); // Logga request body för att kontrollera admin-status

  try {
    // Kontrollera om användaren finns i databasen
    const user = await adminModel.getUserById(id); // Använd funktionen för att hämta användare baserat på id
    if (!user) {
      return res.status(404).json({ error: 'Användare inte hittad' });
    }

    // Om den inloggade användaren inte är admin och försöker ändra admin-status, blockera
    if (!req.user.admin && typeof admin !== 'undefined') {
      console.log('Ej admin, blockering av uppdatering av admin-status');
      return res.status(403).json({ message: 'Endast administratörer kan ändra admin-statusen.' });
    }

    // Om den inloggade användaren är admin, låt den sätta admin-statusen till både true och false
    const updatedUser = await adminModel.updateUser(id, username, email, admin !== undefined ? admin : user.admin, role);
    return res.json(updatedUser); // Skicka tillbaka den uppdaterade användaren
  } catch (err) {
    console.error('Fel vid uppdatering av användare i controller:', err);
    return res.status(500).json({ error: 'Serverfel vid uppdatering av användare' });
  }
};



// Controller-funktion för att ta bort användare
const deleteUser = async (req, res) => {
  const { id } = req.params; // Hämta ID från URL-parametern

  try {
    // Ta bort användaren från databasen
    const deletedUser = await adminModel.deleteUser(id);

    // Om användaren har tagits bort, skicka tillbaka meddelandet
    return res.json({ message: 'Användare borttagen', user: deletedUser });
  } catch (err) {
    console.error('Fel vid borttagning av användare i controller:', err);
    return res.status(500).json({ error: 'Serverfel vid borttagning av användare' });
  }
};

// Funktion för att skapa handläggare
const createHandler = async (req, res) => {
  try {
    const { email, username, password, admin } = req.body; // Hantera indata från requesten

    // Hasha lösenordet innan det sparas (om du inte gör det i modellen)
    const hashedPassword = await bcrypt.hash(password, 12); 

    // Skapa användaren (handläggare) i databasen
    const newUser = await adminModel.createUser(email, username, hashedPassword, admin || false); // Skapa användaren i databasen

    return res.status(201).json({ message: 'Handläggare skapad', user: newUser });
  } catch (error) {
    console.error('Fel vid skapande av handläggare:', error);
    return res.status(500).json({ message: 'Något gick fel vid skapande av handläggare' });
  }
};

// Hämta en användare baserat på ID
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await adminModel.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Användare hittades inte' });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error('Fel vid hämtning av användare:', err);
    return res.status(500).json({ message: 'Serverfel vid hämtning av användare' });
  }
};

module.exports = {
  deleteUser,
  getUsers,
  getUserById,  
  updateUser,
  createHandler,
};
