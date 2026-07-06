/**
 * Verifica si un evento cerrado ha expirado superando el día de gracia de 24 horas.
 * Un evento solo es considerado "pasado" (revelado) si la fecha actual es
 * estrictamente mayor que fechaElegida + 1 día (el día de gracia).
 */
export function isPastEvent(fechaElegida?: string, estado?: string): boolean {
  if (estado !== "cerrado" || !fechaElegida) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = fechaElegida.split("-");
  if (parts.length !== 3) return false;
  
  const graceDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  graceDate.setHours(0, 0, 0, 0);
  graceDate.setDate(graceDate.getDate() + 1); // Día de gracia de 24 horas

  return today.getTime() > graceDate.getTime();
}

/**
 * Formatea un string de fecha "YYYY-MM-DD" a formato legible en español (ej: "Lunes 13").
 */
export function formatVoteDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
  
  const date = new Date(year, month - 1, day);
  const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const dayName = daysOfWeek[date.getDay()];
  const dayNum = date.getDate();
  const monthName = months[date.getMonth()];
  
  return `${dayName} ${dayNum} de ${monthName}`;
}
