**1. 🎭 Funcionalidad Core (Experiencia de Evento)**
Votación de Ubicación: Además de la fecha, el organizador podría proponer 2 o 3 opciones de lugares (o si es en casa de alguien) y que también se vote. Esta ubicación podría mantenerse en secreto hasta el día de la revelación.

Confirmación Final (RSVP): Aunque la gente haya votado que puede una fecha, la vida da muchas vueltas. Añadir un botón de "Confirmar Asistencia Final" que se active cuando se revela el evento, para que el organizador sepa exactamente cuántos van a ir y calcular comida/bebida.

Gestión de Tareas (¿Qué llevo?): Una vez revelado el evento, habilitar una pequeña sección donde los asistentes puedan apuntar qué van a llevar (ej: "Paco trae cervezas", "María trae pizzas"), evitando así la repetición.

Animación de Revelación: Hacer que el descubrimiento del motivo sea una experiencia épica en la interfaz web.

Cuando un evento pasa al estado "Pasado", en lugar de solo mostrar el texto, requerir que el usuario haga clic en un botón "Revelar Secreto" que tenga una animación (tipo confeti, o quemar un papel) para ver el motivo y el organizador.

**2. 📱 Notificaciones y Comunicación**
Notificaciones Push / PWA: Convertir la aplicación en una PWA (Progressive Web App) para que los usuarios puedan instalarla en sus móviles (iOS/Android) como si fuera una app nativa, y enviar notificaciones Push directamente al teléfono, reduciendo la dependencia del correo electrónico.

Recordatorios Automáticos 24h antes: Un cronjob extra que avise a los confirmados un día antes: "¡Prepárate! Mañana es el Lunes de Bacanal de [Nombre del Organizador]".

Muro de Comentarios Anónimos: Un pequeño chat dentro de cada evento (antes de revelarse) donde la gente pueda intentar adivinar de qué va el tema de forma anónima, creando hype ("Seguro que alguien se casa", "Esto huele a despido").

**3. 🏆 Gamificación y Social**
Estadísticas y Rankings (El Hall of Fame de Bacanales): Crear una pestaña de estadísticas donde se vea:
El más Bacanalero: Quién ha asistido a más eventos.

El Misterioso: Quién propone más eventos.

El Rápido: Quién es el que primero vota siempre.

Álbum de Recuerdos: Permitir que, una vez pasado el evento, los asistentes puedan subir un par de fotos a ese evento en la plataforma, creando un histórico de recuerdos de cada "Lunes de Bacanal".

**4. ⚙️ Administración y Arquitectura**
Soporte Multi-Grupo: Ahora mismo todos los usuarios de la base de datos ven los mismos eventos. Si la app crece, podrías permitir crear "Tribus" o "Grupos" (ej: "Amigos de la Uni", "Compañeros de Trabajo") para que los eventos estén aislados por grupo.

Sincronización Bidireccional de Calendario: En lugar de solo "Añadir a Google Calendar", permitir que los usuarios conecten su Google Calendar. Así, cuando alguien va a proponer fechas, el sistema puede sugerir automáticamente "El Lunes 15 parece que todos lo tienen libre en sus calendarios".

Gestión de Permisos / Roles: Tener un rol de "Súper Administrador" en Firebase que pueda borrar eventos cancelados por error, banear usuarios, o forzar resoluciones de empates sin tener que entrar directamente en la base de datos de Firestore.
