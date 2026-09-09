/**
 * Configuración estática de las Franjas Horarias Operativas
 * Define las 7 franjas secuenciales del turno asistencial.
 */

export const TIMEOUT_SELECCION_FRANJA_MS = 5 * 60 * 1000; // 5 minutos de caducidad

/**
 * @typedef {Object} Franja
 * @property {string} id
 * @property {string} nombre
 * @property {number} orden
 * @property {string} horario
 * @property {number} startHour
 * @property {number} endHour
 * @property {string} turno - 'manana' o 'tarde' (despues_comer pertenece a ambos)
 */

/** @type {Franja[]} */
export const FRANJAS = [
  {
    id: 'primera_hora',
    nombre: 'Primera hora',
    orden: 1,
    horario: '08:00 - 10:00',
    startHour: 8,
    endHour: 10,
    turno: 'manana'
  },
  {
    id: 'media_manana',
    nombre: 'Media mañana',
    orden: 2,
    horario: '10:00 - 12:00',
    startHour: 10,
    endHour: 12,
    turno: 'manana'
  },
  {
    id: 'antes_comer',
    nombre: 'Antes de comer',
    orden: 3,
    horario: '12:00 - 14:00',
    startHour: 12,
    endHour: 14,
    turno: 'manana'
  },
  {
    id: 'despues_comer',
    nombre: 'Después de comer',
    orden: 4,
    horario: '14:00 - 16:00',
    startHour: 14,
    endHour: 16,
    turno: 'ambos'
  },
  {
    id: 'merienda',
    nombre: 'Merienda',
    orden: 5,
    horario: '16:00 - 18:00',
    startHour: 16,
    endHour: 18,
    turno: 'tarde'
  },
  {
    id: 'antes_cenar',
    nombre: 'Antes de cenar',
    orden: 6,
    horario: '18:00 - 20:00',
    startHour: 18,
    endHour: 20,
    turno: 'tarde'
  },
  {
    id: 'despues_cenar',
    nombre: 'Después de cenar',
    orden: 7,
    horario: '20:00 - 22:00',
    startHour: 20,
    endHour: 22,
    turno: 'tarde'
  }
];

/**
 * Obtiene los datos de una franja por su ID.
 * @param {string} id
 * @returns {Franja|null}
 */
export function getFranjaById(id) {
  return FRANJAS.find(f => f.id === id) || null;
}

/**
 * Devuelve la lista de franjas ordenadas cronológicamente.
 * @returns {Franja[]}
 */
export function getFranjasOrdenadas() {
  return [...FRANJAS].sort((a, b) => a.orden - b.orden);
}

/**
 * Detecta y devuelve el ID de la franja horaria activa según la hora del sistema.
 * @returns {string}
 */
export function getFranjaActualId() {
  const now = new Date();
  const currentHour = now.getHours();

  const activeFranja = FRANJAS.find(
    f => currentHour >= f.startHour && currentHour < f.endHour
  );

  return activeFranja ? activeFranja.id : 'primera_hora';
}

/**
 * Devuelve el turno de una franja por su ID.
 * @param {string} franjaId
 * @returns {string} 'manana', 'tarde' o 'ambos'
 */
export function getTurnoByFranjaId(franjaId) {
  const franja = FRANJAS.find(f => f.id === franjaId);
  return franja ? franja.turno : 'manana';
}