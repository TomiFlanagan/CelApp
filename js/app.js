/**
 * js/app.js - Punto de entrada principal
 */

import { renderHeader } from './components/header.js';
import { renderUnidadView } from './components/unidadView.js';
import { renderPeriodoView, actualizarFranjaTrasMarcado } from './components/periodoView.js';
import {
  renderUnidadDock,
  updateUnidadDockStats,
  renderPeriodoDock,
  updatePeriodoDockStats
} from './components/dock.js';
import { openAlmacenModal } from './components/modals/almacenModal.js';
import { openEditorCamaModal } from './components/modals/editorCamaModal.js';
import { openFiltrosModal } from './components/modals/filtrosModal.js';
import { openConfirmModal } from './components/modals/confirmModal.js';
import { openTareasExtraModal } from './components/modals/tareasExtraModal.js';
import { openAjustesModal } from './components/modals/ajustesModal.js';
import { openHistorialModal } from './components/modals/historialModal.js';
import { openTrasladoModal } from './components/modals/trasladoModal.js';
import { renderLoginView } from './components/loginView.js';
import { appState } from './state/appState.js';
import { sync } from './services/sync.js';
import { resetService } from './services/resetService.js';
import { auth } from './services/auth.js';
import { storage } from './services/storage.js';

// 🔥 CAMBIADO: Variable global para guardar la posición del scroll antes de re-renderizar
window.scrollPositionBeforeUpdate = 0;
window.isRestoringScroll = false;

console.log('🚀 [APP] Módulo app.js cargado');

// Acciones de interacción de las tarjetas integradas con el Editor de Camas y Confirmación
const camaActions = {
  /**
   * Registra el cambio de despliegue de una tarjeta en el estado
   * Si se expande una cama, cierra todas las demás
   * @param {string} camaId
   * @param {boolean} isExpanded
   */
  onToggleExpand: (camaId, isExpanded) => {
    console.log('🔄 [APP] camaActions.onToggleExpand:', { camaId, isExpanded });
    const state = appState.getState();
    
    // Si estamos expandiendo, cerrar todas las demás camas
    if (isExpanded) {
      state.camas.forEach((/** @type {any} */ c) => {
        if (c.id !== camaId) {
          c.isExpanded = false;
        }
      });
    }
    
    // Actualizar el estado de la cama objetivo
    const target = state.camas.find((/** @type {any} */ c) => c.id === camaId);
    if (target) {
      target.isExpanded = isExpanded;
    }
    
    // Notificar el cambio para que se re-renderice la vista
    appState.notify('CAMA_TOGGLED', { camaId, isExpanded });
  },
  onEdit: (/** @type {Object} */ cama) => {
    console.log('🔄 [APP] camaActions.onEdit:', cama.id);
    // Guardar la posición antes de abrir el modal
    const mainContainer = document.getElementById('app');
    if (mainContainer) {
      window.scrollPositionBeforeUpdate = mainContainer.scrollTop;
      console.log('📏 [APP] scrollPositionBeforeUpdate guardado:', window.scrollPositionBeforeUpdate);
    }
    
    openEditorCamaModal(cama, (/** @type {Object} */ camaActualizada) => {
      console.log('✅ [APP] Editor cerrado, guardando cama:', camaActualizada.id);
      appState.saveCamaCompleta(camaActualizada);
    });
  },
  onTransfer: (/** @type {Object} */ cama) => {
    console.log('🔄 [APP] camaActions.onTransfer:', cama.id);
    // Guardar la posición antes de abrir el modal
    const mainContainer = document.getElementById('app');
    if (mainContainer) {
      window.scrollPositionBeforeUpdate = mainContainer.scrollTop;
      console.log('📏 [APP] scrollPositionBeforeUpdate guardado:', window.scrollPositionBeforeUpdate);
    }
    
    const state = appState.getState();
    openTrasladoModal(cama, state.camas, (/** @type {string} */ unidadDestino, /** @type {string} */ camaDestinoId) => {
      console.log('✅ [APP] Traslado confirmado:', { unidadDestino, camaDestinoId });
      appState.trasladarCama(cama.unidadId, cama.id, unidadDestino, camaDestinoId);
    });
  },
  onHistory: (/** @type {Object} */ cama) => {
    console.log('🔄 [APP] camaActions.onHistory:', cama.id);
    // 🔥 NUEVO: Guardar la posición antes de abrir el modal de historial
    const mainContainer = document.getElementById('app');
    if (mainContainer) {
      window.scrollPositionBeforeUpdate = mainContainer.scrollTop;
      console.log('📏 [APP] scroll guardado para historial:', window.scrollPositionBeforeUpdate);
    }
    openHistorialModal(cama);
  },
  onVacate: (/** @type {Object} */ cama) => {
    console.log('🔄 [APP] camaActions.onVacate:', cama.id);
    // Guardar la posición antes de abrir el modal
    const mainContainer = document.getElementById('app');
    if (mainContainer) {
      window.scrollPositionBeforeUpdate = mainContainer.scrollTop;
      console.log('📏 [APP] scrollPositionBeforeUpdate guardado:', window.scrollPositionBeforeUpdate);
    }
    
    openConfirmModal({
      titulo: 'Vaciar Cama',
      mensaje: `¿Deseas vaciar la información de la Cama ${cama.id}? Se eliminarán la asignación, atributos y rutinas.`,
      textoCancelar: 'Cancelar',
      textoAceptar: 'Aceptar',
      onAceptar: () => {
        console.log('✅ [APP] Vaciar cama confirmado:', cama.id);
        appState.vaciarCama(cama.unidadId, cama.id);
      }
    });
  },
  /**
   * Registra el visto de una cama y retira la alerta de cambios recientes
   * @param {string} camaId
   */
  onMarkAsViewed: (camaId) => {
    console.log('🔄 [APP] camaActions.onMarkAsViewed:', camaId);
    const state = appState.getState();
    const cama = state.camas.find((/** @type {any} */ c) => c.id === camaId);
    if (cama) {
      sync.updateCamaAttribute(cama.unidadId, camaId, 'tieneCambiosRecientes', false);
    }
  }
};

// Acciones de los botones del Dock Inferior
const dockHandlers = {
  onAlmacen: () => {
    console.log('🔄 [APP] dockHandlers.onAlmacen');
    const currentState = appState.getState();
    const unidadActiva = currentState.activeUnits.length > 0 ? currentState.activeUnits[0] : 'amarilla';
    openAlmacenModal(unidadActiva);
  },
  onFiltros: () => {
    console.log('🔄 [APP] dockHandlers.onFiltros');
    const currentState = appState.getState();
    openFiltrosModal(
      currentState.filtros,
      (/** @type {Object} */ nuevosFiltros) => {
        console.log('✅ [APP] Filtros aplicados:', nuevosFiltros);
        appState.setFiltros(nuevosFiltros);
      },
      () => {
        console.log('✅ [APP] Filtros limpiados');
        appState.limpiarFiltros();
      }
    );
  },
  onAjustes: () => {
    console.log('🔄 [APP] dockHandlers.onAjustes');
    const currentState = appState.getState();
    openAjustesModal(
      currentState,
      (/** @type {Object} */ nuevasPreferencias) => {
        console.log('✅ [APP] Preferencias actualizadas:', nuevasPreferencias);
        appState.updatePreferencias(nuevasPreferencias);
      },
      {
        onCambiarPassword: () => {
          console.log('🔄 [APP] onCambiarPassword');
          openConfirmModal({
            titulo: 'Cambiar Contraseña',
            mensaje: 'Introduce tu contraseña actual y la nueva contraseña corporativa.',
            textoCancelar: 'Cancelar',
            textoAceptar: 'Aceptar',
            showInputs: true,
            onAceptar: async (/** @type {any} */ credenciales) => {
              console.log('🔄 [APP] Cambiando contraseña...');
              if (!credenciales.nueva || credenciales.nueva !== credenciales.confirmar) {
                openConfirmModal({
                  titulo: 'Error',
                  mensaje: 'Las contraseñas nuevas no coinciden o están vacías.',
                  textoAceptar: 'Aceptar'
                });
                return;
              }

              const resultado = await auth.changePassword(credenciales.actual, credenciales.nueva);

              if (resultado.success) {
                openConfirmModal({
                  titulo: 'Contraseña Actualizada',
                  mensaje: 'Tu contraseña se ha modificado correctamente.',
                  textoAceptar: 'Aceptar'
                });
              } else if (resultado.reason === 'password_actual_incorrecta') {
                openConfirmModal({
                  titulo: 'Error',
                  mensaje: 'La contraseña actual no es correcta.',
                  textoAceptar: 'Aceptar'
                });
              } else {
                openConfirmModal({
                  titulo: 'Error',
                  mensaje: 'No se ha podido cambiar la contraseña. Inténtalo de nuevo.',
                  textoAceptar: 'Aceptar'
                });
              }
            }
          });
        },
        onCerrarSesion: () => {
          console.log('🔄 [APP] onCerrarSesion');
          openConfirmModal({
            titulo: 'Cerrar Sesión',
            mensaje: '¿Estás seguro de que deseas cerrar la sesión actual?',
            textoCancelar: 'Cancelar',
            textoAceptar: 'Aceptar',
            onAceptar: () => {
              console.log('✅ [APP] Cerrando sesión...');
              auth.logout();
              window.location.reload();
            }
          });
        },
        onBorrarCuenta: () => {
          console.log('🔄 [APP] onBorrarCuenta');
          openConfirmModal({
            titulo: 'Borrar Cuenta',
            mensaje: 'Esta acción eliminará definitivamente tu cuenta, el borrado de las preferencias personales asociadas y el cierre automático de la sesión de forma irreversible.',
            textoCancelar: 'Cancelar',
            textoAceptar: 'Aceptar',
            onAceptar: () => {
              console.log('✅ [APP] Borrando cuenta...');
              storage.clearAllData();
              auth.logout();
              window.location.reload();
            }
          });
        }
      }
    );
  },
  onExtraordinaria: () => {
    console.log('🔄 [APP] dockHandlers.onExtraordinaria');
    openTareasExtraModal();
  }
};

/**
 * Monta la aplicación principal (cabecera, vista activa y dock) una vez hay sesión iniciada.
 * @param {boolean} [esPrimerAcceso=false] - Si la sesión recién iniciada creó la cuenta en este momento
 */
function init(esPrimerAcceso = false) {
  console.log('🚀 [APP] init() INICIADO, esPrimerAcceso:', esPrimerAcceso);
  
  const mainContainer = document.getElementById('app');
  const headerContainer = document.getElementById('main-header');
  const dockContainer = document.getElementById('dock-container');

  console.log('📦 [APP] Contenedores encontrados:', {
    mainContainer: !!mainContainer,
    headerContainer: !!headerContainer,
    dockContainer: !!dockContainer
  });

  // Vuelve al layout normal: quita el modo login y reactiva header y dock
  if (mainContainer) {
    mainContainer.classList.remove('login-active');
    console.log('✅ [APP] Clase login-active eliminada de #app');
  }
  if (headerContainer) {
    headerContainer.style.display = '';
    console.log('✅ [APP] Header reactivado');
  }
  if (dockContainer) {
    dockContainer.style.display = '';
    console.log('✅ [APP] Dock reactivado');
  }

  console.log('📡 [APP] Inicializando resetService...');
  resetService.init();
  console.log('✅ [APP] resetService inicializado');

  if (!headerContainer || !mainContainer) {
    console.error('❌ [APP] headerContainer o mainContainer es null, abortando init');
    return;
  }

  console.log('📡 [APP] Recargando preferencias...');
  appState.reloadPreferences();
  console.log('✅ [APP] Preferencias recargadas');

  const updateUI = (event, payload) => {
    console.log(`🔄 [APP] updateUI() INICIADO, event: ${event}`);
    const state = appState.getState();

    // 🔥 NUEVO: Si es un evento que actualiza la vista de unidades, guardar/restaurar scroll
    const shouldPreserveScroll = event === 'CAMA_UPDATED' || 
                                  event === 'CAMA_TOGGLED' || 
                                  event === 'TAREAS_RECALCULATE' ||
                                  event === 'SYNC_UPDATED';
    console.log('📊 [APP] shouldPreserveScroll:', shouldPreserveScroll);

    // Guardar la posición actual del scroll antes de actualizar (si no hay una guardada)
    if (shouldPreserveScroll && !window.isRestoringScroll) {
      const container = document.getElementById('app');
      if (container) {
        // Solo guardar si es un evento que viene de una acción que ya guardó la posición
        // o si es un evento de sincronización que no debe perder la posición
        if (event === 'SYNC_UPDATED' || event === 'CAMA_TOGGLED') {
          window.scrollPositionBeforeUpdate = container.scrollTop;
          console.log('📏 [APP] scroll guardado en updateUI:', window.scrollPositionBeforeUpdate);
        }
      }
    }

    // Caso acotado: marcar/desmarcar una tarea en la Vista por Jornada no
    // cambia unidades activas, filtros, ni la estructura del dock — solo el
    // estado de una tarea concreta. Es, con diferencia, la acción que más
    // veces repite un celador en su turno, así que evitamos reconstruir las
    // 7 franjas completas y repintamos solo la franja afectada. El resto de
    // eventos (editar cama, tareas extra, sincronización...) sigue el camino
    // completo de siempre, sin ningún cambio.
    if (
      event === 'CHECKLIST_UPDATED' &&
      state.currentView === 'periodos' &&
      payload && typeof payload.key === 'string' &&
      mainContainer.querySelector('.periodos-view-container')
    ) {
      console.log('📌 [APP] CHECKLIST_UPDATED en vista periodos, actualizando solo franja');
      actualizarFranjaTrasMarcado(payload.key, state);
      return;
    }


    // 1. Renderizar Header
    console.log('📝 [APP] Renderizando header...');
    renderHeader(
      headerContainer,
      state,
      (/** @type {string} */ newView) => {
        console.log('🔄 [APP] Cambio de vista a:', newView);
        appState.setCurrentView(newView);
      },
      (/** @type {string} */ unitToggled) => {
        console.log('🔄 [APP] Toggle de unidad:', unitToggled);
        appState.toggleActiveUnit(unitToggled);
      }
    );
    console.log('✅ [APP] Header renderizado');

    // 2. Filtrar camas visibles según unidades y criterios de filtro activos
    const camasVisibles = appState.getFilteredCamas();
    console.log('📊 [APP] camasVisibles.length:', camasVisibles.length);

    // 3. Renderizar Vista Activa y Dock Inferior correspondiente
    if (state.currentView === 'unidades') {
      console.log('📝 [APP] Renderizando vista Unidades...');
      renderUnidadView(mainContainer, { ...state, camas: camasVisibles }, camaActions);

      if (dockContainer) {
        console.log('📝 [APP] Renderizando dock de Unidades...');
        renderUnidadDock(dockContainer, dockHandlers);
        updateUnidadDockStats(camasVisibles);
        console.log('✅ [APP] Dock de Unidades renderizado');
      }

      // Restaurar la posición del scroll después de renderizar
      if (shouldPreserveScroll && window.scrollPositionBeforeUpdate > 0) {
        console.log('🔄 [APP] Restaurando scroll a:', window.scrollPositionBeforeUpdate);
        window.isRestoringScroll = true;
        requestAnimationFrame(() => {
          // Esperar un frame adicional para que el DOM termine de renderizar
          requestAnimationFrame(() => {
            const container = document.getElementById('app');
            if (container) {
              // Limitar la posición al máximo posible
              const maxScroll = container.scrollHeight - container.clientHeight;
              const targetScroll = Math.min(window.scrollPositionBeforeUpdate, maxScroll);
              container.scrollTop = targetScroll;
              console.log(`🔄 [APP] Scroll restaurado a: ${targetScroll}px`);
            }
            window.isRestoringScroll = false;
          });
        });
        // No limpiar la posición aquí porque la necesitamos para la restauración
        // La limpiaremos después de restaurar
        setTimeout(() => {
          window.scrollPositionBeforeUpdate = 0;
        }, 300);
      }
    } else {
      console.log('📝 [APP] Renderizando vista Periodos...');
      renderPeriodoView(mainContainer, state, camaActions);

      if (dockContainer) {
        console.log('📝 [APP] Renderizando dock de Periodos...');
        renderPeriodoDock(dockContainer, dockHandlers);
        updatePeriodoDockStats(camasVisibles);
        console.log('✅ [APP] Dock de Periodos renderizado');
      }
    }
    console.log('✅ [APP] updateUI() FINALIZADO');
  };

  window.addEventListener('tareasExtraUpdated', () => {
    console.log('📢 [APP] Evento tareasExtraUpdated recibido');
    updateUI();
  });

  console.log('📎 [APP] Suscribiendo appState...');
  appState.subscribe((event, payload) => {
    console.log(`📢 [APP] appState.subscribe: event=${event}`);
    updateUI(event, payload);
  });
  console.log('✅ [APP] appState suscrito');

  console.log('📝 [APP] Ejecutando updateUI inicial...');
  updateUI();
  console.log('✅ [APP] updateUI inicial ejecutado');

  // Flujo de Onboarding: se dispara únicamente cuando el login acaba de crear la cuenta
  if (esPrimerAcceso) {
    console.log('🎓 [APP] Primer acceso detectado, mostrando onboarding...');
    setTimeout(() => {
      console.log('🎓 [APP] Abriendo ajustes para onboarding...');
      openAjustesModal(appState.getState(), (/** @type {Object} */ nuevasPreferencias) => {
        console.log('✅ [APP] Preferencias guardadas desde onboarding:', nuevasPreferencias);
        appState.updatePreferencias(nuevasPreferencias);
      }, {
        onCerrarSesion: () => {
          auth.logout();
          window.location.reload();
        },
        onBorrarCuenta: () => {
          storage.clearAllData();
          auth.logout();
          window.location.reload();
        }
      }, 'preferencias');
    }, 400);
  }
  
  console.log('✅ [APP] init() FINALIZADO');
}

/**
 * Punto de arranque: comprueba si hay sesión activa antes de montar la aplicación.
 * Si no la hay, muestra la pantalla de acceso.
 */
async function bootstrap() {
  console.log('🚀 [APP] bootstrap() INICIADO');
  
  const headerContainer = document.getElementById('main-header');
  const mainContainer = document.getElementById('app');
  const dockContainer = document.getElementById('dock-container');

  console.log('📦 [APP] Contenedores en bootstrap:', {
    headerContainer: !!headerContainer,
    mainContainer: !!mainContainer,
    dockContainer: !!dockContainer
  });

  if (!mainContainer) {
    console.error('❌ [APP] #app NO ENCONTRADO en bootstrap');
    return;
  }

  console.log('🔐 [APP] auth.isAuthenticated():', auth.isAuthenticated());
  console.log('👤 [APP] auth.getCurrentUser():', auth.getCurrentUser());

  // Si ya hay sesión iniciada, esperamos a que sync cargue los datos con el token
  // antes de montar la interfaz, para que las tareas extra ya estén disponibles.
  if (auth.isAuthenticated()) {
    console.log('✅ [APP] Usuario autenticado, cargando datos iniciales...');
    await sync.cargarDatosIniciales();
    console.log('✅ [APP] Datos iniciales cargados');
    appState.reloadChecklist();
    console.log('✅ [APP] Checklist recargado');
    init(false);
    console.log('✅ [APP] init() ejecutado desde bootstrap');
    return;
  }

  console.log('👤 [APP] Usuario NO autenticado, mostrando login...');

  // Oculta por completo el header y el dock (no basta con vaciar su contenido,
  // ya que su clase CSS reserva altura fija y fondo blanco aunque estén vacíos)
  if (headerContainer) {
    headerContainer.innerHTML = '';
    headerContainer.style.display = 'none';
    console.log('📌 [APP] Header ocultado');
  }
  if (dockContainer) {
    dockContainer.innerHTML = '';
    dockContainer.style.display = 'none';
    console.log('📌 [APP] Dock ocultado');
  }

  console.log('📝 [APP] Llamando a renderLoginView...');
  renderLoginView(mainContainer, async (/** @type {Object} */ _user, /** @type {boolean} */ esPrimerAcceso) => {
    console.log('✅ [APP] Login exitoso, usuario:', _user);
    // 🔥 CORRECCIÓN CRÍTICA: Al hacer login, el token debe estar guardado y accesible.
    // Verificamos que auth.getCurrentUser() exista antes de llamar a sync.cargarDatosIniciales().
    if (!auth.getCurrentUser()) {
      console.error('❌ [APP] Error: El token de sesión no se ha guardado correctamente después del login.');
      return;
    }
    console.log('✅ [APP] Token de sesión verificado');
    await sync.cargarDatosIniciales();
    console.log('✅ [APP] Datos iniciales cargados después de login');
    appState.reloadChecklist();
    console.log('✅ [APP] Checklist recargado después de login');
    init(esPrimerAcceso);
    console.log('✅ [APP] init() ejecutado después de login');
  });
  console.log('✅ [APP] renderLoginView llamada (continúa ejecución)');
  console.log('✅ [APP] bootstrap() FINALIZADO');
}

console.log('📎 [APP] Registrando event listener DOMContentLoaded');
document.addEventListener('DOMContentLoaded', () => {
  console.log('📢 [APP] DOMContentLoaded disparado');
  bootstrap();
});