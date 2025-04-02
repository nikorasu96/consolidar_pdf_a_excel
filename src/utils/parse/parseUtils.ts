// src/utils/parse/parseUtils.ts
const MONTHS_MAP: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

/**
 * Convierte una cadena de fecha en formato "dd/XXX/yyyy" (ej: "19/JUL/2022") a un objeto Date.
 * Retorna null si la cadena no coincide con el formato.
 */
export function parseDate(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  const match = trimmed.match(/^(\d{1,2})\/([A-Z]{3})\/(\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthIndex = MONTHS_MAP[match[2]];
    const year = parseInt(match[3], 10);
    if (Number.isNaN(day) || Number.isNaN(year) || monthIndex === undefined) return null;
    return new Date(year, monthIndex, day);
  }
  return null;
}

/**
 * Intenta parsear una cadena a número entero; retorna null si falla.
 */
export function parseIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  const num = parseInt(trimmed, 10);
  return isNaN(num) ? null : num;
}

/**
 * Intenta parsear una cadena a número flotante; retorna null si falla.
 */
export function parseFloatOrNull(value: string): number | null {
  const trimmed = value.trim();
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

/**
 * Convierte una cadena a booleano para representar un bit (por ejemplo, "x" o "1").
 */
export function parseBit(value: string): boolean {
  return value.trim().toLowerCase() === "x" || value.trim() === "1";
}
