/**
 * js/services/resetService.js - Servicio Explícito de Reinicio Diario
 * Comprueba el cambio de fecha al iniciar o reanudar la PWA.
 * Coordina la purga de tareas extra, checklist, reset de filtros y caducidad del indicador de 5 días.
 */

import { storage } from './storage.js';
import { appState } from '../state/appState.js';

const LAST_RESET_KEY = 'celador_app_v1_last_reset_date';
let timerMedianoche = null;

export const resetService = {
  getFechaActual() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  checkAndExecute() {
    const hoy = this.getFechaActual();
    const ultimaFecha = localStorage.getItem(LAST_RESET_KEY);

    if (ultimaFecha && ultimaFecha < hoy) {
      console.log('🔄 Nuevo día detectado. Ejecutando reinicio diario...');
      this.ejecutarReinicioDiario();
      localStorage.setItem(LAST_RESET_KEY, hoy);
    } else if (!ultimaFecha) {
      localStorage.setItem(LAST_RESET_KEY, hoy);
    } else {
      // Si es la misma fecha, NO ejecutamos la purga
      appState.evaluarCaducidadIndicadores();
    }

    this.programarReinicioMedianoche();
  },

  async ejecutarReinicioDiario() {
    await storage.purgeDailyData();
    appState.ejecutarReinicioDiario();
  },

  programarReinicioMedianoche() {
    if (timerMedianoche) clearTimeout(timerMedianoche);

    const ahora = new Date();
    const medianoche = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 1);
    const msHastaMedianoche = medianoche.getTime() - ahora.getTime();

    timerMedianoche = setTimeout(() => {
      this.checkAndExecute();
    }, msHastaMedianoche);
  },

  init() {
    this.checkAndExecute();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndExecute();
      }
    });

    window.addEventListener('focus', () => {
      this.checkAndExecute();
    });
  }
};