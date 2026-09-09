/**
 * Configuración y Generador de la Estructura Fija de Camas del Centro.
 * Total: 145 Habitaciones / 209 Camas organizadas en 5 Unidades.
 */

/**
 * @typedef {Object} Habitacion
 * @property {string} habitacion
 * @property {boolean} esDoble
 * @property {string[]} camas
 */

// Definición de rangos y listas de habitaciones dobles por unidad
const REGLAS_UNIDADES = {
  amarilla: {
    inicio: 101, fin: 129,
    dobles: [101, 103, 105, 107, 109, 111, 113, 115, 118, 120, 122, 125, 127, 129]
  },
  naranja: {
    inicio: 130, fin: 158,
    dobles: [130, 132, 134, 136, 138, 140, 142, 144, 147, 149, 151, 152, 154, 156, 158]
  },
  teja: {
    inicio: 201, fin: 229,
    dobles: [201, 203, 205, 207, 209, 211, 213, 215, 218, 220, 222, 225, 227, 229]
  },
  verde: {
    inicio: 230, fin: 258,
    // Franja 238-252 es 100% individual, solo sobreviven estas dobles:
    dobles: [230, 232, 234, 236, 254, 256, 258]
  },
  azul: {
    inicio: 259, fin: 287,
    dobles: [259, 261, 263, 265, 267, 269, 271, 273, 276, 278, 280, 283, 285, 287]
  }
};

/**
 * Genera la estructura completa de habitaciones y camas.
 * Las dobles generan camas 'A' y 'B'. Las individuales generan única cama sin letra (o con letra según estándar).
 * @returns {Record<string, Habitacion[]>}
 */
function generarEstructuraCamas() {
  /** @type {Record<string, Habitacion[]>} */
  const mapaEstructura = {};

  Object.entries(REGLAS_UNIDADES).forEach(([unidadId, regla]) => {
    mapaEstructura[unidadId] = [];

    for (let numHab = regla.inicio; numHab <= regla.fin; numHab++) {
      const esDoble = regla.dobles.includes(numHab);
      const habStr = String(numHab);

      mapaEstructura[unidadId].push({
        habitacion: habStr,
        esDoble,
        camas: esDoble ? [`${habStr}A`, `${habStr}B`] : [`${habStr}`]
      });
    }
  });

  return mapaEstructura;
}

// Estructura exportada lista para su consumo global
export const ESTRUCTURA_CAMAS = generarEstructuraCamas();

/**
 * Obtiene las habitaciones de una unidad específica.
 * @param {string} unidadId 
 * @returns {Habitacion[]}
 */
export function getHabitacionesByUnidad(unidadId) {
  return ESTRUCTURA_CAMAS[unidadId] || [];
}

/**
 * Devuelve un array plano con todos los IDs de cama de una unidad.
 * @param {string} unidadId 
 * @returns {string[]}
 */
export function getCamasByUnidad(unidadId) {
  const habitaciones = ESTRUCTURA_CAMAS[unidadId] || [];
  return habitaciones.flatMap((h) => h.camas);
}
