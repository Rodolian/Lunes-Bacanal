export interface Vote {
  email: string;
  fechas_elegidas: string[];
}

export interface Event {
  id: string;
  motivo?: string;
  fechas_propuestas?: string[];
  fecha_tope?: string;
  creador_uid?: string;
  creador_email?: string;
  votantes_pendientes?: string[];
  fecha_elegida?: string;
  fecha_evento?: string;
  votos?: Vote[];
  estado?: string; // 'abierto' | 'cerrado' | 'empate'
  fechas_empatadas?: string[];
}

export interface UserProfile {
  uid?: string;
  email?: string;
  nombre?: string;
  photoURL?: string | null;
}
