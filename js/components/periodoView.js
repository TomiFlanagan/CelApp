// @ts-nocheck
/**
 * js/components/periodoView.js
 * Vista Nivel 1: Organización y listado cronológico por Períodos Horarios.
 */

import { getFranjasOrdenadas, getFranjaActualId, getTurnoByFranjaId } from '../config/franjas.js';
import { TAREAS_EXTRA } from '../config/tareasExtra.js';
import { storage } from '../services/storage.js';
import { appState } from '../state/appState.js';
import { updateDockStats } from './dock.js';
import { createTareaCard } from './tareaCard.js';

let renderTimeout = null;

function calcularTareasSuprimidas(camas, franjasOrdenadas, checklist, activeOrden, turnoActual) {
  const suprimidas = new Set();
  camas.forEach((/** @type {any} */ cama) => {
    const franjaActiva = franjasOrdenadas.find(f => f.orden === activeOrden);
    if (!franjaActiva) return;
    const accionActual = cama.rutinas?.[franjaActiva.id];
    if (!accionActual || accionActual === 'nada') return;
    let accionAnterior = null, franjaAnteriorId = null;
    for (let i = activeOrden - 1; i >= 0; i--) {
      const f = franjasOrdenadas.find(f => f.orden === i);
      if (!f) continue;
      const turnoFranja = getTurnoByFranjaId(f.id);
      const esMismoTurno = turnoFranja === turnoActual || turnoFranja === 'ambos';
      if (!esMismoTurno) continue;
      const accion = cama.rutinas?.[f.id];
      if (accion && accion !== 'nada') { accionAnterior = accion; franjaAnteriorId = f.id; break; }
    }
    if (!accionAnterior || !franjaAnteriorId) return;
    if (accionAnterior === accionActual) return;
    const taskKeyAnterior = `${cama.id}_${franjaAnteriorId}_${accionAnterior}`;
    if (!Boolean(checklist[taskKeyAnterior])) {
      suprimidas.add(`${cama.id}_${franjaActiva.id}_${accionActual}`);
    }
  });
  return suprimidas;
}

function construirTareasFranja(franja, camas, checklist, activeOrden, tareasSuprimidas, turnoActual) {
  const tareasFranja = [], idsVistos = new Set(), camasUnicas = [];
  camas.forEach(c => { if (!idsVistos.has(c.id)) { idsVistos.add(c.id); camasUnicas.push(c); } });
  camasUnicas.forEach(cama => {
    const accion = cama.rutinas?.[franja.id];
    if (accion && accion !== 'nada') {
      const key = `${cama.id}_${franja.id}_${accion}`;
      if (tareasSuprimidas.has(key)) return;
      const isCompleted = Boolean(checklist[key]);
      const turnoFranja = getTurnoByFranjaId(franja.id);
      const isOverdue = !isCompleted && (franja.orden < activeOrden) && (turnoFranja === turnoActual || turnoFranja === 'ambos');
      tareasFranja.push({
        key,
        cama: appState.getState().camas.find(c => c.id === cama.id) || cama,
        accion,
        isOverdue,
        isCompleted,
        isExpanded: appState.getTareaExpanded(key)
      });
    }
  });
  const activeUnits = appState.state.activeUnits || [];
  
  // 🔥 CORRECCIÓN DEFINITIVA: Leer SIEMPRE desde appState (si hay datos) o desde storage
  let tareasExtra = appState.getState().tareasExtra && appState.getState().tareasExtra.length > 0
    ? appState.getState().tareasExtra
    : storage.getExtraTasks();

  console.log(`📋 Tareas extra cargadas: ${tareasExtra.length}`);
  tareasExtra.forEach(te => {
    if ((te.franjaId || te.franja) === franja.id && (activeUnits.length === 0 || !(te.unidadId || te.unidad) || activeUnits.includes(te.unidadId || te.unidad))) {
      const key = `extra_${te.id}`;
      const isCompleted = Boolean(te.completada || checklist[key]);
      const turnoFranja = getTurnoByFranjaId(franja.id);
      const isOverdue = !isCompleted && (franja.orden < activeOrden) && (turnoFranja === turnoActual || turnoFranja === 'ambos');
      const tipoAccion = te.tipo || te.accion;
      const defTarea = TAREAS_EXTRA.find(t => t.id === tipoAccion);
      tareasFranja.push({
        key,
        isExtra: true,
        cama: appState.getState().camas.find(c => c.id === te.habitacionCama) || { id: te.habitacionCama || '', atributos: {}, esPacienteCelador: false },
        accion: tipoAccion,
        nombreAccion: defTarea ? defTarea.nombre : tipoAccion,
        iconoAccion: defTarea?.icono || null,
        isOverdue,
        isCompleted,
        isExpanded: appState.getTareaExpanded(key),
        tareaExtraData: te
      });
    }
  });
  tareasFranja.sort((a, b) => a.cama.id.localeCompare(b.cama.id, undefined, { numeric: true }));
  return tareasFranja;
}

export function renderPeriodoView(container, state = {}) {
  console.log('🚀 [PERIODOVIEW] renderPeriodoView() INICIADO');
  console.log('📦 [PERIODOVIEW] container:', container);
  console.log('📊 [PERIODOVIEW] container?.id:', container?.id);
  console.log('📊 [PERIODOVIEW] state.currentView:', state?.currentView);
  
  if (!container) {
    console.error('❌ [PERIODOVIEW] container es null o undefined');
    return;
  }
  
  if (renderTimeout) { 
    console.log('🧹 [PERIODOVIEW] Limpiando timeout anterior');
    clearTimeout(renderTimeout); 
    renderTimeout = null; 
  }
  
  console.log('🧹 [PERIODOVIEW] Limpiando container.innerHTML...');
  container.innerHTML = '';
  console.log('✅ [PERIODOVIEW] container.innerHTML limpiado');

  const viewContainer = document.createElement('div');
  viewContainer.className = 'periodos-view-container';

  const activeFranjaId = getFranjaActualId();
  console.log('📊 [PERIODOVIEW] activeFranjaId:', activeFranjaId);
  
  const selectedFranjaId = appState.getFranjaEfectivaId();
  console.log('📊 [PERIODOVIEW] selectedFranjaId:', selectedFranjaId);
  
  const franjas = getFranjasOrdenadas();
  console.log('📊 [PERIODOVIEW] franjas.length:', franjas.length);
  
  const activeFranjaObj = franjas.find(f => f.id === activeFranjaId);
  const activeOrden = activeFranjaObj ? activeFranjaObj.orden : 0;
  const turnoActual = activeFranjaObj ? getTurnoByFranjaId(activeFranjaId) : 'manana';
  
  console.log('📊 [PERIODOVIEW] activeOrden:', activeOrden, 'turnoActual:', turnoActual);
  
  const camasData = appState.getFilteredCamas();
  console.log('📊 [PERIODOVIEW] camasData.length:', camasData.length);
  
  // 🔥 CORRECCIÓN DEFINITIVA: Leer el checklist SIEMPRE desde appState
  const checklist = {
    ...(appState.getState().checklist || {})
  };
  console.log('📊 [PERIODOVIEW] checklist keys:', Object.keys(checklist).length);
  
  const tareasSuprimidas = calcularTareasSuprimidas(camasData, franjas, checklist, activeOrden, turnoActual);
  console.log('📊 [PERIODOVIEW] tareasSuprimidas.size:', tareasSuprimidas.size);
  
  const tareasPorFranja = franjas.map(franja => ({ franja, tareas: construirTareasFranja(franja, camasData, checklist, activeOrden, tareasSuprimidas, turnoActual) }));
  console.log('📊 [PERIODOVIEW] tareasPorFranja generado');

  const tareasAtrasadasParaHoy = tareasPorFranja
    .filter(({ franja }) => {
      if (franja.orden >= activeOrden) return false;
      const turnoFranja = getTurnoByFranjaId(franja.id);
      return turnoFranja === turnoActual || turnoFranja === 'ambos';
    })
    .flatMap(({ tareas }) => tareas.filter(t => !t.isCompleted));
  
  console.log('📊 [PERIODOVIEW] tareasAtrasadasParaHoy.length:', tareasAtrasadasParaHoy.length);

  tareasPorFranja.forEach(({ franja, tareas }) => {
    const isExpanded = franja.id === selectedFranjaId;
    const esFranjaActual = franja.id === activeFranjaId;
    const tareasSeccion = esFranjaActual ? [...tareas, ...tareasAtrasadasParaHoy].sort((a, b) => a.cama.id.localeCompare(b.cama.id, undefined, { numeric: true })) : tareas;
    console.log(`📌 [PERIODOVIEW] Franja ${franja.id}: ${tareasSeccion.length} tareas (isExpanded=${isExpanded})`);
    viewContainer.appendChild(createPeriodoSection(franja, tareasSeccion, isExpanded, state));
  });

  console.log('📎 [PERIODOVIEW] Añadiendo viewContainer a container...');
  container.appendChild(viewContainer);
  console.log('📎 [PERIODOVIEW] Llamando a updateDockStats...');
  updateDockStats(camasData, state);
  console.log('✅ [PERIODOVIEW] renderPeriodoView() FINALIZADO');
  console.log('📏 [PERIODOVIEW] container.innerHTML.length:', container.innerHTML.length);
}

function createPeriodoSection(franja, tareasFranja, isExpanded, state) {
  console.log(`🔧 [PERIODOVIEW] createPeriodoSection() para ${franja.id}, tareas=${tareasFranja.length}, isExpanded=${isExpanded}`);
  
  const section = document.createElement('section');
  section.className = `periodo-section periodo-${franja.id} ${isExpanded ? '' : 'collapsed'}`;
  section.dataset.franjaId = franja.id;

  const pendingTasks = tareasFranja.filter(t => !t.isCompleted);
  const completedTasks = tareasFranja.filter(t => t.isCompleted);

  const chevronIcon = isExpanded 
    ? 'assets/icons/navigation/chevron-up.svg' 
    : 'assets/icons/navigation/chevron-down.svg';

  const header = document.createElement('header');
  header.className = 'periodo-header';
  header.style.outline = 'none';
  header.style.webkitTapHighlightColor = 'transparent';
  
  header.innerHTML = `
    <div class="periodo-title-group">
      <h3 class="periodo-name">${franja.nombre}</h3>
    </div>
    <img src="${chevronIcon}" alt="Desplegar" class="periodo-chevron" />
  `;
  
  header.addEventListener('click', () => {
    const wasCollapsed = section.classList.contains('collapsed');
    const parent = section.parentElement;
    
    if (parent) {
      parent.querySelectorAll('.periodo-section').forEach(sec => {
        sec.classList.add('collapsed');
        const chevron = sec.querySelector('.periodo-chevron');
        if (chevron) {
          chevron.src = 'assets/icons/navigation/chevron-down.svg';
        }
      });
    }
    
    if (wasCollapsed) {
      section.classList.remove('collapsed');
      const chevron = section.querySelector('.periodo-chevron');
      if (chevron) {
        chevron.src = 'assets/icons/navigation/chevron-up.svg';
      }
      appState.setFranjaSeleccionada(franja.id);
      updateDockStats([], state);
      
      // 🔥 NUEVO: Forzar scroll al principio de la franja expandida
      // Usamos requestAnimationFrame para asegurarnos de que el DOM ya está actualizado
      requestAnimationFrame(() => {
        // Pequeño retraso adicional para que el navegador termine de calcular el layout
        setTimeout(() => {
          const appContainer = document.getElementById('app');
          if (appContainer) {
            // Calcular la posición del header de la franja respecto al contenedor
            const sectionRect = section.getBoundingClientRect();
            const containerRect = appContainer.getBoundingClientRect();
            const offset = sectionRect.top - containerRect.top;
            
            // Desplazar el contenedor para que el header de la franja quede arriba
            appContainer.scrollTop += offset;
          }
        }, 50);
      });
    }
  });

  const cardsGrid = document.createElement('div');
  cardsGrid.className = 'periodo-cards-grid';

  if (tareasFranja.length === 0) {
    cardsGrid.innerHTML = `<div class="empty-periodo-message"><span>Sin tareas programadas</span></div>`;
  } else {
    pendingTasks.forEach(task => {
      const card = createTareaCard(task, franja, state);
      if (card && card instanceof HTMLElement) {
        cardsGrid.appendChild(card);
      } else {
        console.warn('⚠️ createTareaCard devolvió un valor inválido:', task);
      }
    });
    
    if (completedTasks.length > 0) {
      const separator = document.createElement('hr');
      separator.className = 'completed-separator';
      
      const toggleText = document.createElement('span');
      toggleText.className = 'completed-toggle-text';
      toggleText.textContent = `Mostrar tareas completadas (${completedTasks.length})`;
      
      const completedContainer = document.createElement('div');
      completedContainer.className = 'completed-tasks-container hidden';
      completedTasks.forEach(task => {
        const card = createTareaCard(task, franja, state);
        if (card && card instanceof HTMLElement) {
          completedContainer.appendChild(card);
        }
      });
      
      toggleText.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = completedContainer.classList.contains('hidden');
        if (isHidden) {
          completedContainer.classList.remove('hidden');
          toggleText.textContent = `Ocultar tareas completadas (${completedTasks.length})`;
        } else {
          completedContainer.classList.add('hidden');
          toggleText.textContent = `Mostrar tareas completadas (${completedTasks.length})`;
        }
      });
      
      cardsGrid.appendChild(separator);
      cardsGrid.appendChild(toggleText);
      cardsGrid.appendChild(completedContainer);
    }
  }

  section.appendChild(header);
  section.appendChild(cardsGrid);
  
  console.log(`✅ [PERIODOVIEW] createPeriodoSection() para ${franja.id} FINALIZADO`);
  
  return section;
}

/**
 * Repinta únicamente la franja afectada por marcar/desmarcar una tarea, en
 * lugar de reconstruir las 7 franjas completas (que es lo que hace
 * renderPeriodoView). Solo es seguro usar esta función para el evento
 * CHECKLIST_UPDATED: marcar una tarea nunca cambia su cama, su franja de
 * origen ni la lista de tareas extraordinarias, así que el resto de datos
 * permanece igual. Para cualquier otro cambio (editar cama, crear/editar/
 * eliminar tarea extra, sincronización remota) se sigue usando el repintado
 * completo de renderPeriodoView, sin modificar ese camino.
 *
 * Si la tarea marcada pertenece a una franja anterior a la franja activa
 * (la de la hora real), también se repinta la franja activa, porque las
 * tareas atrasadas pendientes de franjas previas se muestran dentro de ella.
 *
 * @param {string} taskKey - Clave de la tarea, con formato '{camaId}_{franjaId}_{accion}' o 'extra_{id}'
 * @param {Object} [state={}]
 */
export function actualizarFranjaTrasMarcado(taskKey, state = {}) {
  console.log('🔄 [PERIODOVIEW] actualizarFranjaTrasMarcado() INICIADO, taskKey:', taskKey);
  
  const container = document.getElementById('app');
  if (!container) {
    console.error('❌ [PERIODOVIEW] #app no encontrado en actualizarFranjaTrasMarcado');
    return;
  }

  const franjas = getFranjasOrdenadas();

  // Determinar a qué franja pertenece la tarea marcada
  let franjaOrigenId = null;
  if (taskKey.startsWith('extra_')) {
    const extraId = taskKey.replace('extra_', '');
    const tareasExtra = appState.getState().tareasExtra || [];
    const tareaExtra = tareasExtra.find(t => t.id === extraId);
    franjaOrigenId = tareaExtra ? (tareaExtra.franjaId || tareaExtra.franja || null) : null;
    console.log('📊 [PERIODOVIEW] Tarea extra, franjaOrigenId:', franjaOrigenId);
  } else {
    // Los IDs de franja pueden contener '_' (ej. 'primera_hora'), así que se
    // busca por coincidencia exacta contra las franjas conocidas en vez de
    // usar split('_'), que sería ambiguo.
    const franjaEncontrada = franjas.find(f => taskKey.includes(`_${f.id}_`));
    franjaOrigenId = franjaEncontrada ? franjaEncontrada.id : null;
    console.log('📊 [PERIODOVIEW] Tarea normal, franjaOrigenId:', franjaOrigenId);
  }

  // Si no se puede determinar la franja de origen con seguridad, se recurre
  // al repintado completo de siempre (comportamiento anterior, sin riesgo).
  if (!franjaOrigenId) {
    console.log('⚠️ [PERIODOVIEW] No se pudo determinar franjaOrigenId, haciendo render completo');
    renderPeriodoView(container, state);
    return;
  }

  const activeFranjaId = getFranjaActualId();
  const selectedFranjaId = appState.getFranjaEfectivaId();
  const franjaOrigenObj = franjas.find(f => f.id === franjaOrigenId);
  const activeFranjaObj = franjas.find(f => f.id === activeFranjaId);
  const activeOrden = activeFranjaObj ? activeFranjaObj.orden : 0;
  const turnoActual = activeFranjaObj ? getTurnoByFranjaId(activeFranjaId) : 'manana';

  const franjasAActualizar = new Set([franjaOrigenId]);
  // Si la franja de origen es anterior a la activa, su cambio puede afectar
  // a la lista de "atrasadas" que se muestra dentro de la franja activa.
  if (franjaOrigenObj && activeFranjaObj && franjaOrigenObj.orden < activeFranjaObj.orden) {
    franjasAActualizar.add(activeFranjaId);
    console.log('📊 [PERIODOVIEW] Franja origen anterior a activa, actualizando también:', activeFranjaId);
  }
  
  console.log('📊 [PERIODOVIEW] franjasAActualizar:', [...franjasAActualizar].join(', '));

  const camasData = appState.getFilteredCamas();
  const checklist = { ...(appState.getState().checklist || {}) };
  const tareasSuprimidas = calcularTareasSuprimidas(camasData, franjas, checklist, activeOrden, turnoActual);

  const tareasPorFranja = franjas.map(franja => ({
    franja,
    tareas: construirTareasFranja(franja, camasData, checklist, activeOrden, tareasSuprimidas, turnoActual)
  }));

  const tareasAtrasadasParaHoy = tareasPorFranja
    .filter(({ franja }) => {
      if (franja.orden >= activeOrden) return false;
      const turnoFranja = getTurnoByFranjaId(franja.id);
      return turnoFranja === turnoActual || turnoFranja === 'ambos';
    })
    .flatMap(({ tareas }) => tareas.filter(t => !t.isCompleted));

  franjasAActualizar.forEach(franjaId => {
    const seccionActual = container.querySelector(`.periodo-section[data-franja-id="${franjaId}"]`);
    const entry = tareasPorFranja.find(({ franja }) => franja.id === franjaId);
    if (!seccionActual || !entry) {
      console.warn('⚠️ [PERIODOVIEW] No se encontró sección o entry para franja:', franjaId);
      return;
    }

    const isExpanded = franjaId === selectedFranjaId;
    const esFranjaActual = franjaId === activeFranjaId;
    const tareasSeccion = esFranjaActual
      ? [...entry.tareas, ...tareasAtrasadasParaHoy].sort((a, b) => a.cama.id.localeCompare(b.cama.id, undefined, { numeric: true }))
      : entry.tareas;

    console.log(`📌 [PERIODOVIEW] Reemplazando sección ${franjaId} con ${tareasSeccion.length} tareas`);
    const nuevaSeccion = createPeriodoSection(entry.franja, tareasSeccion, isExpanded, state);
    seccionActual.replaceWith(nuevaSeccion);
  });

  updateDockStats(camasData, state);
  console.log('✅ [PERIODOVIEW] actualizarFranjaTrasMarcado() FINALIZADO');
}