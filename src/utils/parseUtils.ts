// utils/parseUtils.ts

/**
 * Funciones de parseo comunes utilizadas en el proyecto.
 */

const MONTHS_MAP: Record<string, number> = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };
  
  /**
   * Convierte una cadena de fecha a un objeto Date.
   *
   * Soporta los siguientes formatos:
   * 1. "dd/XXX/yyyy" (por ejemplo, "19/JUL/2022")
   * 2. "XXX/yyyy" (por ejemplo, "JUL/2024") – se asume día 1.
   * 3. "AAAAMMDD" (por ejemplo, "20250319")
   * 4. "dd/mm/yyyy" (por ejemplo, "19/03/2025")
   */
  export function parseDate(value: string): Date | null {
    if (!value) return null;
  
    const trimmed = value.trim().toUpperCase();
  
    // 1) Formato "dd/XXX/yyyy" (ejemplo: "19/JUL/2022")
    let match = trimmed.match(/^(\d{1,2})\/([A-Z]{3})\/(\d{4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthAbbrev = match[2];
      const year = parseInt(match[3], 10);
      const monthIndex = MONTHS_MAP[monthAbbrev];
      if (Number.isNaN(day) || Number.isNaN(year) || monthIndex === undefined) {
        return null;
      }
      return new Date(year, monthIndex, day);
    }
  
    // 2) Formato "XXX/yyyy" (ejemplo: "JUL/2024")
    match = trimmed.match(/^([A-Z]{3})\/(\d{4})$/);
    if (match) {
      const monthAbbrev = match[1];
      const year = parseInt(match[2], 10);
      const monthIndex = MONTHS_MAP[monthAbbrev];
      if (Number.isNaN(year) || monthIndex === undefined) {
        return null;
      }
      // Se asume día 1
      return new Date(year, monthIndex, 1);
    }
  
    // 3) Formato "AAAAMMDD" (ejemplo: "20250319")
    if (/^\d{8}$/.test(trimmed)) {
      const year = parseInt(trimmed.substring(0, 4), 10);
      const month = parseInt(trimmed.substring(4, 6), 10);
      const day = parseInt(trimmed.substring(6, 8), 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month - 1, day);
      }
      return null;
    }
  
    // 4) Formato "dd/mm/yyyy" (ejemplo: "19/03/2025")
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const [dayStr, monthStr, yearStr] = parts;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
  
    // Si no coincide con ninguno de los formatos, retorna null
    return null;
  }
  
  export function parseIntOrNull(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const num = parseInt(trimmed, 10);
    return isNaN(num) ? null : num;
  }
  
  export function parseFloatOrNull(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const num = parseFloat(trimmed);
    return isNaN(num) ? null : num;
  }
  
  export function parseBit(value: string): boolean {
    const trimmed = value.trim().toLowerCase();
    return trimmed === "x" || trimmed === "1";
  }
  