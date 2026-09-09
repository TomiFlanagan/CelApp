/**
 * Configuración estática de las Unidades Asistenciales
 * Define los metadatos y la paleta de colores oficial.
 */

/**
 * @typedef {Object} Unidad
 * @property {string} id
 * @property {string} nombre
 * @property {string} codigo
 * @property {string} bgPastel
 * @property {string} accentColor
 * @property {string} textColor
 */

/** @type {Unidad[]} */
export const UNIDADES = [
  {
    id: 'amarilla',
    nombre: 'Unidad Amarilla',
    codigo: 'AM',
    bgPastel: '#FEF9C3',
    accentColor: '#EAB308',
    textColor: '#171717'  // Antes: '#854D0E'
  },
  {
    id: 'naranja',
    nombre: 'Unidad Naranja',
    codigo: 'NJ',
    bgPastel: '#FFEDD5',
    accentColor: '#F97316',
    textColor: '#171717'  // Antes: '#9A3412'
  },
  {
    id: 'teja',
    nombre: 'Unidad Teja',
    codigo: 'TJ',
    bgPastel: '#FEE2E2',
    accentColor: '#EF4444',
    textColor: '#171717'  // Antes: '#991B1B'
  },
  {
    id: 'verde',
    nombre: 'Unidad Verde',
    codigo: 'VD',
    bgPastel: '#DCFCE7',
    accentColor: '#22C55E',
    textColor: '#171717'  // Antes: '#166534'
  },
  {
    id: 'azul',
    nombre: 'Unidad Azul',
    codigo: 'AZ',
    bgPastel: '#E0F2FE',
    accentColor: '#0284C7',
    textColor: '#171717'  // Antes: '#075985'
  }
];

/**
 * Obtiene la configuración de una unidad por su ID.
 * @param {string} id
 * @returns {Unidad|null}
 */
export function getUnidadById(id) {
  return UNIDADES.find(u => u.id === id) || null;
}

/**
 * Devuelve una lista rápida de todos los IDs de unidades válidos.
 * @returns {string[]}
 */
export function getIdsUnidades() {
  return UNIDADES.map(u => u.id);
}
