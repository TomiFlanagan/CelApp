/**
 * js/components/modals/adminPanelModal.js
 * Panel de Administración de cuentas, extraído de ajustesModal.js para
 * mantener ambos archivos dentro de un tamaño manejable.
 *
 * Responsabilidad exclusiva: listar cuentas pendientes/activas/inactivas,
 * sus acciones (autorizar, suspender, reactivar, eliminar...) y el diálogo
 * de alta de un nuevo usuario autorizado.
 *
 * No depende de ninguna variable de Preferencias/Cuenta de ajustesModal.js;
 * solo necesita la referencia al modalOverlay ya insertado en el DOM, el
 * usuario actual (para mostrar su rol en el diálogo de alta) y si procede
 * cargar el contenido de Administración nada más abrir el modal.
 */

import { adminService } from '../../services/adminService.js';
import { openConfirmModal } from './confirmModal.js';

/**
 * Inicializa el panel de Administración sobre un modal de Ajustes ya existente.
 * @param {HTMLElement} modalOverlay - El overlay del modal de Ajustes ya insertado en el DOM
 * @param {Object|null} user - Usuario con sesión activa (para mostrar su rol en el diálogo de alta)
 * @param {boolean} isAdmin - Si el usuario actual tiene permisos de administrador
 * @param {string} tabInicial - Pestaña con la que se abrió el modal ('preferencias'|'cuenta'|'admin')
 * @returns {{ renderAdminContent: Function, setupAdminListeners: Function }}
 */
export function initAdminPanel(modalOverlay, user, isAdmin, tabInicial) {

  // Configuración de los listeners de la pestaña de administración
  const setupAdminListeners = () => {
    // Toggles de secciones
    modalOverlay.querySelector('#btn-toggle-pendientes')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const body = modalOverlay.querySelector('#body-pendientes');
      const chevron = modalOverlay.querySelector('#chevron-pendientes');
      if (body) body.classList.toggle('hidden');
      if (chevron) {
        chevron.src = body.classList.contains('hidden') 
          ? 'assets/icons/navigation/chevron-down.svg' 
          : 'assets/icons/navigation/chevron-up.svg';
      }
    });

    modalOverlay.querySelector('#btn-toggle-activos')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const body = modalOverlay.querySelector('#body-activos');
      const chevron = modalOverlay.querySelector('#chevron-activos');
      if (body) body.classList.toggle('hidden');
      if (chevron) {
        chevron.src = body.classList.contains('hidden') 
          ? 'assets/icons/navigation/chevron-down.svg' 
          : 'assets/icons/navigation/chevron-up.svg';
      }
    });

    modalOverlay.querySelector('#btn-toggle-inactivos')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const body = modalOverlay.querySelector('#body-inactivos');
      const chevron = modalOverlay.querySelector('#chevron-inactivos');
      if (body) body.classList.toggle('hidden');
      if (chevron) {
        chevron.src = body.classList.contains('hidden') 
          ? 'assets/icons/navigation/chevron-down.svg' 
          : 'assets/icons/navigation/chevron-up.svg';
      }
    });

    // Botones de pendientes (suspender, registrar, reactivar)
    modalOverlay.querySelectorAll('.btn-rechazar-pendiente').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = btn.dataset.email;
        const tipo = btn.dataset.tipo;
        
        if (tipo === 'suspendida') {
          openConfirmModal({
            titulo: 'Mover a Inactivos',
            mensaje: `¿Deseas mover a ${email} al registro de usuarios inactivos? Esta acción registrará la fecha de baja.`,
            textoCancelar: 'Cancelar',
            textoAceptar: 'Mover a Inactivos',
            onAceptar: () => {
              adminService.moverInactivo(email).then(() => refrescarAdmin());
            }
          });
        } else {
          openConfirmModal({
            titulo: 'Rechazar solicitud',
            mensaje: `¿Deseas rechazar la solicitud de ${email}?`,
            textoCancelar: 'Cancelar',
            textoAceptar: 'Rechazar',
            onAceptar: () => {
              adminService.descartarRegistro(email).then(() => refrescarAdmin());
            }
          });
        }
      });
    });

    modalOverlay.querySelectorAll('.btn-autorizar-pendiente').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = btn.dataset.email;
        const tipo = btn.dataset.tipo;
        let titulo = 'Autorizar solicitud';
        let mensaje = `¿Deseas autorizar a ${email}?`;
        let accion = () => {
          const promesa = tipo === 'password' 
            ? adminService.resolverRestablecimiento(email)
            : tipo === 'registro' 
              ? adminService.autorizarRegistro(email)
              : adminService.reactivarUsuario(email);
          
          promesa.then(() => refrescarAdmin());
        };
        
        if (tipo === 'password') {
          titulo = 'Restablecer contraseña';
          mensaje = `¿Deseas restablecer la contraseña de ${email}?`;
        } else if (tipo === 'suspendida') {
          titulo = 'Reactivar cuenta';
          mensaje = `¿Deseas reactivar la cuenta de ${email}?`;
        }
        
        openConfirmModal({
          titulo: titulo,
          mensaje: mensaje,
          textoCancelar: 'Cancelar',
          textoAceptar: 'Aceptar',
          onAceptar: accion
        });
      });
    });

    modalOverlay.querySelectorAll('.btn-suspender-usuario').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = btn.dataset.id;
        openConfirmModal({
          titulo: 'Suspender Usuario',
          mensaje: '¿Estás seguro de bloquear temporalmente el acceso a este usuario? Podrás reactivarlo o moverlo a inactivos desde la sección de pendientes.',
          textoCancelar: 'Cancelar',
          textoAceptar: 'Suspender',
          onAceptar: () => {
            adminService.suspenderUsuario(userId).then(() => refrescarAdmin());
          }
        });
      });
    });

    modalOverlay.querySelectorAll('.btn-eliminar-inactivo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = btn.dataset.id;
        openConfirmModal({
          titulo: 'Eliminar Usuario',
          mensaje: 'Esta acción eliminará definitivamente al usuario del registro. ¿Deseas continuar?',
          textoCancelar: 'Cancelar',
          textoAceptar: 'Eliminar',
          onAceptar: () => {
            adminService.eliminarUsuarioInactivo(userId).then(() => refrescarAdmin());
          }
        });
      });
    });
  };

  // Función ASÍNCRONA para refrescar el contenido de administración tras una acción
  const refrescarAdmin = async () => {
    const adminContentContainer = modalOverlay.querySelector('#tab-content-admin');
    if (adminContentContainer) {
      const html = await renderAdminContent();
      adminContentContainer.innerHTML = html;
      setupAdminListeners();
    }
  };

  // Función ASÍNCRONA para cargar el contenido de administración
  const renderAdminContent = async () => {
    try {
      const [pendientes, activos, inactivos] = await Promise.all([
        adminService.getCuentasPendientes(),
        adminService.getUsuariosActivos(),
        adminService.getUsuariosInactivos()
      ]);

      return `
      <!-- Botón "+" en la parte superior derecha -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 0.5rem;">
        <button type="button" id="btn-add-user" style="width: 2rem; height: 2rem; padding: 0; border: none; border-radius: 0; background: transparent; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; display: flex; align-items: center; justify-content: center;">
          <img src="assets/icons/navigation/plus.svg" alt="Añadir Usuario" style="width: 24px; height: 24px; display: block;" />
        </button>
      </div>

      <!-- Bloque 1: Cuentas pendientes de atención -->
      <section style="border: none; background: transparent; padding: 0; margin-bottom: 0.5rem;">
        <button type="button" id="btn-toggle-pendientes" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0.5rem 0; background: transparent; border: none; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent;">
          <h4 style="margin: 0; font-size: 0.8rem; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.03em;">Cuentas pendientes de atención (${pendientes.length})</h4>
          <img src="assets/icons/navigation/chevron-down.svg" alt="Desplegar" id="chevron-pendientes" style="width: 18px; height: 18px; display: block;" />
        </button>
        <div id="body-pendientes" class="hidden" style="padding: 0.5rem 0;">
          ${pendientes.length === 0 ? '<p style="font-size: 0.85rem; color: #737373; margin: 0;">No hay cuentas pendientes de atención.</p>' : 
pendientes.map(item => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
              <div style="display: flex; flex-direction: column; gap: 0.1rem;">
                <span style="font-size: 0.9rem; font-weight: 700; color: #171717;">${item.email}</span>
                <span style="font-size: 0.8rem; color: #737373;">${item.detalle}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
                <button type="button" class="btn-rechazar-pendiente" data-email="${item.email}" data-tipo="${item.tipo}" style="width: 2rem; height: 2rem; padding: 0; border: none; border-radius: 0; background: transparent; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; display: flex; align-items: center; justify-content: center;">
                  <img src="assets/icons/navigation/x.svg" alt="Rechazar" style="width: 22px; height: 22px; display: block;" />
                </button>
                <button type="button" class="btn-autorizar-pendiente" data-email="${item.email}" data-tipo="${item.tipo}" style="width: 2rem; height: 2rem; padding: 0; border: none; border-radius: 0; background: transparent; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; display: flex; align-items: center; justify-content: center;">
                  <img src="assets/icons/navigation/check.svg" alt="Autorizar" style="width: 22px; height: 22px; display: block;" />
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Bloque 2: Directorio de Usuarios Activos -->
      <section style="border: none; background: transparent; padding: 0; margin-bottom: 0.5rem;">
        <button type="button" id="btn-toggle-activos" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0.5rem 0; background: transparent; border: none; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent;">
          <h4 style="margin: 0; font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em;">Directorio de Usuarios Activos</h4>
          <img src="assets/icons/navigation/chevron-down.svg" alt="Desplegar" id="chevron-activos" style="width: 18px; height: 18px; display: block;" />
        </button>
        <div id="body-activos" class="hidden" style="padding: 0.5rem 0;">
          ${activos.length === 0 ? '<p style="font-size: 0.85rem; color: #737373; margin: 0;">No hay usuarios activos.</p>' : 
activos.map(u => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 0.9rem; font-weight: 600; color: #171717;">${u.email}</span>
              <button type="button" class="btn-suspender-usuario" data-id="${u.id}" style="width: 2rem; height: 2rem; padding: 0; border: none; border-radius: 0; background: transparent; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; display: flex; align-items: center; justify-content: center;">
                <img src="assets/icons/navigation/ban.svg" alt="Suspender" style="width: 22px; height: 22px; display: block;" />
              </button>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Bloque 3: Registro de Usuarios Inactivos -->
      <section style="border: none; background: transparent; padding: 0;">
        <button type="button" id="btn-toggle-inactivos" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0.5rem 0; background: transparent; border: none; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent;">
          <h4 style="margin: 0; font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em;">Registro de Usuarios Inactivos (${inactivos.length})</h4>
          <img src="assets/icons/navigation/chevron-down.svg" alt="Desplegar" id="chevron-inactivos" style="width: 18px; height: 18px; display: block;" />
        </button>
        <div id="body-inactivos" class="hidden" style="padding: 0.5rem 0;">
          ${inactivos.length === 0 ? '<p style="font-size: 0.85rem; color: #737373; margin: 0;">No hay usuarios inactivos.</p>' : 
inactivos.map(u => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
              <div style="display: flex; flex-direction: column; gap: 0.1rem;">
                <span style="font-size: 0.9rem; font-weight: 600; color: #171717;">${u.email}</span>
                <span style="font-size: 0.75rem; color: #737373;">Baja: ${u.fechaBaja}</span>
              </div>
              <button type="button" class="btn-eliminar-inactivo" data-id="${u.id}" style="width: 2rem; height: 2rem; padding: 0; border: none; border-radius: 0; background: transparent; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; display: flex; align-items: center; justify-content: center;">
                <img src="assets/icons/navigation/trash-2.svg" alt="Eliminar" style="width: 22px; height: 22px; display: block;" />
              </button>
            </div>
          `).join('')}
        </div>
      </section>
    `;
    } catch (error) {
      console.error('❌ Error cargando datos de administración:', error);
      return '<p style="font-size: 0.85rem; color: #b91c1c;">Error al cargar datos de administración.</p>';
    }
  };

  // Diálogo de Nivel 3: "Añadir Usuario Autorizado"
  modalOverlay.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);

    if (target.closest('#btn-add-user')) {
      document.body.classList.add('modal-open');
      
      const addUserOverlay = document.createElement('div');
      addUserOverlay.className = 'modal-overlay level-3-overlay';
      
      addUserOverlay.innerHTML = `
        <div class="modal-card modal-level-3" style="border-radius: 0; box-shadow: none; width: min(360px, 92%); background: #ffffff; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
          <div class="modal-header-l3" style="border-bottom: 1px solid #e5e7eb; padding: 0.85rem 1rem; background: #ffffff; flex-shrink: 0;">
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #171717;">Añadir Usuario Autorizado</h3>
          </div>
          <div style="padding: 1rem 1rem 1.5rem 1rem; flex: 1;">
            <p style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: #737373; line-height: 1.5;">Introduce el identificador corporativo del nuevo usuario:</p>
            <div style="display: flex; align-items: center; justify-content: flex-start; gap: 0;">
              <input type="text" id="input-nuevo-usuario" placeholder="jperez" style="width: 50%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 0; font-size: 1rem; outline: none; -webkit-tap-highlight-color: transparent; text-align: right; background: #ffffff;" autofocus />
              <span style="padding: 10px 4px; font-size: 1rem; color: #171717; background: transparent; white-space: nowrap; flex-shrink: 0;">@bsa.cat</span>
            </div>
            <p id="adduser-error" style="font-size: 0.8rem; color: #b91c1c; display: none; margin-top: 0.5rem;">Introduce un identificador válido.</p>
          </div>
          <div class="form-group" style="padding: 0 1rem 1rem 1rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Rol del sistema:</label>
            <p style="font-size: 0.9rem; font-weight: 600; color: #171717; margin: 0; text-transform: uppercase;">Celador</p>
          </div>
          <div class="modal-footer-5050" style="display: flex; width: 100%; border-top: none; flex-shrink: 0;">
            <button type="button" class="btn-modal-cancel" id="btn-adduser-cancel" style="flex: 1; min-height: 48px; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; background-color: #f3f4f6; color: #171717;">Cancelar</button>
            <button type="button" class="btn-modal-accept" id="btn-adduser-accept" style="flex: 1; min-height: 48px; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; background-color: #171717; color: #ffffff;">Aceptar</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(addUserOverlay);
      
      const inputUsuario = addUserOverlay.querySelector('#input-nuevo-usuario');
      const btnCancel = addUserOverlay.querySelector('#btn-adduser-cancel');
      const btnAccept = addUserOverlay.querySelector('#btn-adduser-accept');
      const mensajeError = addUserOverlay.querySelector('#adduser-error');
      
      setTimeout(() => inputUsuario?.focus(), 100);
      
      const cerrarAddUser = () => {
        addUserOverlay.remove();
        if (!document.querySelector('.modal-overlay')) {
          document.body.classList.remove('modal-open');
        }
      };
      
      btnCancel.addEventListener('click', cerrarAddUser);
      
      btnAccept.addEventListener('click', () => {
        const valor = inputUsuario?.value?.trim() || '';
        if (!valor) {
          if (mensajeError) {
            mensajeError.textContent = 'Introduce un identificador válido.';
            mensajeError.style.display = 'block';
          }
          return;
        }
        // Ocultar mensaje de error si existe
        if (mensajeError) mensajeError.style.display = 'none';
        
        // 🔥 NUEVO: Añadir usuario con rol 'celador' por defecto
        adminService.agregarUsuarioAutorizado(valor, 'celador')
          .then(() => {
            refrescarAdmin();
            cerrarAddUser();
          })
          .catch((error) => {
            console.error('❌ Error añadiendo usuario:', error);
            if (mensajeError) {
              mensajeError.textContent = 'Error al añadir usuario. Inténtalo de nuevo.';
              mensajeError.style.display = 'block';
            }
          });
      });
      
      inputUsuario?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          btnAccept.click();
        }
      });
      
      return;
    }
  });

  // Carga inicial del contenido de administración si el modal se abre directamente en esa pestaña
  if (isAdmin && tabInicial === 'admin') {
    const adminContentContainer = modalOverlay.querySelector('#tab-content-admin');
    renderAdminContent().then(html => {
      if (adminContentContainer) adminContentContainer.innerHTML = html;
      setupAdminListeners();
    });
  }

  return { renderAdminContent, setupAdminListeners };
}