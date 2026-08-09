/**
 * Directorio de acceso de la demo.
 *
 * IMPORTANTE: esto vive en el bundle del cliente, así que funciona como
 * puerta de cortesía para separar vistas, no como control de seguridad real.
 * Cuando la app maneje datos reales de clientes, la autenticación y los roles
 * deben validarse en un backend.
 *
 * Roles disponibles:
 *  - 'admin'  → acceso completo, incluida la vista previa multi-dispositivo.
 *  - 'user'   → sólo captura y diagnóstico.
 */
export const ROLES = { ADMIN: 'admin', USER: 'user' };

const USERS = [
  { username: 'marco', password: 'admin123', role: ROLES.ADMIN, name: 'Marco' },
  // Usuario de ejemplo sin privilegios; renómbralo o elimínalo según necesites.
  { username: 'asesor', password: 'asesor123', role: ROLES.USER, name: 'Asesor' },
];

/**
 * Valida credenciales y devuelve los datos públicos del usuario
 * (sin la contraseña) o `null` si no coinciden.
 */
export function authenticate(username, password) {
  const match = USERS.find(
    (u) => u.username === username.trim().toLowerCase() && u.password === password,
  );
  if (!match) return null;
  return { username: match.username, role: match.role, name: match.name };
}

export function isAdmin(role) {
  return role === ROLES.ADMIN;
}

/** Valida que un rol rehidratado desde sessionStorage sea uno conocido. */
export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}
