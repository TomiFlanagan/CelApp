/**
 * almacenModal.js - Modal de Nivel 2
 * Presenta la tabla global de 6 columnas (1 de materiales + 5 de unidades) y 8 filas (1 cabecera + 7 materiales).
 */

import { sync } from '../../services/sync.js';
import { UNIDADES } from '../../config/unidades.js';
import { MATERIALES } from '../../config/materiales.js';
import { openCantidadEditModal } from './confirmModal.js';

/**
 * Abre el modal de Nivel 2 del Almacén con el contexto visual de la unidad de origen.
 * @param {string} [_unidadDestacadaId='amarilla'] - ID de la unidad desde la que se abre.
 */
export function openAlmacenModal(_unidadDestacadaId = 'amarilla') {
  document.body.classList.add('modal-open');

  let selectedCell = null; // { matId: string, unitId: string }

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay level-2-overlay';
  modalOverlay.id = 'almacen-modal-overlay';

  const renderContent = () => {
    const matriz = sync.getAlmacenMatriz();
    const activeUnitId = selectedCell ? selectedCell.unitId : _unidadDestacadaId;
    
    // Obtener el color saturado de la unidad activa
    const activeUnidad = UNIDADES.find(u => u.id === activeUnitId);
    const activeColor = activeUnidad?.accentColor || '#171717';

    modalOverlay.innerHTML = `
      <div class="modal-card modal-level-2 almacen-modal-card">
        <header class="almacen-header">
          <h2 class="almacen-title">Almacén</h2>
        </header>

        <div class="almacen-table-wrapper" id="almacen-table-wrapper">
          <table class="almacen-table" id="almacen-table">
            <thead>
              <tr>
                <!-- Columna 1: Materiales -->
                <th class="th-material-name"></th>
                <!-- Columnas 2-6: Unidades -->
                ${UNIDADES.map((/** @type {any} */ u) => {
                  return `
                    <th class="th-unit ${u.id === activeUnitId ? 'unidad-activa' : ''}" 
                        data-unit="${u.id}"
                        style="background-color: ${u.accentColor};">
                    </th>
                  `;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${MATERIALES.map((/** @type {any} */ mat) => {
                const isSelectedRow = selectedCell && selectedCell.matId === mat.id;
                return `
                <tr class="${isSelectedRow ? `fila-activa unidad-activa-${selectedCell.unitId}` : ''}">
                  <!-- Columna 1: Nombre del Material -->
                  <td class="td-material-name">${mat.nombre}</td>
                  <!-- Columnas 2-6: Cantidades -->
                  ${UNIDADES.map((/** @type {any} */ u) => {
                    const cant = matriz[mat.id]?.[u.id] ?? 0;
                    const isSelectedCell = selectedCell && selectedCell.matId === mat.id && selectedCell.unitId === u.id;
                    const isActiveColClass = u.id === activeUnitId ? `columna-activa unidad-activa-${activeUnitId}` : '';
                    const cellSelectedClass = isSelectedCell ? 'cell-selected' : '';
                    const selectedBgColor = isSelectedCell ? `background-color: ${activeColor};` : '';
                    return `
                      <td class="td-cell-qty ${isActiveColClass} ${cellSelectedClass}" 
                          data-material="${mat.id}" 
                          data-material-nombre="${mat.nombre}" 
                          data-unit="${u.id}" 
                          data-unit-nombre="${u.nombre}"
                          style="${selectedBgColor}">
                        <span class="qty-value">${cant}</span>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="modal-footer-5050">
          <button type="button" class="btn-modal-cancel" id="btn-almacen-cerrar">Cancelar</button>
          <button type="button" class="btn-modal-accept" id="btn-almacen-guardar">Aceptar</button>
        </div>
      </div>
    `;

    // --- AJUSTE DE LA COLUMNA DE MATERIALES Y CELDAS CUADRADAS PARA QUE TODO QUEPA ---
    // Usamos requestAnimationFrame para asegurarnos de que el DOM ya tiene dimensiones reales.
    requestAnimationFrame(() => {
      const tableWrapper = modalOverlay.querySelector('#almacen-table-wrapper');
      const table = modalOverlay.querySelector('#almacen-table');

      // 1. Ancho total disponible en el contenedor de la tabla
      const totalWidth = tableWrapper.clientWidth;

      // 2. Definir un ancho razonable para la columna de materiales (reducido para dar prioridad a las unidades)
      const longestMaterial = MATERIALES.reduce((max, mat) => mat.nombre.length > max.length ? mat : max, MATERIALES[0]);
      // Calculamos un ancho para el material basado en su texto, pero limitado al 40% del ancho total
      const estimatedTextWidth = longestMaterial.nombre.length * 8; 
      const materialColumnWidth = Math.min(Math.max(110, estimatedTextWidth + 30), totalWidth * 0.40);

      // 3. Calcular el tamaño del cuadrado para que quepan las 5 unidades
      // Restamos el ancho de materiales al total, y dividimos entre 5
      const availableSpaceForUnits = totalWidth - materialColumnWidth;
      const squareSize = Math.floor(availableSpaceForUnits / UNIDADES.length);

      // Aplicamos el ancho a la columna de materiales
      modalOverlay.querySelectorAll('.th-material-name, .td-material-name').forEach(cell => {
        cell.style.width = `${materialColumnWidth}px`;
        cell.style.minWidth = `${materialColumnWidth}px`;
      });

      // Aplicamos la variable CSS global con el tamaño del cuadrado
      // Esto afecta a .th-unit y .td-cell-qty, que tienen width y height: var(--unit-cell-width)
      table.style.setProperty('--unit-cell-width', `${squareSize}px`);
    });

    // --- Selección de celda (1er clic) y apertura de edición Nivel 3 (2º clic consecutivo) ---
    modalOverlay.querySelectorAll('.td-cell-qty').forEach(td => {
      td.addEventListener('click', () => {
        const matId = td.getAttribute('data-material') || '';
        const matNombre = td.getAttribute('data-material-nombre') || '';
        const unitId = td.getAttribute('data-unit') || '';
        const unitNombre = td.getAttribute('data-unit-nombre') || '';

        if (selectedCell && selectedCell.matId === matId && selectedCell.unitId === unitId) {
          // Segundo clic en celda activa: abre Nivel 3
          const cantActual = matriz[matId]?.[unitId] ?? 0;
          openCantidadEditModal({
            titulo: matNombre,
            subtitulo: `Stock en unidad ${unitNombre}`,
            valorInicial: cantActual,
            onAceptar: (/** @type {number} */ nuevaCant) => {
              sync.updateAlmacenCantidad(matId, unitId, nuevaCant);
              renderContent();
            }
          });
        } else {
          // Primer clic: selecciona celda
          selectedCell = { matId, unitId };
          renderContent();
        }
      });
    });

    // También permitir cambiar la unidad activa haciendo clic en la cabecera
    modalOverlay.querySelectorAll('.th-unit').forEach(th => {
      th.addEventListener('click', () => {
        const unitId = th.getAttribute('data-unit');
        if (unitId) {
          // Si ya hay una celda seleccionada, actualizamos su unidad
          if (selectedCell) {
            selectedCell.unitId = unitId;
          } else {
            // Si no hay celda seleccionada, seleccionamos la primera celda de esa unidad
            const firstCell = modalOverlay.querySelector(`.td-cell-qty[data-unit="${unitId}"]`);
            if (firstCell) {
              const matId = firstCell.getAttribute('data-material') || '';
              selectedCell = { matId, unitId };
            }
          }
          renderContent();
        }
      });
    });

    const btnCerrar = modalOverlay.querySelector('#btn-almacen-cerrar');
    const btnAceptar = modalOverlay.querySelector('#btn-almacen-guardar');

    const cerrarModal = () => {
      modalOverlay.remove();
      if (!document.querySelector('.modal-overlay')) {
        document.body.classList.remove('modal-open');
      }
    };

    if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);
    if (btnAceptar) btnAceptar.addEventListener('click', cerrarModal);
  };

  renderContent();
  document.body.appendChild(modalOverlay);
}