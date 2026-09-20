const HONDURAS_TIMEZONE = 'America/Tegucigalpa';

/**
 * Devuelve la fecha de hoy (YYYY-MM-DD) calculada SIEMPRE en la zona
 * horaria de Honduras (America/Tegucigalpa), sin importar en qué
 * servidor o zona horaria esté corriendo el backend.
 */
export function getHondurasDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HONDURAS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}