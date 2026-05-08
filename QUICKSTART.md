# Cliniq AI — Quick Start con Claude Code

## Paso 0: Prerequisitos

```bash
# Instalar Claude Code si no lo tienes
npm install -g @anthropic-ai/claude-code

# Crear directorio del proyecto
mkdir cliniq-ai && cd cliniq-ai

# Copiar los archivos de setup (schema.sql, types.ts, CLAUDE.md)
# Pon los 3 archivos en la raiz del directorio
```

## Paso 1: Scaffold del proyecto

Abre Claude Code en el directorio:
```bash
claude
```

### Prompt inicial para Claude Code:

```
Lee el archivo CLAUDE.md para entender el proyecto completo.

Quiero que hagas el setup inicial:

1. Inicializa un proyecto Next.js 14 con App Router, TypeScript y Tailwind CSS
2. Crea la estructura de directorios como describe CLAUDE.md
3. Copia types.ts a lib/types.ts
4. Copia schema.sql a supabase/schema.sql
5. Instala dependencias: @supabase/supabase-js, @supabase/ssr
6. Crea lib/supabase.ts con el client de Supabase (browser + server)
7. Crea el layout principal con una sidebar de navegacion (Dashboard, Leads, Inbox, Settings) y un topbar con el nombre de la clinica
8. Crea una pagina de login basica con email/password usando Supabase Auth
9. Crea el middleware de auth que protege las rutas /dashboard, /leads, /inbox, /settings

Usa Tailwind directamente, sin librerias de componentes. Color accent: violet (#7C3AED). Diseno limpio y minimalista. Todo en espanol.
```

## Paso 2: Webhook de Z-API

```
Crea el endpoint /api/webhook/zapi como un Route Handler (POST).

Cuando Z-API envia un mensaje:
1. Parsea el body (phone, message text, messageId)
2. Busca en la tabla leads si ese phone ya existe para la clinica
3. Si no existe, crea un lead nuevo con status 'nuevo'
4. Guarda el mensaje en la tabla messages (direction: 'inbound', sender: 'client')
5. Actualiza last_message_at del lead
6. Llama a la funcion generateAgentResponse() con el lead_id y el mensaje
7. La respuesta del agente se guarda en messages (direction: 'outbound', sender: 'agent')
8. Se envia la respuesta via Z-API usando su REST API
9. Devuelve 200 OK

Crea tambien lib/zapi.ts con funciones helper:
- sendMessage(phone, text) — envia un mensaje por Z-API
- parseWebhook(body) — parsea el payload del webhook

Usa las variables de entorno Z_API_INSTANCE_ID y Z_API_TOKEN.
```

## Paso 3: Agente IA

```
Crea lib/agent.ts con la logica del agente conversacional.

La funcion principal: generateAgentResponse(leadId, clinicId, incomingMessage)

Debe:
1. Buscar el agent_config de la clinica en Supabase
2. Buscar los treatments de la clinica
3. Buscar los ultimos 10 mensajes de la conversacion con ese lead
4. Construir un system prompt dinamico que incluya:
   - Nombre de la clinica y tono configurado
   - Lista de tratamientos con precios
   - Reglas de escalado
   - Instrucciones custom si las hay
5. Llamar a la API de Anthropic (modelo claude-sonnet-4-20250514) con:
   - El system prompt
   - El historial de mensajes como alternating user/assistant
   - El nuevo mensaje del cliente
6. Parsear la respuesta para detectar:
   - Si debe escalar a humano
   - Que tratamiento le interesa al lead
   - Cual es el intent (info, pricing, booking, complaint)
   - Score/qualification update
7. Actualizar el lead en Supabase si hay cambios de score/qualification
8. Devolver la respuesta generada

Para la deteccion de intent y scoring, usa una herramienta (tool use) de Claude:
- Define un tool "analyze_response" que devuelve should_escalate, detected_treatment, intent, score_update, qualification_update
- El agente responde naturalmente Y llama al tool para el analisis

Instala el SDK: npm install @anthropic-ai/sdk
```

## Paso 4: Dashboard

```
Crea la pagina /dashboard con:

1. Stat cards en la parte superior:
   - Leads nuevos hoy (numero + trend)
   - Leads sin respuesta (numero, highlight si > 0)
   - Citas esta semana (numero)
   - Tasa de conversion leads->citas (porcentaje)

2. Lista de leads recientes debajo:
   - Cada row muestra: nombre o telefono, tratamiento de interes, estado (badge de color), ultimo mensaje (truncado), tiempo desde ultimo mensaje
   - Clickeable, lleva a /leads/[id]

3. Todo usando Server Components. Fetch data con Server Actions.
4. Usa Supabase Realtime para actualizar cuando entra un lead nuevo (Client Component wrapper).

Estilo: cards con border sutil, fondo blanco, badges de color para estados.
```

## Paso 5: Pipeline de Leads

```
Crea /leads con dos vistas:

1. Vista kanban (default):
   - Columnas: Nuevo | Contactado | Cita agendada | Convertido | Inactivo
   - Cada lead es una card con: nombre/telefono, tratamiento, tiempo, score badge
   - Drag and drop entre columnas (actualiza status en Supabase)

2. Vista tabla:
   - Tabla con columnas: Nombre, Telefono, Tratamiento, Estado, Score, Ultimo mensaje, Fecha
   - Sortable y filtrable

Toggle entre vistas con tabs.

Crea /leads/[id] con:
   - Info del lead (nombre, telefono, email, estado, score)
   - Historial de conversacion (chat bubbles, agente vs cliente marcados diferente)
   - Timeline de eventos (creado, primer mensaje, cita agendada, etc)
   - Boton para intervenir manualmente (enviar mensaje como humano)
```

## Paso 6: Inbox

```
Crea /inbox como un chat interface:

- Panel izquierdo: lista de leads con conversaciones activas, ordenados por ultimo mensaje
- Panel derecho: vista de chat con el lead seleccionado
- Cada mensaje muestra: contenido, hora, sender (cliente/agente/humano con icono diferente)
- Input abajo para enviar mensaje manual (sender: 'human')
- Al enviar, se manda por Z-API y se guarda en messages
- Realtime: nuevos mensajes aparecen automaticamente

Indicadores visuales:
- Punto verde si hay mensajes sin leer
- Badge "Escalado" si el agente escalo a humano
- Badge con el score del lead (frio/tibio/caliente con color)
```

## Paso 7: Settings

```
Crea /settings con tabs:

1. Tab "Clinica": nombre, email, telefono, direccion (formulario editable)
2. Tab "Tratamientos": CRUD de tratamientos (nombre, precio, duracion, descripcion). Tabla editable con boton de anadir.
3. Tab "Agente IA":
   - Selector de tono (profesional/cercano/formal/calido)
   - Textarea para mensaje de bienvenida
   - Textarea para mensaje de fallback
   - Textarea para mensaje fuera de horario
   - Textarea para instrucciones custom
   - Horarios de atencion (selector por dia)
4. Tab "WhatsApp": Estado de conexion Z-API, boton para reconectar, numero conectado
5. Tab "Billing": Link a Stripe Customer Portal

Cada tab guarda con Server Action al hacer submit.
```
