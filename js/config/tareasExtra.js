/**
 * js/config/tareasExtra.js
 * Catálogo de Tareas Extraordinarias predefinidas.
 * Cero texto libre (GDPR/LOPD).
 */

/**
 * @typedef {Object} TareaExtra
 * @property {string} id
 * @property {string} nombre
 * @property {string|null} icono
 */

/** @type {readonly TareaExtra[]} */
export const TAREAS_EXTRA = Object.freeze([
  Object.freeze({ id: 'oxigeno', nombre: 'Cambiar oxígeno', icono: null }),
  Object.freeze({ id: 'bano', nombre: 'Poner baño', icono: null }),
  Object.freeze({ id: 'exitus', nombre: 'Bajar éxitus', icono: null }),
  Object.freeze({ id: 'analitica', nombre: 'Bajar analítica', icono: null }),
  Object.freeze({ id: 'levantar', nombre: 'Levantar', icono: 'levantar' }),
  Object.freeze({ id: 'acostar', nombre: 'Acostar', icono: 'acostar' })
]);
