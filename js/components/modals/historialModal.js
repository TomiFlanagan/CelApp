/**
 * js/components/modals/historialModal.js - Modal de Nivel 3
 * Ventana informativa de lectura (Tipología 2): consulta de la última modificación de una cama.
 * Solo se cierra con el botón Aceptar (sin cierre por scrim).
 */

// 🔥 ELIMINADO: import { adminService } from '../../services/adminService.js';

/**
 * Construye una frase legible para un registro de traslado o intercambio de cama.
 * @param {Object} valorNuevo
 * @returns {string}
 */
function formatDetalleTraslado(valorNuevo) {
  if (!valorNuevo) return '';
  if (valorNuevo.trasladoDesde) return `Recibió la información de la Cama ${valorNuevo.trasladoDesde}`;
  if (valorNuevo.trasladoHacia) return `Su información se trasladó a la Cama ${valorNuevo.trasladoHacia}`;
  if (valorNuevo.intercambioCon) return `Se intercambió la información con la Cama ${valorNuevo.intercambioCon}`;
  return '';
}

/**
 * Abre la ventana de Nivel 3 con el registro de última modificación de una cama.
 * @param {Object} cama
 */
export function openHistorialModal(cama) { // 🔥 ELIMINADO 'async'
  document.body.classList.add('modal-open');

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay level-3-overlay';

  const mod = cama.ultimaModificacion;

  // 🔥 AHORA: usar directamente el nombre guardado en el campo 'usuario'
  // Ya no es necesario llamar a adminService.getNombreUsuario()
  const nombreUsuario = mod?.usuario || 'Usuario desconocido';

  let cuerpoHTML;
  if (!mod) {
    cuerpoHTML = `<p style="margin: 0; font-size: 0.95rem; color: #737373; line-height: 1.5;">Sin modificaciones registradas.</p>`;
  } else if (mod.campo === 'vaciar') {
    cuerpoHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <div style="font-size: 0.85rem; color: #737373; line-height: 1.4;">
          <strong style="color: #171717;">Usuario:</strong> ${nombreUsuario}
        </div>
        <div style="font-size: 0.85rem; color: #737373; line-height: 1.4;">
          <strong style="color: #171717;">Fecha:</strong> ${mod.fecha} ${mod.hora}
        </div>
        <div style="font-size: 0.85rem; color: #737373; line-height: 1.4;">
          <strong style="color: #171717;">Acción:</strong> Vaciado de cama (se eliminaron paciente de celador, atributos y rutinas)
        </div>
      </div>
    `;
  } else if (mod.campo === 'traslado') {
    const detalle = formatDetalleTraslado(mod.valorNuevo);
    cuerpoHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <div style="font-size: 0.85rem; color: #737373; line-height: 1.4;">
          <strong style="color: #171717;">Usuario:</strong> ${nombreUsuario}
        </div>
        <div style="font-size: 0.85rem; color: #737373; line-height: 1.4;">
          <strong style="color: #171717;">Fecha:</strong> ${mod.fecha} ${mod.hora}
        </div>
        <div style="font-size: 0.85rem; color: #737373; line-height: 1.4;">
          <strong style="color: #171717;">Acción:</strong> Traslado de paciente${detalle ? ` — ${detalle}` : ''}
        </div>
      </div>
    `;
  } else {
    // Versión limpia: solo mostramos el texto legible
    cuerpoHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <div style="font-size: 0.85rem; color: #737373; line-height: 1.4;">
          <strong style="color: #171717;">Usuario:</strong> ${nombreUsuario}
        </div>
        <div style="font-size: 0.85rem; color: #737373; line-height: 1.4;">
          <strong style="color: #171717;">Fecha:</strong> ${mod.fecha} ${mod.hora}
        </div>
        <div style="font-size: 0.85rem; color: #737373; line-height: 1.4;">
          <strong style="color: #171717;">Modificación:</strong> ${mod.campo}
        </div>
      </div>
    `;
  }

  modalOverlay.innerHTML = `
    <div class="modal-card modal-level-3" style="border-radius: 0; box-shadow: none; width: 90%; max-width: 360px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
      
      <!-- Cabecera Flat UI: con línea inferior separadora (estilo modal-header-generic) -->
      <div class="modal-header-generic" style="border-bottom: 1px solid #e5e7eb; padding: 0.85rem 1rem; background: #ffffff; flex-shrink: 0;">
        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #171717;">Última modificación</h3>
        <span style="font-size: 0.85rem; font-weight: 500; color: #737373;">Cama ${cama.id}</span>
      </div>
      
      <!-- Cuerpo del modal con el contenido -->
      <div style="padding: 1rem 1rem 1.5rem 1rem; flex: 1;">
        ${cuerpoHTML}
      </div>
      
      <!-- Botonera Edge-to-Edge 50/50 (con un solo botón Aceptar centrado) -->
      <div class="modal-footer-5050" style="display: flex; width: 100%; border-top: none; flex-shrink: 0; margin-top: 0;">
        <button type="button" class="btn-modal-accept" id="btn-historial-cerrar" style="flex: 1; min-height: 48px; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; background-color: #171717; color: #ffffff; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">Aceptar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const cerrar = () => {
    modalOverlay.remove();
    if (!document.querySelector('.modal-overlay')) {
      document.body.classList.remove('modal-open');
    }
    // 🔥 NUEVO: Restaurar scroll al cerrar el historial
    const container = document.getElementById('app');
    if (container && window.scrollPositionBeforeUpdate && window.scrollPositionBeforeUpdate > 0) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      const targetScroll = Math.min(window.scrollPositionBeforeUpdate, maxScroll);
      container.scrollTop = targetScroll;
      console.log(`🔄 [HISTORIAL] Scroll restaurado a: ${targetScroll}px`);
      window.scrollPositionBeforeUpdate = 0;
    }
  };

  modalOverlay.querySelector('#btn-historial-cerrar')?.addEventListener('click', cerrar);
}