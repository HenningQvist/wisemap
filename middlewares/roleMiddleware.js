const { getUserById } = require('../models/adminModel');

/**
 * Middleware: requireRoles
 * options:
 *   roles: tillåtna roller (array)
 *   adminsOnly: endast admin får åtkomst
 *   includeAdmin: admin får alltid åtkomst
 */
const requireRoles = (options = {}) => {
  const {
    roles = [],
    adminsOnly = false,
    includeAdmin = true
  } = options;

  return async (req, res, next) => {
    try {
      console.log('🔑 requireRoles start', { roles, adminsOnly, includeAdmin });

      if (!req.user || !req.user.id) {
        console.log('⛔ Ingen användare i token');
        return res.status(401).json({ message: 'Ej auktoriserad: Ingen användare i token' });
      }

      const user = await getUserById(req.user.id);

      if (!user) {
        console.log('⛔ Användare inte hittad');
        return res.status(404).json({ message: 'Användare inte hittad' });
      }

      console.log('👤 Användare hittad:', { id: user.id, role: user.role, admin: user.admin });

      // Endast admin får åtkomst
      if (adminsOnly) {
        if (user.admin) {
          console.log('✅ Admin access granted (adminsOnly)');
          return next();
        }
        console.log('⛔ Endast admin får åtkomst');
        return res.status(403).json({ message: 'Endast admin har åtkomst' });
      }

      // Admin får alltid åtkomst om includeAdmin = true
      if (includeAdmin && user.admin) {
        console.log('✅ Admin access granted (includeAdmin)');
        return next();
      }

      // Kontrollera roller
      if (roles.length > 0) {
        console.log('👀 Kontrollera roller:', roles, 'mot användarens roll:', user.role);
        if (roles.includes(user.role)) {
          console.log('✅ Rolle check passed');
          return next();
        }
        console.log('⛔ Otillräckliga rättigheter för användare med roll:', user.role);
        return res.status(403).json({
          message: `Otillräckliga rättigheter - kräver roller: ${roles.join(', ')}`
        });
      }

      // Om inga roller eller adminsOnly satts → tillåt inloggad användare
      console.log('✅ Inloggad användare tillåten (ingen specifik roll krav)');
      return next();

    } catch (err) {
      console.error('Role middleware error:', err);
      return res.status(500).json({ message: 'Fel i rättighetskontrollen' });
    }
  };
};

module.exports = requireRoles;
