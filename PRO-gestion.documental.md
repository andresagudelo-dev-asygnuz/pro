# PRO — Intake de producto (documento maestro)

**Sobre el nombre del archivo:** `PRO-gestion.documental.md` se refiere a **gestionar el conjunto de documentación** de investigación y requisitos de PRO, no a un producto de gestión documental empresarial (GED).

**Estructura canónica de la fábrica:** el mismo contenido debe ir migrando a **`docs/intake/01`–`08`** (ver `docs/intake/00-indice-y-alcance.md` para el mapa sección → archivo). Este archivo sigue siendo la fuente única hasta completar la migración.

## Qué es PRO (síntesis)

Ecosistema digital para **deportistas amateur y semipro** y **organizadores** (torneos, complejos deportivos, marcas). Narrativa central: experiencia “tipo profesional / FIFA” — perfiles con estadísticas, equipos, transferencias, retos, torneos y red social. En encuesta/validación se acota **primera fase: fútbol, mayores de edad**.

## Mapa de este documento

| Sección (aprox.) | Contenido | Para el equipo |
|------------------|-----------|----------------|
| Metodologías | Design Thinking, FODA, tendencias, brainstorming, SCAMPER | Referencia de ideación; no es entregable de producto. |
| Informe torneos (Juan Pablo) | Objetivos, perfiles, RF1–RF8, RNF, módulos | **Principal fuente** para pasar a `docs/01-requisitos-funcionales.md` / HU. |
| Estudio de mercado (Manizales) | MVP app, hiperlocal, KPI | **Segunda narrativa** de MVP (móvil, mapa, comunidad); puede chocar con el informe de torneos. |
| Encuestas | Preguntas deportistas / profesionales | Material de validación (Pereira/Manizales). |
| Business plan | Visión 3–10 años, monetización, alianzas | Roadmap; no confundir con alcance del primer MVP técnico. |

## Decisión abierta (antes de cerrar Gate 1)

En el texto conviven **dos MVPs posibles**: (1) **plataforma amplia** de torneos + social + live + feed (muchas RF del informe); (2) **app móvil acotada** hiperlocal (Manizales) con mapa, grupos y tracking básico. Hay que **elegir una historia de MVP** por iteración y plasmarla en `docs/00-prd.md`; el resto queda explícitamente en fase 2+ o hipótesis.

---

## Metodologías de ideación (referencia)

### Metodologías basadas en la observación y el análisis

Estas metodologías se basan en la premisa de que las mejores ideas de negocio surgen de la comprensión profunda de los problemas y comportamientos de las personas.
1. Design Thinking:
    *   Enfoque: Se centra en la empatía con el usuario. La primera fase, "Empatizar", es clave. Consiste en observar y escuchar a las personas para entender sus problemas, necesidades y deseos.
    *   Herramientas: Entrevistas en profundidad, observación etnográfica, mapas de empatía.
    *   Ventaja: Permite descubrir "dolores" ocultos o no verbalizados por los usuarios, que son la fuente de grandes oportunidades de negocio.
    *   Ejemplo: Observar a la gente en un supermercado podría revelar la frustración por la falta de información nutricional clara, lo que podría llevar a una aplicación que escanee productos y brinde esta información.
2. Análisis FODA (SWOT):
    *   Enfoque: Evalúa la situación de un mercado o sector desde un punto de vista interno y externo.
    *   Herramientas: Matriz FODA:
        *   Fortalezas (Strengths): Ventajas internas.
        *   Oportunidades (Opportunities): Factores externos positivos.
        *   Debilidades (Weaknesses): Desventajas internas.
        *   Amenazas (Threats): Factores externos negativos.
    *   Ventaja: Permite identificar brechas en el mercado y cómo las propias habilidades o recursos pueden aprovecharlas.
    *   Ejemplo: Si analizas el mercado de las mascotas, una "oportunidad" podría ser la creciente humanización de los animales, mientras que una "fortaleza" tuya podría ser el conocimiento en nutrición, lo que te llevaría a crear un negocio de alimentos saludables y personalizados para perros.
3. Análisis de Tendencias (Megatendencias):
    *   Enfoque: Consiste en identificar y analizar cambios a gran escala en la sociedad, la tecnología, la economía, el medio ambiente, etc.
    *   Herramientas: Informes de consultoras especializadas, análisis de noticias, estudios demográficos.
    *   Ventaja: Permite anticiparse a los cambios y posicionarse en mercados emergentes.
    *   Ejemplo: La tendencia hacia la sostenibilidad y la economía circular podría generar la idea de un negocio de reciclaje de residuos tecnológicos o de fabricación de productos a partir de materiales reciclados.

### Metodologías basadas en la creatividad y la ideación

Estas metodologías buscan estimular el pensamiento divergente para generar una gran cantidad de ideas que luego se puedan refinar.
1. Brainstorming (Lluvia de ideas):
    *   Enfoque: Generar el mayor número de ideas posible en un corto período de tiempo, sin juzgarlas en el momento.
    *   Herramientas: Pizarrón, notas adhesivas, herramientas digitales de colaboración.
    *   Ventaja: Fomenta la creatividad y la participación de un grupo, permitiendo que una idea inspire otra.
    *   Ejemplo: En una sesión de brainstorming sobre "soluciones para la vida en la ciudad", podrían surgir ideas como "servicios de micro-movilidad", "huertos urbanos comunitarios" o "plataformas para intercambiar habilidades".
2. SCAMPER:
    *   Enfoque: Es una técnica que utiliza una serie de preguntas para modificar y mejorar ideas existentes o para generar nuevas a partir de un objeto o concepto.
    *   Herramientas: Un listado de preguntas:
        *   S - Sustituir: ¿Qué se puede sustituir? (materiales, personas, procesos).
        *   C - Combinar: ¿Qué se puede combinar? (ideas, productos, servicios).
        *   A - Adaptar: ¿Qué se puede adaptar de otro contexto?
        *   M - Modificar/Maximizar/Minimizar: ¿Qué se puede cambiar en tamaño, forma o función?
        *   P - Ponerle otros usos: ¿Para qué otra cosa se puede usar?
        *   E - Eliminar: ¿Qué se puede eliminar? (pasos, características, costos).
        *   R - Reordenar/Invertir: ¿Qué pasaría si se invierte el proceso?
    *   Ventaja: Es una guía estructurada para la creatividad, ideal para superar el bloqueo creativo.
    *   Ejemplo: Aplicando SCAMPER a una "silla", podrías preguntarte: ¿Qué pasaría si "eliminamos" las patas? (silla flotante), ¿Y si la "combinamos" con una mesa? (mueble híbrido), ¿Y si la "ponemos" en un "uso" diferente, como un gimnasio? (silla para hacer ejercicio).

### Enfoque recomendado:

Para este nivel inicial y de alto nivel que mencionas, la combinación de metodologías es lo más potente:
1. Empieza por la observación: Utiliza el Design Thinking o el análisis de tendencias para identificar una necesidad o un problema real. No busques una solución, busca un "dolor".
2. Luego, pasa a la ideación: Una vez que tengas el problema bien definido, utiliza el Brainstorming o el SCAMPER para generar la mayor cantidad de ideas de solución posibles para ese problema específico.
Este proceso te permitirá pasar de la "identificación de una necesidad/potencialidad" a la "generación de una idea de negocio" de manera estructurada y con un fundamento sólido en las necesidades del mercado.

## Perfil del negocio (completar)

_Pendiente: resumen de fundadores, roles y contacto si aplica._

## Estudio de pre-factibilidad

_Pendiente o enlazar informe formal si existe versión aparte._

## Informe de idea de negocio y requerimientos (Juan Pablo)

### Plataforma de gestión de torneos deportivos (y red social deportiva)

## 1\. Introducción

El presente informe detalla la idea de negocio para una plataforma digital orientada a deportes en grupo, con un enfoque inicial en el fútbol. La plataforma busca conectar y facilitar la interacción entre dos perfiles principales: jugadores/deportistas y promotores de eventos deportivos. El objetivo es crear un ecosistema donde los jugadores puedan visibilizar su perfil deportivo y los promotores puedan organizar y gestionar torneos de manera eficiente.
* * *
## 2\. Objetivos

### 2.1 Objetivo General

Crear una plataforma digital gratuita (en su fase MVP) que sirva como una red social y herramienta de gestión para conectar a jugadores de fútbol con promotores de eventos deportivos, facilitando la organización, participación y seguimiento de torneos, y permitiendo a los jugadores construir su perfil deportivo.

### 2.2 Objetivos Específicos

*   Fase 1 (MVP - Gratuito):
    *   Desarrollar perfiles de jugador detallados y personalizables.
    *   Implementar la funcionalidad de creación y gestión de equipos por parte de los jugadores.
    *   Permitir a los promotores de eventos crear, configurar y gestionar torneos personalizados.
    *   Facilitar la inscripción de equipos o jugadores individuales a los torneos.
    *   Proveer un sistema de seguimiento y visualización de resultados, clasificaciones y estadísticas de torneos en tiempo real.
    *   Incorporar funcionalidades de red social (feed, notificaciones, chat) para la interacción entre usuarios.
    *   Garantizar la protección de datos y la confidencialidad de la información del usuario.
    *   Ofrecer una interfaz de usuario atractiva y similar a la de los videojuegos deportivos (FIFA, NBA).
*   Fases Futuras (Post-MVP):
    *   Integrar un módulo para la gestión y asignación de perfiles de árbitros.
    *   Desarrollar un sistema de resolución de disputas o reclamos durante los torneos.
    *   Integrar un sistema de pagos para las inscripciones a torneos.
* * *

## 3\. Perfiles de Usuario

La plataforma estará diseñada para interactuar con los siguientes tipos de usuarios:

### 3.1. Jugador / Deportista

*   Creación de Perfil: Posibilidad de crear un perfil detallado tipo red social.
*   Información del Perfil:
    *   Foto de perfil con diseño "tipo ficha" de jugador profesional (similar a FIFA).
    *   Estadísticas de Juego: Cantidad de partidos jugados, minutos jugados, goles, asistencias, atajadas (para arqueros), premios y reconocimientos.
    *   Información Deportiva: Posición(es) donde juega, equipos a los que pertenece/ha pertenecido, historial de equipos, logros, cantidad de trofeos.
    *   Validación de Calidad: Espacio para que otros jugadores, deportistas o entrenadores validen/califiquen la calidad de juego del deportista.
*   Creación y Gestión de Equipos: Los jugadores pueden crear sus propios equipos, asignarles nombres e historiales.
*   Interacción Social:
    *   Feed: Ver publicaciones de amigos, equipos y torneos seguidos.
    *   Notificaciones: Recibir notificaciones sobre logros, avances, estadísticas, comunicados de equipo y actualizaciones de torneos.
    *   Chat/Mensajería: Comunicación directa con otros jugadores y promotores.
    *   Invitación a Partidos: Función para invitar amigos a jugar un partido, buscando por posición.
*   Participación en Torneos:
    *   Inscripción a torneos, ya sea individualmente (el software arma equipos aleatoriamente) o por equipo.
    *   Seguimiento en tiempo real de partidos y torneos en los que está inscrito o siguiendo.
*   Personalización de Perfil:
    *   Configurar las estadísticas visibles.
    *   Personalizar los colores de su "uniforme" virtual y los colores de su equipo dentro del perfil.
*   Verificación de Edad: Subir foto de documento de identidad para validar la edad al crear el perfil.

### 3.2. Promotor de Eventos Deportivos

*   Creación y Gestión de Torneos:
    *   Crear torneos de fútbol (y otros deportes en grupo a futuro).
    *   Configurar reglas del torneo (duración de partidos, frecuencia, fases eliminatorias, etc.).
    *   Parametrizar de forma _customizable_ todos los detalles del torneo.
    *   Definir grupos y sorteos de enfrentamientos (la plataforma los generaría aleatoriamente).
    *   Especificar ubicación (ciudad, barrio, canchas disponibles), horarios, cantidad de equipos, nivel de dificultad (amateur, semi-profesional, profesional), categorías por edades.
    *   Indicar si tiene costo de inscripción (por ahora se gestionaría externamente).
    *   Publicar información de contacto del organizador.
*   Invitación a Equipos: Buscar equipos ya creados por jugadores y enviarles invitaciones para participar en sus torneos.
*   Actualización de Información del Torneo:
    *   Diligenciar y actualizar resultados de partidos (goles, tarjetas, ganador/perdedor).
    *   Actualizar tablas de posiciones y estadísticas (goleadores, etc.) en tiempo real.
    *   Las actualizaciones se publican automáticamente en el feed de la red social y notifican a los interesados.
*   Validación de Inscripciones: Opción para que el promotor valide los comprobantes de pago de inscripción con estados ("Aprobado", "Rechazado" o "Pendiente").
*   Comunicación: Mensajería directa con jugadores y equipos.
* * *

## 4\. Requerimientos Funcionales Detallados

### 4.1. Módulo de Perfiles de Usuario

*   RF1.1: El sistema debe permitir la creación de perfiles de jugador y promotor.
*   RF1.2: El sistema debe permitir a los jugadores cargar una foto de perfil y personalizarla con un diseño tipo "ficha de jugador".
*   RF1.3: El sistema debe permitir a los jugadores ingresar y actualizar su posición(es) de juego, equipos actuales y pasados, e historial de logros (trofeos, reconocimientos).
*   RF1.4: El sistema debe permitir a los jugadores ingresar y actualizar sus estadísticas de juego (partidos jugados, minutos, goles, asistencias, atajadas).
*   RF1.5: El sistema debe permitir a otros usuarios (jugadores, entrenadores) validar o calificar la calidad de juego de un deportista en su perfil.
*   RF1.6: El sistema debe permitir a los jugadores personalizar los colores de su "uniforme" y los colores de su equipo en su perfil.
*   RF1.7: El sistema debe requerir la carga de un documento de identidad para la verificación de la edad del jugador al crear el perfil.

### 4.2. Módulo de Equipos

*   RF2.1: El sistema debe permitir a los jugadores crear y nombrar sus propios equipos.
*   RF2.2: El sistema debe permitir a los jugadores gestionar la pertenencia de otros jugadores a su equipo.
*   RF2.3: El sistema debe permitir a los jugadores ver la información y estadísticas de los miembros de su equipo.

### 4.3. Módulo de Gestión de Torneos

*   RF3.1: El sistema debe permitir a los promotores crear nuevos torneos de fútbol.
*   RF3.2: El sistema debe permitir a los promotores configurar las reglas específicas del torneo (duración de partidos, formato eliminatorio, etc.).
*   RF3.3: El sistema debe permitir a los promotores definir la ubicación del torneo (ciudad, barrio, canchas).
*   RF3.4: El sistema debe permitir a los promotores establecer horarios aproximados para los partidos.
*   RF3.5: El sistema debe permitir a los promotores especificar la cantidad de equipos participantes.
*   RF3.6: El sistema debe permitir a los promotores clasificar el torneo por nivel de dificultad (Amateur, Semi-Profesional, Profesional).
*   RF3.7: El sistema debe permitir a los promotores establecer categorías por edades para los participantes.
*   RF3.8: El sistema debe permitir a los promotores indicar si el torneo tiene costo de inscripción (gestión externa en MVP).
*   RF3.9: El sistema debe permitir a los promotores cargar su información de contacto.
*   RF3.10: El sistema debe generar y sortear los grupos y enfrentamientos de los torneos de forma aleatoria según la configuración del promotor.
*   RF3.11: El sistema debe permitir a los promotores invitar equipos existentes a participar en sus torneos.
*   RF3.12: El sistema debe permitir a los promotores actualizar los resultados de cada partido (goles, tarjetas, ganador/perdedor).
*   RF3.13: El sistema debe actualizar automáticamente las tablas de posiciones y estadísticas (goleadores) del torneo en base a los resultados ingresados.
*   RF3.14: El sistema debe permitir a los promotores validar los comprobantes de pago de inscripción, con estados "Aprobado", "Rechazado" o "Pendiente".

### 4.4. Módulo de Inscripción y Participación en Torneos

*   RF4.1: El sistema debe permitir la inscripción de equipos completos a un torneo.
*   RF4.2: El sistema debe permitir la inscripción de jugadores individuales a un torneo.
*   RF4.3: Si se inscriben jugadores individuales, el sistema debe armar equipos de forma automática y aleatoria.
*   RF4.4: El sistema debe permitir a los jugadores seguir torneos específicos para recibir actualizaciones.

### 4.5. Módulo de Interacción Social y Comunicación

*   RF5.1: El sistema debe contar con un feed principal donde se muestren publicaciones (logros, avances, estadísticas) de amigos, equipos y torneos seguidos.
*   RF5.2: El sistema debe enviar notificaciones push a los usuarios sobre:
    *   Actualizaciones de logros, avances y estadísticas de amigos/seguidos.
    *   Comunicados y noticias de los equipos a los que pertenecen.
    *   Avances, resultados y noticias de los torneos en los que están inscritos o siguiendo.
    *   Invitaciones a torneos y a partidos.
*   RF5.3: El sistema debe incluir una funcionalidad de chat/mensajería para la comunicación entre jugadores y promotores.
*   RF5.4: El sistema debe permitir a los jugadores invitar a sus amigos a partidos específicos, con la opción de buscar por posición (ej. "busco arquero").
*   RF5.5: El sistema debe permitir a los usuarios comentar y reaccionar con emojis a las publicaciones en el feed.

### 4.6. Módulo de Visualización de Información

*   RF6.1: El sistema debe mostrar tablas de posiciones claras y actualizadas para cada torneo.
*   RF6.2: El sistema debe mostrar los resultados detallados de cada partido, incluyendo goles, anotadores y tarjetas.
*   RF6.3: El sistema debe permitir a los usuarios hacer seguimiento a un partido en tiempo real viendo la información que el promotor está subiendo.
*   RF6.4: El sistema debe mostrar un ranking de goleadores por torneo.
*   RF6.5: El sistema debe permitir la búsqueda de jugadores, equipos y torneos por nombre.
*   RF6.6: El sistema debe permitir filtros de búsqueda de torneos por nivel de dificultad, categorías de edad, deporte y ciudad.

### 4.7. Módulo de Transmisiones en Vivo (MVP Básico)

*   RF7.1: El sistema debe permitir a los promotores realizar transmisiones en vivo de partidos (funcionalidad básica tipo Instagram Live).
*   RF7.2: Durante las transmisiones en vivo, los usuarios deben poder enviar comentarios y reacciones (emojis).
*   RF7.3: Durante las transmisiones en vivo, los usuarios deben poder enviar pronósticos de marcador.

### 4.8. Módulo de Soporte y Ayuda

*   RF8.1: El sistema debe incluir un chat de soporte para que los usuarios dejen comentarios y reciban respuestas.
*   RF8.2: El soporte debe estar disponible durante horas de oficina acordadas (revisar redacción: cobertura 7×8 u otro SLA explícito).
* * *

## 5\. Requerimientos No Funcionales

*   RNF1: Rendimiento: La plataforma debe ser rápida y responsiva, con tiempos de carga mínimos para perfiles, feeds y resultados de torneos.
*   RNF2: Escalabilidad: La arquitectura debe permitir un crecimiento futuro en el número de usuarios, torneos y funcionalidades.
*   RNF3: Seguridad: La información del usuario debe estar protegida bajo estrictas políticas de confidencialidad y cumplimiento de la ley de protección de datos.
*   RNF4: Usabilidad: La interfaz de usuario debe ser intuitiva, fácil de usar y visualmente atractiva, con un diseño moderno inspirado en videojuegos deportivos (FIFA, NBA).
*   RNF5: Disponibilidad: La plataforma debe estar disponible la mayor parte del tiempo, minimizando el tiempo de inactividad.
*   RNF6: Mantenibilidad: El código debe ser modular y fácil de mantener y actualizar.
*   RNF7: Compatibilidad: La plataforma debe ser compatible con los navegadores web modernos y dispositivos móviles (diseño responsivo).
* * *

## 6\. Módulos Propuestos

Considerando los requerimientos, la arquitectura de software podría agruparse en los siguientes módulos principales:
*   Módulo de Gestión de Usuarios y Perfiles: Encargado de la creación, autenticación, gestión y personalización de perfiles de jugadores y promotores, incluyendo la verificación de identidad y edad.
*   Módulo de Equipos: Maneja la creación, administración y unión de jugadores a equipos.
*   Módulo de Gestión de Torneos: Contiene toda la lógica para la creación, configuración, sorteo, gestión de reglas y actualización de la información de los torneos.
*   Módulo de Comunicación y Social (Red Social): Incluye el feed de noticias, el sistema de notificaciones, el chat/mensajería interna y las funcionalidades de invitación a partidos.
*   Módulo de Visualización de Datos: Responsable de la presentación de tablas de posiciones, resultados detallados de partidos, estadísticas de jugadores y funciones de búsqueda y filtrado.
*   Módulo de Transmisiones en Vivo: Implementa la funcionalidad básica de streaming y la interacción de los usuarios durante las transmisiones.
*   Módulo de Soporte al Usuario: Gestión de consultas y soporte técnico.
*   Módulo de Administración Interna: Herramientas para la gestión de usuarios, torneos y moderación de contenido (no detallado en este informe pero implícito).

## Estudio de mercado

### Análisis de mercado (IA / Manizales)
**Introducción: El Potencial Inexplorado de los Deportes Aficionados en Manizales**
Manizales, ubicada en el corazón del eje cafetero de Colombia, ostenta una tradición deportiva vibrante y duradera. Durante décadas, la ciudad ha cultivado una fuerte cultura de participación atlética y ferviente apoyo en una diversa gama de disciplinas. Este entusiasmo arraigado se evidencia aún más por la variedad de instalaciones deportivas disponibles en toda la ciudad, que satisfacen una multitud de intereses. Desde los campos de golf meticulosamente mantenidos y las canchas de fútbol bien equipadas hasta las canchas de tenis y squash de tamaño reglamentario, las numerosas piscinas y los versátiles escenarios de baloncesto y voleibol, Manizales ofrece amplias oportunidades para que sus residentes participen en sus actividades deportivas preferidas. La presencia de organizaciones establecidas como el Club Manizales, que ofrece un amplio espectro de deportes desde golf y fútbol hasta squash y natación, subraya la naturaleza organizada y la popularidad de los deportes aficionados en la región. Esta infraestructura existente y la participación activa que fomenta sugieren un terreno fértil para una aplicación móvil diseñada para servir a la comunidad deportiva aficionada local.
Si bien los atletas aficionados de Manizales están claramente impulsados por una pasión genuina por los deportes que eligen, existe una disparidad notable al comparar su acceso a recursos y herramientas con el de los atletas profesionales. A menudo, los atletas aficionados carecen de los sofisticados sistemas de seguimiento del rendimiento, las capacidades analíticas profundas y las plataformas comunitarias dedicadas que están fácilmente disponibles para sus contrapartes profesionales. Esta brecha presenta una oportunidad significativa. La evidencia sugiere que los atletas aficionados albergan aspiraciones de elevar sus habilidades, forjar conexiones más fuertes con otros entusiastas y experimentar un nivel de compromiso más inmersivo y profesional dentro de sus actividades deportivas. Una aplicación móvil adaptada a las necesidades específicas de este grupo demográfico en Manizales podría cerrar eficazmente esta brecha, ofreciendo características y funcionalidades que satisfacen sus deseos de mejora, conexión y una experiencia deportiva general mejorada.
**Análisis Profundo del Mercado**
Un examen del panorama deportivo en Manizales revela varias disciplinas que gozan de gran popularidad entre los atletas aficionados. La disponibilidad de instalaciones en lugares destacados como el Club Manizales, junto con menciones en diversas fuentes de investigación, indica que el fútbol (incluida la variante de fútbol 5), el tenis, la natación, el baloncesto y el ciclismo son particularmente prevalentes en la ciudad. Además, la existencia de organizaciones y ligas deportivas locales dedicadas al fútbol y al tenis solidifica aún más la noción de una comunidad estructurada y comprometida en torno a estas actividades. Dada esta concentración de interés y participación, un Producto Mínimo Viable (MVP) inicial que se centre en estos deportes altamente populares atendería estratégicamente al segmento más grande de la población de atletas aficionados en Manizales. Al priorizar estas actividades deportivas bien establecidas, la aplicación puede aprovechar eficazmente una base de usuarios sustancial desde su inicio.
Para proporcionar una perspectiva más clara sobre la prevalencia de diferentes deportes en Manizales, la siguiente tabla resume las menciones de deportes aficionados populares dentro de los fragmentos de investigación:
**Tabla 1: Deportes Aficionados Populares en Manizales (Basado en Menciones en Fragmentos)**

| Deporte | Menciones en Fragmentos |
| ---| --- |
| Fútbol/Fútbol 5 | 14 |
| Tenis | 11 |
| Natación | 7 |
| Baloncesto | 7 |
| Ciclismo | 3 |
| Golf | 3 |
| Voleibol | 3 |
| Squash | 2 |

Comprender las motivaciones detrás de la participación de los atletas aficionados en los deportes es crucial para desarrollar una aplicación exitosa. La investigación indica que estas personas generalmente están impulsadas por una combinación de factores, que incluyen la satisfacción personal derivada de la mejora de habilidades y el logro de marcas personales, la búsqueda de beneficios para la salud y el estado físico, el deseo de interacción social y un sentido de comunidad, y el disfrute intrínseco de la actividad elegida. Dentro del contexto específico de Manizales, existe un interés documentado en instalaciones y oportunidades recreativas fácilmente disponibles, destacando una necesidad potencial de una aplicación que proporcione información y facilite el acceso a los recintos deportivos locales. Además, la aspiración expresada entre los atletas aficionados de experimentar sus deportes de una manera similar a los profesionales sugiere una demanda de características que respalden el seguimiento del rendimiento, el análisis profundo y, potencialmente, la orientación sobre metodologías de entrenamiento. En consecuencia, es probable que los atletas aficionados en Manizales busquen una aplicación móvil que no solo les permita conectarse con otros atletas y descubrir oportunidades deportivas locales, sino que también les permita monitorear su progreso, analizar su rendimiento y, en última instancia, mejorar su experiencia deportiva general.
El mercado de aplicaciones móviles en Colombia ya cuenta con una diversa gama de soluciones deportivas y de fitness. Estas incluyen aplicaciones generales de seguimiento de la condición física, plataformas que proporcionan noticias deportivas y resultados en tiempo real, y numerosas aplicaciones de apuestas deportivas. Si bien algunas aplicaciones existentes incorporan características de creación de comunidad y otras ofrecen funcionalidades que podrían percibirse como "tipo PRO", como el análisis estadístico avanzado, parece haber una brecha en el mercado. Easycancha, con su presencia en Colombia y su enfoque en facilitar la reserva de instalaciones deportivas, indica una demanda existente de soluciones móviles dentro del dominio deportivo. Esto sugiere una oportunidad para crear una aplicación distinta que combine específicamente un fuerte enfoque comunitario adaptado a los atletas aficionados en Manizales con características integrales que emulan una experiencia deportiva profesional. Este nicho particular parece estar desatendido por la gama actual de aplicaciones disponibles.
Manizales presenta una base poblacional sustancial, con estimaciones que sitúan el número de residentes alrededor de 450,000 a 460,000 en 2025. Si bien las cifras precisas sobre el número de atletas aficionados dentro de esta población no están fácilmente disponibles, la cultura deportiva demostrablemente activa de la ciudad sugiere fuertemente una base de usuarios potencial considerable para una aplicación móvil dedicada. La tendencia creciente de adopción de aplicaciones móviles en Colombia, junto con el éxito de plataformas relacionadas con el deporte como easycancha, indica una disposición general entre los atletas para adoptar tales soluciones digitales. Considerando el tamaño de la población de la ciudad y el evidente interés tanto en los deportes como en la tecnología móvil, el tamaño potencial del mercado para un MVP dirigido específicamente a los atletas aficionados en Manizales parece ser significativo. Incluso si solo una fracción de la población participa activamente en deportes aficionados, esto representaría un número sustancial de usuarios potenciales para una oferta inicial de producto.
**Propuesta de Valor Mejorada: Elevando la Experiencia Amateur**
Para atender eficazmente las aspiraciones de los atletas aficionados en Manizales, la aplicación móvil propuesta ofrecerá un conjunto de características principales diseñadas para emular una experiencia deportiva profesional. Esto incluye funcionalidades avanzadas de seguimiento del rendimiento que van más allá de las métricas básicas, proporcionando estadísticas detalladas relevantes para deportes específicos. Por ejemplo, los jugadores de baloncesto podrían rastrear la precisión de tiro y el conteo de rebotes, los entusiastas del fútbol podrían monitorear las tasas de pases completados y la distancia recorrida, y los nadadores podrían analizar sus tiempos por vuelta y la eficiencia de brazada. Complementando esto, la aplicación incorporará herramientas de análisis de rendimiento, permitiendo a los usuarios interpretar sus datos, identificar áreas que necesitan mejora y monitorear su progreso a lo largo del tiempo. Para mejorar aún más su entrenamiento, los atletas tendrán acceso a una biblioteca de planes de entrenamiento, recomendaciones de ejercicios y, potencialmente, conexiones con entrenadores locales o programas de entrenamiento especializados. La integración perfecta con dispositivos wearables populares permitirá el seguimiento y la sincronización automáticos de los datos de rendimiento, optimizando la experiencia del usuario \[, , , , \].
Más allá de la mejora del rendimiento individual, la aplicación se centrará en construir una comunidad deportiva local vibrante dentro de Manizales. Cada atleta podrá crear un perfil detallado, mostrando sus deportes preferidos, niveles de habilidad y objetivos atléticos. Las características diseñadas para facilitar la conexión permitirán a los usuarios encontrar fácilmente compañeros de entrenamiento, organizar sesiones de práctica o partidos amistosos, e incluso formar equipos para ligas o torneos locales. Se integrará un directorio completo de instalaciones deportivas en todo Manizales, proporcionando información sobre la disponibilidad de recintos, opciones de reserva (potencialmente a través de alianzas con plataformas existentes como easycancha) y reseñas generadas por usuarios para ayudar en la toma de decisiones. Grupos y foros dedicados específicos por deporte ofrecerán espacios virtuales para que los atletas de diferentes disciplinas se conecten, compartan consejos e ideas valiosas, organicen eventos locales y cultiven un fuerte sentido de comunidad y camaradería.
Para distinguirse dentro del mercado existente, la aplicación adoptará un enfoque hiperlocal, dirigiéndose específicamente a la comunidad deportiva aficionada dentro de Manizales. Este enfoque localizado fomentará un fuerte sentido de pertenencia y relevancia entre los usuarios. Además, la integración de elementos de gamificación, como desafíos atractivos, tablas de clasificación competitivas e insignias de logros, añadirá un elemento de diversión y motivación, fomentando el compromiso y la participación constantes dentro de la comunidad. El núcleo de la propuesta de valor mejorada reside en la creación de un ecosistema digital integral que está específicamente adaptado a las necesidades y aspiraciones únicas de los atletas aficionados en Manizales. Al combinar sin problemas herramientas de nivel profesional para la mejora del rendimiento con una plataforma comunitaria local robusta y de apoyo, la aplicación tiene como objetivo elevar toda la experiencia deportiva aficionada en la ciudad.
**Definición del Producto Mínimo Viable (MVP)**
El Producto Mínimo Viable (MVP) inicial se centrará estratégicamente en un conjunto básico de características diseñadas para validar la propuesta de valor fundamental. Esto incluirá la funcionalidad esencial para el usuario, como un proceso de registro de usuario sencillo y la creación de perfiles personalizados donde los atletas puedan especificar sus deportes preferidos y niveles de habilidad autoevaluados. Se implementarán capacidades básicas de seguimiento del rendimiento para una selección inicial de los deportes más populares en Manizales, como correr, ciclismo y fútbol, concentrándose en capturar indicadores clave de rendimiento relevantes para cada actividad. Para sentar las bases para la construcción de la comunidad, el MVP incorporará una función basada en mapas que permita a los usuarios descubrir recintos deportivos y otros usuarios de la aplicación dentro del área de Manizales. Además, se incluirá la capacidad de crear grupos o foros específicos por deporte para facilitar la comunicación y coordinación inicial entre atletas con intereses compartidos. Finalmente, una herramienta de programación simple permitirá a los usuarios dentro de estos grupos organizar partidos informales o sesiones de práctica.
Esta priorización de características está impulsada por la necesidad de abordar las necesidades más fundamentales de los atletas aficionados: el deseo de conectarse con otros que comparten su pasión por los deportes y la capacidad de monitorear su progreso individual. Al concentrarse en este conjunto limitado pero crucial de funcionalidades básicas, el proceso de desarrollo puede optimizarse, permitiendo un lanzamiento más rápido y eficiente. Este cronograma acelerado permitirá una validación más rápida de la idea de negocio subyacente dentro del mercado objetivo. El enfoque estratégico es priorizar estos componentes básicos de interacción comunitaria y monitoreo básico del rendimiento para validar eficazmente la propuesta de valor central antes de realizar inversiones significativas en funcionalidades más complejas. Al centrarse en estos elementos esenciales en el MVP inicial, la aplicación puede medir rápidamente el interés del usuario, recopilar comentarios invaluables sobre la experiencia del usuario y las preferencias de características, y sentar una base sólida para futuras fases de desarrollo más elaboradas.
**Estrategia de Lanzamiento al Mercado para el MVP en Manizales**
El lanzamiento inicial del MVP en Manizales utilizará una estrategia de distribución múltiple. Los canales principales serán las tiendas digitales establecidas: Google Play Store para dispositivos Android y Apple App Store para dispositivos iOS. Para llegar directamente al público objetivo, un esfuerzo de divulgación enfocado se dirigirá a clubes deportivos locales, gimnasios y programas deportivos universitarios, animándolos a promocionar la aplicación entre sus respectivos miembros. Además, se buscarán alianzas con los organizadores de eventos y torneos deportivos amateur locales para presentar la aplicación a los participantes como una herramienta valiosa para la conexión y el seguimiento del rendimiento. Este aprovechamiento estratégico de las redes y comunidades existentes dentro del ecosistema deportivo de Manizales proporcionará un medio altamente dirigido y eficiente para llegar a la base inicial de usuarios. Estos canales establecidos ofrecen acceso directo a los usuarios previstos de la aplicación y tienen el potencial de acelerar significativamente la adquisición de usuarios durante la fase inicial de lanzamiento.
Complementando la estrategia de distribución, se implementará un plan integral de marketing y divulgación. Esto incluirá campañas de marketing dirigidas en redes sociales en plataformas muy populares en Colombia, como Facebook e Instagram. Estas campañas mostrarán las características clave de la aplicación y destacarán los beneficios específicos que ofrece a los atletas aficionados en Manizales. Una estrategia de marketing de contenidos implicará la creación de contenido valioso y atractivo, como publicaciones de blog informativas y actualizaciones relevantes en redes sociales, centrándose en eventos deportivos locales, consejos prácticos de entrenamiento e historias de éxito inspiradoras de atletas aficionados dentro de Manizales que utilizan la aplicación. También se harán esfuerzos para colaborar con medios de comunicación locales, incluidos periódicos, emisoras de radio y sitios web comunitarios destacados, para generar una conciencia más amplia sobre el lanzamiento de la aplicación y su propuesta de valor. Colaborar con atletas aficionados locales conocidos o entusiastas deportivos influyentes amplificará aún más el mensaje, aprovechando su base de seguidores existente para promover la aplicación. Para proporcionar una introducción práctica, se organizarán pequeños eventos promocionales o talleres en instalaciones deportivas locales populares, ofreciendo oportunidades para demostrar las funcionalidades de la aplicación e incorporar nuevos usuarios de manera efectiva. Para mejorar la descubribilidad orgánica dentro de las tiendas de aplicaciones, se implementará una estrategia exhaustiva de Optimización de Tiendas de Aplicaciones (ASO), incorporando palabras clave relevantes y descripciones atractivas. Para incentivar la adopción temprana y el crecimiento orgánico, se introducirá un programa de referidos, recompensando a los usuarios existentes por invitar a sus amigos y compañeros de equipo a unirse a la plataforma. Finalmente, la creación de una página de destino interactiva y atractiva, que incorpore elementos que muestren las características de la aplicación y fomenten las descargas, servirá como un centro neurálgico de información e impulsará la adquisición inicial de usuarios. Esta estrategia de marketing integral y multifacética, que combina el alcance digital dirigido con la participación local activa, será fundamental para construir una fuerte conciencia e impulsar una adopción inicial sustancial del MVP dentro de la comunidad deportiva aficionada de Manizales.
**Medición del Éxito y Plan de Iteración**
Para medir el éxito del MVP y guiar el desarrollo futuro, se monitorearán de cerca varios Indicadores Clave de Rendimiento (KPI). Estos incluyen métricas de adquisición como el número total de descargas de la aplicación y el número de registros de nuevos usuarios específicamente originarios de Manizales. La interacción se medirá a través de usuarios activos diarios y mensuales (DAU/MAU), la frecuencia con la que se utilizan las características clave (como el seguimiento del rendimiento, la participación en grupos y el descubrimiento de recintos) y el tiempo promedio que los usuarios pasan activamente dentro de la aplicación. El crecimiento y la vitalidad de la comunidad se evaluarán mediante el seguimiento del número de grupos específicos por deporte creados, el número promedio de miembros dentro de cada grupo y el nivel general de actividad dentro de los foros y canales de comunicación grupales. El sentimiento y la satisfacción del usuario se evaluarán a través de calificaciones y reseñas en las tiendas de aplicaciones, envíos de comentarios dentro de la aplicación y menciones y sentimiento expresado en las plataformas de redes sociales. Finalmente, la retención de usuarios será un indicador crítico de valor a largo plazo, medido por la tasa a la que los usuarios regresan a la aplicación en períodos semanales y mensuales.
Para rastrear eficazmente estos KPI, se implementarán herramientas apropiadas de recolección y análisis de datos desde el principio. Los datos recopilados se analizarán regularmente para obtener una comprensión profunda de los patrones de comportamiento del usuario, identificar áreas de la aplicación que funcionan bien y señalar áreas que requieren mejora. Se establecerá un circuito de retroalimentación robusto, proporcionando canales claros y accesibles para que los usuarios envíen sus comentarios, informen problemas y sugieran nuevas características. Estos canales de retroalimentación serán monitoreados activamente para garantizar que las voces de los usuarios sean escuchadas y consideradas en el proceso de desarrollo continuo. El desarrollo de la aplicación seguirá un enfoque iterativo. Basándose en las perspectivas obtenidas de los datos recopilados y los valiosos comentarios de los usuarios, se priorizarán nuevas características y mejoras para su implementación en futuras iteraciones de la aplicación. Se adoptará una metodología de desarrollo ágil, caracterizada por ciclos de lanzamiento cortos, para facilitar la rápida solución de errores (bugs), la rápida implementación de mejoras y la introducción eficiente de nuevas funcionalidades basadas en las necesidades cambiantes de los usuarios y las tendencias emergentes del mercado. En etapas posteriores, una vez que se haya establecido una base de usuarios sólida y se haya logrado una comprensión más profunda de la interacción del usuario, la introducción de características premium o estrategias de monetización estratégicas se considerarán cuidadosamente en función de la demanda de los usuarios y los objetivos generales de sostenibilidad. Este enfoque iterativo y basado en datos será fundamental para garantizar que la aplicación evolucione continuamente para satisfacer eficazmente las necesidades dinámicas de la comunidad deportiva aficionada en Manizales, maximizando en última instancia su éxito a largo plazo y su sostenibilidad general dentro del mercado.

**Conclusión: Realizando la Visión de una Comunidad Deportiva Aficionada Conectada y Profesional en Manizales**
El análisis del panorama deportivo aficionado en Manizales revela una comunidad vibrante y comprometida con un fuerte deseo de experiencias deportivas mejoradas. El análisis de mercado indica una base de usuarios potencial significativa ansiosa por una aplicación móvil que satisfaga específicamente sus necesidades, cerrando la brecha entre su pasión y las herramientas y conexiones de nivel profesional a las que aspiran. La aplicación propuesta ofrece una propuesta de valor convincente al combinar seguimiento avanzado del rendimiento, características integrales de creación de comunidad y un enfoque hiperlocal en Manizales. El enfoque estratégico delineado para el lanzamiento del MVP prioriza funcionalidades básicas que abordan las necesidades fundamentales de conexión y monitoreo del progreso, con una estrategia de lanzamiento al mercado dirigida que aprovecha las redes locales existentes y los canales digitales. Al medir diligentemente el éxito a través de indicadores clave de rendimiento y adoptar un proceso de desarrollo iterativo impulsado por los comentarios de los usuarios, la aplicación está preparada para la mejora continua y la relevancia a largo plazo. Esta iniciativa tiene el potencial de crear una comunidad próspera y profundamente comprometida para los atletas aficionados en Manizales, proporcionándoles una experiencia deportiva elevada que les permite conectarse con otros entusiastas, alcanzar sus marcas personales y disfrutar plenamente de sus actividades deportivas favoritas.
## Encuesta (diseño y borradores)

Para crear una encuesta súper efectiva que realmente te ayude a entender si tu negocio (PRO) puede funcionar, necesito información más detallada sobre los siguientes aspectos de tu empresa y modelo de negocio:
**1\. Propuesta de Valor Clara y Específica:**
*   **¿Cuál es el problema principal que PRO busca resolver para los jugadores de fútbol y los organizadores de eventos deportivos? (Más allá de "unir jugadores y eventos"). ¿Qué necesidad específica están sintiendo que PRO va a satisfacer mejor que cualquier otra solución existente?: R//** PRO busca que los jugadores y equipos amateur experimenten las sensaciones, emociones y competitividad de los profesionales (de ahí su nombre "PRO"). Con lo anterior, buscamos aumentar la pasión por el deporte, y por ende, la afluencia en los espacios deportivos.
*   **¿Qué beneficios únicos ofrece PRO a sus usuarios? ¿Por qué deberían elegir PRO en lugar de seguir buscando jugadores/equipos/eventos de la manera tradicional o usar otras plataformas (si existen)? R//** Ofrece un espacio gratuito (para los deportistas) donde pueden almacenar sus estadísticas, logros y perfil deportivo que les permita compararse y competir con los demás deportistas que compartan gustos por un mismo deporte. Podrán crear equipos y hacer transferencia de jugadores entre estos. Así mismo, podrán organizar retos entre deportistas y equipos y subir públicamente los resultados para llevar la competencia a otro nivel. Adicionalmente, los jugadores podrán agregar dispositivos como relojes, celulares, chips y demás tecnologías que permitan medir las estadísticas en tiempo real. Por su parte, para los dueños de canchas y complejos deportivos que se asocien a la empresa, podrán incrementar su afluencia al crear torneos y recibir deportistas. aumentar la posibilidad de realizar deporte con mayor frecuencia al pertenecer a una comunidad deportiva.
*   **¿Cuál es el "gancho" principal de PRO? ¿Qué característica o combinación de características será más atractiva para tu público objetivo? R//** Poder tener esa sensación de tener un perfil de jugador profesional (tipo jugadores del videojuego FIFA2025) donde puedan ser valorados por sus estadísticas por pertenecer a un equipo (para los deportes que aplique), ser transferidos de un equipo a otro (como Markettransfer) y poder retar a otros jugadores para medirse y ganar la gloria de ser el mejor deportista de su region. Así mismo, será muy fácil crea y seguir la estadísticas de torneos, ligas o cualquier clase de competencia.

**2\. Segmento de Cliente Objetivo Detallado:**
*   **¿Quién es tu jugador de fútbol típico? (Edad promedio, nivel de juego (amateur, semi-profesional), frecuencia de juego, tipo de equipos en los que participa, etc.) R//** Se busca impactar un perfil de deportistas amateur y semiprofesional que tengan una frecuencia de juego baja, media y alta. Así mismo, buscamos impactar equipos, ligas, torneos, eventos deportivos y espacios de deporte amateur y semiprofesionales.
*   **¿Quién es tu organizador de eventos deportivos típico? (Tipo de eventos que organizan, tamaño, frecuencia, cómo promocionan sus eventos actualmente, etc.) R//** Buscamos trabajar con espacios deportivos y organizadores de eventos deportivos desde los mas pequeños hasta los mas grandes, principalmente con alta frecuencia (aunque no es un excluyente) que promocionen un espacios y eventos a través de medios digitales o un posicionamiento clave en cada cuidad.
*   **¿Te enfocas en algún nicho específico dentro de estos grupos? (Ej. Jugadores jóvenes, ligas universitarias, torneos específicos, etc.) R//** No, todos son objetivo para el disfrute de este aplicativo. solo para primera fase seria futbol que sean mayores de edad !

**3.** **Modelo de Ingresos (Cómo PRO va a ganar dinero):**
*   **¿Cómo planeas monetizar PRO? (¿Suscripción para jugadores? ¿Suscripción para equipos/organizadores? ¿Comisiones por transferencias? ¿Publicidad? ¿Funcionalidades premium de pago único? ¿Combinación de varios métodos?) R//** PRO busca monetizar por su comunidad, donde los patrocinadores, espacios deportivos, organizadores de torneos y marcas deportivas estén dispuestos a pagar para acceder a nuestra comunidad atraves de alianzas y pagos a PRO. Sin embargo, el modelo siempre se buscara otorgar gratuito para los deportistas.
*   **Si hay planes de suscripción, ¿cuáles serían los posibles precios y qué valor ofrecería cada plan? R//** Por ahora no esperamos generar un sistemas de suscripción, ya que el objetivo es construir comunidad. Nuestra meta es monetizar con cobros por publicidad y usabilidad de los complejos deportivos para crear eventos masivos.
*   **¿Tienes alguna estimación de cuánto estarían dispuestos a pagar los usuarios por las funcionalidades de PRO? R//** Aun no**.**

**4\. Funcionalidades Clave (Más allá de las ya mencionadas):**
*   **¿Hay alguna otra funcionalidad principal que consideres esencial para el éxito de PRO?** (Ej. Sistema de mensajería interna, foros de discusión, herramientas de gestión de equipos, calendarios de eventos, etc.)
*   **¿Cuáles son las 3-5 funcionalidades más importantes que crees que los usuarios valorarán más?**
    *   

**5\. Competencia (Si existe):**
*   **¿Conoces alguna otra aplicación o plataforma que ofrezca servicios similares en Pereira o en otras ciudades?**
*   **¿Cuáles crees que son las fortalezas y debilidades de tus competidores?**
*   **¿Qué diferencia a PRO de la competencia?** ¿Cuál es tu ventaja competitiva?

**6\. Estrategia de Marketing y Adquisición de Usuarios:**
*   **¿Cómo planeas dar a conocer PRO en Pereira?** (Redes sociales, publicidad local, contacto con ligas deportivas, eventos de lanzamiento, etc.)
*   **¿Cómo planeas atraer a los primeros usuarios y lograr que se queden?**

**7\. Suposiciones Clave:**
*   **¿Cuáles son las principales suposiciones que estás haciendo sobre el comportamiento de los usuarios y las necesidades del mercado para que PRO funcione?** (Ej. Que los jugadores están frustrados por no poder encontrar equipos fácilmente, que los organizadores tienen dificultades para promocionar sus eventos, que los jugadores valoran mucho el seguimiento de estadísticas, etc.)

**¿Por qué esta información es crucial para una encuesta súper efectiva?**
*   **Enfocar las preguntas:** Conociendo tu propuesta de valor y tu público objetivo, puedo formular preguntas que realmente resuenen con ellos y te den información específica sobre sus necesidades y preferencias.
*   **Validar el modelo de negocio:** Las preguntas sobre la disposición a pagar y el interés en las funcionalidades te ayudarán a validar si tu modelo de ingresos es viable.
*   **Identificar puntos débiles:** Entender la competencia y tus suposiciones te permite crear preguntas que desafíen esas suposiciones y te ayuden a identificar posibles obstáculos.
*   **Priorizar funcionalidades:** La información sobre las funcionalidades clave te ayudará a enfocar la encuesta en lo que realmente importa a los usuarios.
*   **Medir el potencial de éxito:** Al final, la encuesta debería proporcionarte datos concretos sobre el nivel de interés en tu solución, la disposición a pagar y las posibles barreras de entrada, lo que te dará una mejor idea del potencial de éxito de PRO.
#### Preguntas:
**Encuesta 1: Para Deportistas (Jugadores de Fútbol y Otros Deportes de Equipo)**
**Encabezado de la Encuesta:**
*   **Título:** ¡Queremos tu opinión! Encuesta para Deportistas
*   **Descripción:** Estamos creando una aplicación para llevar tu experiencia deportiva al siguiente nivel. Queremos conocer tus intereses y necesidades para construir la mejor herramienta para ti. ¡Tu opinión es muy importante!
**Sección 1: Perfil del Deportista**
*   **Pregunta 1:** ¿Qué deporte de equipo practicas principalmente?
    *   Tipo de pregunta: Opción múltiple (incluir fútbol y una opción para "Otro" con campo de texto)
*   **Pregunta 2:** ¿Con qué frecuencia juegas a la semana?
    *   Tipo de pregunta: Opción múltiple
        *   No juego actualmente
        *   1 vez por semana
        *   2-3 veces por semana
        *   Más de 3 veces por semana
*   **Pregunta 3:** ¿Actualmente perteneces a algún equipo o grupo deportivo?
    *   Tipo de pregunta: Opción múltiple
        *   Sí
        *   No
*   **Pregunta 4:** ¿Cuál es tu rango de edad?
    *   Tipo de pregunta: Opción múltiple (ej. 16-24, 25-34, 35-44, 45+)
*   **Pregunta 5:** ¿Cuál es tu nivel de juego principal?
    *   Tipo de pregunta: Opción múltiple (ej. Amateur recreativo, Amateur competitivo, Semiprofesional)
**Sección 2: Interés en las Funcionalidades**
*   **Pregunta 6:** ¿Qué tan atractivo te resulta la idea de tener un perfil deportivo digital donde puedas registrar tus estadísticas, logros y trayectoria como jugador aficionado?
    *   Tipo de pregunta: Escala lineal (1: Nada atractivo - 5: Muy atractivo)
*   **Pregunta 7:** ¿Qué tan interesado estarías en poder comparar tus estadísticas con tus amigos o otros jugadores de tu nivel ?
    *   Tipo de pregunta: Escala lineal (1: Nada interesado - 5: Muy interesado)
*   **Pregunta 8:** ¿Te gustaría tener la posibilidad de crear o unirte a equipos dentro de una plataforma digital?
    *   Tipo de pregunta: Opción múltiple
        *   Sí, mucho
        *   Sí, algo
        *   No estoy seguro
        *   No, no me interesa
*   **Pregunta 9:** ¿Qué tan útil te parecería la función de poder realizar "transferencias" de jugadores entre equipos dentro de la aplicación?
    *   Tipo de pregunta: Escala lineal (1: Nada útil - 5: Muy útil)
*   **Pregunta 10:** ¿Te motivaría poder retar a tus amigos, otros jugadores o equipos a partidos y publicar los resultados para generar una competencia más activa?
    *   Tipo de pregunta: Opción múltiple
        *   Sí, mucho
        *   Sí, algo
        *   No estoy seguro
        *   No, no me interesa
*   **Pregunta 11:** ¿Qué tan interesante te resultaría poder conectar tu aplicación con dispositivos (relojes, celulares, etc.) para registrar tus estadísticas de juego automáticamente?
    *   Tipo de pregunta: Escala lineal (1: Nada interesante - 5: Muy interesante)
**Sección 3: Hábitos y Necesidades Deportivas**
*   **Pregunta 12:** ¿Cómo sueles enterarte de partidos, torneos o eventos deportivos en Pereira? (Puedes seleccionar varias opciones)
    *   Tipo de pregunta: Casillas de verificación (las opciones que definimos antes)
*   **Pregunta 13:** ¿Qué tan fácil te resulta encontrar jugadores para completar tu equipo o unirte a uno?
    *   Tipo de pregunta: Escala lineal (1: Muy difícil - 5: Muy fácil)
*   **Pregunta 14:** ¿Cómo realizas actualmente el seguimiento de tus estadísticas deportivas?
    *   Tipo de pregunta: Opción múltiple (las opciones que definimos antes)
**Sección 4: Funcionalidades Adicionales y Sugerencias**
*   **Pregunta 15:** ¿Qué otras funcionalidades crees que serían importantes o atractivas para incluir en una aplicación para la comunidad de deportistas ? (Pregunta abierta)
    *   Tipo de pregunta: Párrafo
*   **Pregunta 16:** ¿Tienes alguna otra sugerencia o comentario sobre la idea de la aplicacion para deportistas? (Pregunta abierta)
    *   Tipo de pregunta: Párrafo
**Mensaje Final:** ¡Muchas gracias por tu tiempo y tus valiosas respuestas!
* * *

**Encuesta 2: Para Dueños de Complejos Deportivos, Organizadores de Eventos y Dueños de Marcas Deportivas**
**Encabezado de la Encuesta:**
*   **Título:** ¡Tu opinión nos interesa! Encuesta para Profesionales del Deporte - Aplicativo PRO
*   **Descripción:** Estamos desarrollando PRO, una aplicación que busca conectar a la comunidad deportiva amateur y semiprofesional en Pereira. Queremos conocer tu perspectiva para ofrecerte las mejores herramientas y oportunidades.
**Sección 1: Perfil del Profesional**
*   **Pregunta 1:** ¿Cuál es tu rol principal en el ámbito deportivo?
    *   Tipo de pregunta: Opción múltiple
        *   Dueño/Administrador de cancha o complejo deportivo
        *   Organizador de eventos deportivos (torneos, ligas, etc.)
        *   Dueño/Representante de marca de elementos deportivos
        *   Otro (especificar)
*   **Pregunta 2:** Si eres dueño/administrador de un espacio deportivo, ¿cuántas canchas o espacios tienes disponibles?
    *   Tipo de pregunta: Respuesta corta (número)
*   **Pregunta 3:** Si eres organizador de eventos, ¿con qué frecuencia organizas eventos deportivos en Pereira?
    *   Tipo de pregunta: Opción múltiple (las opciones que definimos antes)
*   **Pregunta 4:** ¿Cómo promocionas actualmente tus canchas, eventos o productos deportivos? (Puedes seleccionar varias opciones)
    *   Tipo de pregunta: Casillas de verificación
        *   Redes sociales
        *   Publicidad online
        *   Publicidad física (volantes, carteles, etc.)
        *   Contacto directo con equipos/jugadores
        *   Boca a boca
        *   Otros (especificar)
**Sección 2: Interés en las Funcionalidades de PRO**
*   **Pregunta 5:** ¿Qué tan interesado estaría en utilizar una plataforma para promocionar sus canchas o complejos deportivos a una comunidad de deportistas activa en Pereira?
    *   Tipo de pregunta: Escala lineal (1: Nada interesado - 5: Muy interesado)
*   **Pregunta 6:** ¿Le resultaría útil una herramienta para crear y gestionar torneos o eventos deportivos, facilitando la inscripción y el seguimiento de resultados?
    *   Tipo de pregunta: Escala lineal (1: Nada útil - 5: Muy útil)
*   **Pregunta 7:** ¿Qué tan atractivo le parece la idea de poder acceder a una comunidad de deportistas para aumentar la afluencia a sus instalaciones a través de la organización de eventos masivos en colaboración con PRO?
    *   Tipo de pregunta: Escala lineal (1: Nada atractivo - 5: Muy atractivo)
*   **Pregunta 8:** ¿Estaría interesado en establecer alianzas con PRO para promocionar su marca o productos deportivos a la comunidad de usuarios de la aplicación?
    *   Tipo de pregunta: Opción múltiple
        *   Sí, definitivamente
        *   Tal vez
        *   No, no me interesa
*   **Pregunta 9:** ¿Qué tipo de información o métricas de la comunidad de usuarios de PRO le serían valiosas para su negocio? (Pregunta abierta)
    *   Tipo de pregunta: Párrafo
**Sección 3: Modelo de Monetización y Colaboración**
*   **Pregunta 10:** ¿Qué tan dispuesto estaría a pagar por acceder a una plataforma que le permita conectar con una amplia comunidad de deportistas en Pereira?
    *   Tipo de pregunta: Escala lineal (1: Nada dispuesto - 5: Muy dispuesto)
*   **Pregunta 11:** ¿Qué tipo de modelo de colaboración o alianza le parecería más interesante con PRO? (Ej. Publicidad segmentada, patrocinio de eventos, acceso a datos de usuarios, etc.) (Pregunta abierta)
    *   Tipo de pregunta: Párrafo
**Sección 4: Funcionalidades Adicionales y Sugerencias**
*   **Pregunta 12:** ¿Qué otras funcionalidades o herramientas cree que PRO podría ofrecer para beneficiar a los dueños de complejos deportivos, organizadores de eventos o marcas deportivas? (Pregunta abierta)
    *   Tipo de pregunta: Párrafo
*   **Pregunta 13:** ¿Tiene alguna otra sugerencia o comentario sobre la idea de PRO para profesionales del deporte? (Pregunta abierta)
    *   Tipo de pregunta: Párrafo
**Mensaje Final:** ¡Agradecemos enormemente tu tiempo y tus valiosos aportes!

## Ingeniería en detalle

_Pendiente: arquitectura técnica detallada; usar `architecture/solution-architecture.md` en el repo._

## Business plan

# **1\. Descripción del negocio**
### Detalles sobre el negocio:
En un mundo donde el deporte une a miles de millones, la experiencia para atletas, organizadores y marcas a nivel global y semiprofesional sigue estando fragmentada y llena de barreras. El talento lucha por ser visible, la organización de eventos es logísticamente compleja y las marcas buscan desesperadamente conectar de forma auténtica con su público. Es aquí donde nace PRO, con una visión audaz: redefinir la experiencia deportiva del siglo XXI, uniendo a la comunidad global en una plataforma donde la conexión, la competencia y la celebración del esfuerzo humano inspiran a una nueva generación.
PRO es un ecosistema digital integral diseñado para ser el punto de encuentro y el motor de la economía deportiva. Nuestra misión es conectar a través de un ecosistema digital la comunidad deportiva global, donde la pasión por el deporte se transforma en oportunidades reales, facilitando que los deportistas muestren su talento, los organizadores creen eventos memorables y las marcas conecten auténticamente con su público.
Para cumplir esta promesa, nuestra plataforma ofrece soluciones específicas y sinérgicas para cada actor clave:
*   Para los Deportistas: Un perfil dinámico y profesional donde pueden registrar sus logros, estadísticas y trayectoria, ganando visibilidad ante una red global de ojeadores, promotores y marcas.
*   Para los Promotores de Eventos: Una suite de herramientas de gestión "todo en uno" que simplifica desde la inscripción de participantes y la venta de entradas hasta la comunicación en tiempo real y la publicación de resultados, transformando la compleja tarea de organizar un evento en una experiencia eficiente y memorable.
*   Para Vendedores y Marcas Deportivas: Un canal de interacción directa y de alto valor con la comunidad a través de un marketplace integrado para la venta de mercancía, un feed de contenidos para generar engagement y un gestor de asesorados para que entrenadores y especialistas ofrezcan rutinas y seguimiento personalizado.
En esencia, PRO no es solo una aplicación; es el catalizador que elimina la fricción del ecosistema deportivo. Estamos posicionados para capitalizar un mercado global apasionado y en constante crecimiento, no solo como una herramienta tecnológica, sino como el corazón de la próxima revolución cultural en el mundo del deporte.
### Misión (describe el propósito fundamental de tu negocio. Responde a las preguntas: ¿Qué hacemos?, ¿Para quién lo hacemos? y ¿Cómo lo hacemos de una forma que nos diferencie?. Se enfoca en el presente y en lo que la empresa hace cada día para alcanzar su visión a largo plazo):
Conectar a través de un ecosistema digital la comunidad deportiva global, donde la pasión por el deporte se transforma en oportunidades reales, facilitando que los deportistas muestren su talento, los organizadores creen eventos memorables y las marcas conecten auténticamente con su público.
### Visión (Si tu misión es lo que haces cada día (el QUÉ y el CÓMO), tu visión es el futuro que quieres crear si tienes éxito. Es el PORQUÉ a gran escala, tu sueño, el impacto final que tu empresa tendrá en el mundo.)
Redefinir la experiencia deportiva del siglo XXI, uniendo a la comunidad global en una plataforma donde la conexión, la competencia y la celebración del esfuerzo humano inspiran a una nueva generación.

Visión a 10 años de PRO
ANDRES:
Estando al mismo nivel de la FIFA para lo que es el futbol. Teniendo mucho peso a la hora de opinar con justicia, imparcialidad y transparencia. Que nosotros podamos tener eventos como el balón de oro (propio de PRO) u otros que destaquen a los mejores deportistas de cada deporte. No es hacerle competencia a FIFA, sino que seamos una marca imparcial y seria que muestra el deporte transparente y como es. Buscando que nuestra opinión sea escuchada y esperada.

Que tengamos visibilidad para que los talentosos puedan convertirse en profesionales y desde PRO se gestione el mercado deportivo, como una bolsa de valores del deporte garantizando transacciones y pagos a equipos y deportistas a través de tecnología tipo **blockchain** (_revisar término original “BlockShange” / blockchain_).

JUAN PABLO:
Crear piezas únicas como NFT de cada uno de los deportistas destacados tipo FIFA y las de los magos famosos de Harry Potter. Estas piezas serán la representación digital de las acciones del deportista.

Revolucionar la forma en que se miden las estadísticas en el deporte, a través de nuevos dispositivos tecnológicos.

La plataforma numero uno para tracking de entrenamientos y de rendimiento en tiempo real en un deporte.

Gestión segura de la información y la garantía de originalidad de la información, los productos y el contenido publicado en PRO a través del uso de BlockChange. (Posible punto diferencia de PRO)

Abiertos A:
Ser una plataforma de contenido audiovisual (tipo Noticia, pronósticos, revista digital, podcast) respecto a el deporte, visto o expresado desde expertos deportivos. Un contenido propio de PRO en el feed, que sea relacionado a los deportes que te gustan (Noticias de los deportes que sigues a nivel profesional y mundial)

Que no somos:
No somos un ecosistema de apuestas deportivas.

**Modelo de Negocio a 3 años:**
*   Validándose y encontrando su identidad: Validar los supuestos que tenemos respecto al negocio, a lo que mejor funciona para el mercado y a los supuestos de identidad sobre lo que queremos y no queremos ser. \[En el primer año de existencia de PRO\]
*   Reevaluar los objetivos de PRO para garantizar su crecimientos.
*   Fortalecer lazos con aliados estratégicos.
*   Reconocimiento a nivel nacional de por lo menos 5000 usuarios activos.
*   Alcanzar el punto de equilibrio del negocio.
*   Garantizar el correcto funcionamiento (validado por los usuarios) para los módulos de Deportistas, Creadores de eventos y Marcas (Marketplace - Espacio para asesorados).
*   Tener un escalamiento regional, donde iniciemos por Caldas, y tengamos unas variables claras de ruptura y demanda de mercado para validar la región a seguir y garantizar una correcta escalabilidad.
*   Tener a través de PRO, el torneo La Patria, Villamaría y Reyes Magos. Y gestionar relacionamiento con la Liga Caldense de Futbol (Buscar una persona estratégica relacionada a la Liga) siendo el objetivo mas importante lograr gestionar los tornemos oficiales de la liga.

**Modelo de Negocio a 5 años**
Dominio nacional y rompiendo mercado en Latam.

**Modelo de Negocio a 10 años**
Posicionamiento como la marca numero 1 a nivel nacional e internacional.
# **2\. Análisis de Inversión Inicial**

# **3\. Proyecciones Financieras**

# **4\. Equipo y Estructura**
Entre equipos y estructura sumado a plan de ventas y marketing, debemos pensar en las características de los aliados estratégicos y la propuesta financiera que se realizara para potenciar la visibilidad y ventas de PRO:
Por ahora la decisión parcial es tener un aliado estratégico por cada rama estratégica (ej comunicaciones, deportistas, etc). Debemos buscar el listado de personas, de características que cada uno debe cumplir y los términos de negociación para cada uno.

# **5\. Análisis de Mercado**
1
# **5\. Plan de Ventas y Marketing**
1
# **6\. Análisis de la Competencia**