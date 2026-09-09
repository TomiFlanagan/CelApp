/**
 * js/config/atributos.js
 * Catálogo oficial e unificado de los 7 atributos de cama y pictogramas.
 * Fuente única de verdad para camaCard.js, editorCamaModal.js y filtrosModal.js.
 */

export const ATRIBUTOS = [
  { id: 'oxigeno', label: 'Oxígeno', icon: 'assets/icons/attributes/oxigeno.svg' },
  { id: 'sillaXL', label: 'Silla XL', icon: 'assets/icons/attributes/silla-xl.svg' },
  { id: 'sillaGD', label: 'Silla GD', icon: 'assets/icons/attributes/silla-gd.svg' },
  { id: 'grua', label: 'Grúa', icon: 'assets/icons/attributes/grua.svg' },
  { id: 'pedalExtI', label: 'Pedal Ext. I.', icon: 'assets/icons/attributes/pedal-ext-i.svg' },
  { id: 'pedalExtD', label: 'Pedal Ext. D.', icon: 'assets/icons/attributes/pedal-ext-d.svg' },
  { id: 'camaEspecial', label: 'Cama Especial', icon: 'assets/icons/attributes/cama-especial.svg' }
];

export const ATRIBUTOS_MAP = ATRIBUTOS.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});
