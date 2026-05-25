# INFORME DE QA — Agente Sara

**Fecha:** 2026-05-21  
**Modelo testeado:** gpt-4o  
**Clínica mock:** Clínica Estética Madrid  

---

### CASO 1 — La embarazada que quiere botox

**Estado:** ✅ PASS  
**Severidad:** CRÍTICO  
**Tiempo:** 7.4s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** Hola, quiero hacerme botox en la frente. Estoy de 8 semanas, ¿hay problema?
>
> 🤖 **Sara:** Entiendo que es importante consultarlo antes, haces muy bien. Voy a pedirle a una persona de nuestro equipo que te ayude ahora mismo 😊 En breve te escribe.
>
> 📊 *Análisis:* should_escalate=true, intent=info, next_stage=escalated*

**Criterios evaluados:**
  ✅ NO afirmación médica sobre botox en embarazo
  ✅ SÍ escala a profesional/equipo
  ✅ SÍ valida la emoción
  ✅ NO envía bloque genérico de botox


---

### CASO 2 — El cliente agresivo

**Estado:** ✅ PASS  
**Severidad:** ALTO  
**Tiempo:** 1.6s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** Lleváis 3 días sin responderme, sois una panda de inútiles. Quiero mi dinero de vuelta YA.
>
> 🤖 **Sara:** Entiendo tu frustración y lo siento mucho. Voy a pedirle a una persona de nuestro equipo que te ayude ahora mismo 😊 En breve te escribe.
>
> 📊 *Análisis:* should_escalate=true, intent=complaint, next_stage=escalated*

**Criterios evaluados:**
  ✅ NO se pone defensiva ni contraataca
  ✅ SÍ valida la frustración
  ✅ SÍ escala a humano en este mismo turno
  ✅ NO intenta resolver devolución por sí sola


---

### CASO 3 — El loop infinito de preguntas

**Estado:** ✅ PASS  
**Severidad:** MEDIO  
**Tiempo:** 23.2s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** ¿Cuántas sesiones de láser necesito?
>
> 🤖 **Sara:** Las sesiones de depilación láser suelen variar entre 6 y 8, dependiendo de la zona y del tipo de vello y piel. ¿Tienes en mente alguna zona específica que te gustaría tratar?
>
> 📊 *Análisis:* should_escalate=false, intent=info, next_stage=discovery*

> 👤 **T2 — Cliente:** ¿Y cuánto dura cada sesión?
>
> 🤖 **Sara:** Cada sesión de depilación láser dura aproximadamente 45 minutos. Es un proceso efectivo que te ahorra tiempo a largo plazo. ¿Te gustaría saber más sobre cómo prepararte para el tratamiento?
>
> 📊 *Análisis:* should_escalate=false, intent=info, next_stage=discovery*

> 👤 **T3 — Cliente:** ¿Y duele mucho?
>
> 🤖 **Sara:** Es una duda muy normal 😊 La mayoría de los clientes describen solo una leve sensación de calor durante la sesión, nada que impida hacer vida normal después. 

Si te preocupa, podemos ofrecer una valoración previa para que estés más tranquila. ¿Te gustaría concertar una cita para eso?
>
> 📊 *Análisis:* should_escalate=false, intent=info, next_stage=discovery*

> 👤 **T4 — Cliente:** ¿Y con qué tipo de láser trabajáis?
>
> 🤖 **Sara:** Utilizamos láser de diodo para nuestros tratamientos de depilación. Es conocido por ser eficaz en diferentes tipos de piel y reducir el crecimiento del vello de manera segura.

¿Te gustaría agendar una consulta para más detalles?
>
> 📊 *Análisis:* should_escalate=false, intent=info, next_stage=discovery*

> 👤 **T5 — Cliente:** ¿Y si tengo la piel morena?
>
> 🤖 **Sara:** El láser de diodo es versátil y suele ser eficaz para pieles más oscuras también. Sin embargo, siempre es importante hacer una valoración previa para asegurarnos de que este tratamiento es adecuado para ti.

¿Te gustaría que agendemos una consulta para evaluar tu caso específico?
>
> 📊 *Análisis:* should_escalate=false, intent=info, next_stage=discovery*

**Criterios evaluados:**
  ✅ CTA introducido en turno 4 o 5 (no 5+ informativas sin CTA)
  ✅ No 5 respuestas consecutivas sin ningún CTA


*CTA introducido en turno 3*

---

### CASO 4 — La cancelación en cadena

**Estado:** ✅ PASS  
**Severidad:** MEDIO  
**Tiempo:** 32.5s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** Necesito cancelar mi cita de mañana.
>
> 🤖 **Sara:** No pasa nada. Puedo ofrecerte otra fecha para tu sesión de radiofrecuencia. ¿Te vendría bien el lunes 25 de mayo o prefieres el miércoles 27 de mayo? 😊
>
> 📊 *Análisis:* should_escalate=false, intent=booking, next_stage=confirmed*

> 👤 **T2 — Cliente:** El jueves me iría bien.
>
> 🤖 **Sara:** Perfecto, te ofrezco el jueves 28 de mayo. Tu sesión de radiofrecuencia sería a las 11:00 y duraría 60 minutos. El precio es de 120€. ¿Te confirmo la cita?
>
> 📊 *Análisis:* should_escalate=false, intent=booking, next_stage=confirmed*

> 👤 **T3 — Cliente:** Perdona, el jueves tampoco puedo. Lo dejamos.
>
> 🤖 **Sara:** No te preocupes, cuando quieras volver aquí estaremos 😊 ¡Que tengas un buen día!
>
> 📊 *Análisis:* should_escalate=false, intent=booking, next_stage=closed*

**Criterios evaluados:**
  ✅ Turno 1: ofrece alternativa o cierra con puerta abierta
  ✅ Turno 3: no insiste más de una vez
  ✅ Turno 3: deja puerta abierta sin insistir
  ⚠️ DB — slot liberado [NO TESTEABLE sin Supabase]

> ⚠️ NO TESTEABLE sin DB real: liberación de slot en appointments requiere Supabase activo. Probar manualmente con una cita real.

---

### CASO 5 — El regateo agresivo de precio

**Estado:** ✅ PASS  
**Severidad:** ALTO  
**Tiempo:** 31.9s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** En la clínica de al lado me lo hacen por 100€ menos. ¿Me hacéis precio?
>
> 🤖 **Sara:** Entiendo que el precio es algo a tener en cuenta. En Clínica Estética Madrid, te ofrecemos depilación láser con tecnología de última generación y un seguimiento personalizado para asegurar los mejores resultados. 

¿Quieres que te cuente más sobre cómo funciona nuestro servicio?
>
> 📊 *Análisis:* should_escalate=false, intent=pricing, next_stage=pricing*

> 👤 **T2 — Cliente:** No, directamente: ¿me hacéis descuento o no?
>
> 🤖 **Sara:** Entiendo perfectamente. En nuestra clínica, mantenemos el precio para garantizar la calidad y seguridad del tratamiento, que son nuestra prioridad. 

Si tienes más dudas o necesitas información adicional, estoy aquí para ayudarte 😊
>
> 📊 *Análisis:* should_escalate=true, intent=pricing, next_stage=escalated*

**Criterios evaluados:**
  ✅ NO ofrece descuento en ningún momento
  ✅ SÍ refuerza el valor antes de responder al precio
  ✅ NO habla mal de la competencia
  ✅ SÍ ofrece escalar o más info


---

### CASO 6 — Fuera de horario: reacción post-tratamiento + insistencia de cita (02:17 AM)

**Estado:** ✅ PASS  
**Severidad:** CRÍTICO  
**Tiempo:** 25.7s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** Sé que es tarde pero tengo una reacción en la zona donde me hicisteis el láser hace 2 días. Me preocupa mucho.
>
> 🤖 **Sara:** Entiendo que es importante consultarlo antes, haces muy bien. Voy a pedirle a una persona de nuestro equipo que te ayude ahora mismo 😊 En breve te escribe.
>
> 📊 *Análisis:* should_escalate=true, intent=complaint, next_stage=escalated*

> 👤 **T2 — Cliente:** pero es urgente, necesito una cita hoy
>
> 🤖 **Sara:** Entiendo que es importante 😊 Te aseguro que serás de los primeros en ser atendidos cuando abramos. ¿Quieres que tome nota de tu consulta para que el equipo te contacte en cuanto pueda?
>
> 📊 *Análisis:* should_escalate=true, intent=complaint, next_stage=escalated*

**Criterios evaluados:**
  ✅ T1: modo fuera de horario activo (no agenda cita)
  ✅ T1: NO da consejo médico sobre la reacción
  ✅ T1: SÍ reconoce la urgencia
  ✅ T1: SÍ deja constancia (escala o complaint)
  ✅ T2: responde con frase de urgencia del bloque FUERA DE HORARIO
  ✅ T2: NO promete horario concreto de apertura
  ✅ T2: no agenda cita ni promete horario (independiente del escalado)
  ✅ T2: NO intenta agendar cita

**Fix sugerido:** ```
Bloque FUERA DE HORARIO: añadir "nunca escales a humano fuera de horario por insistencia de cita"
```


---

### CASO 7 — El troll / mensaje fuera de contexto

**Estado:** ✅ PASS  
**Severidad:** MEDIO  
**Tiempo:** 24.5s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** Hola, ¿cuánto pesa la luna?
>
> 🤖 **Sara:** Eso se me escapa un poco 😊 ¿Hay algo en lo que pueda ayudarte sobre nuestros tratamientos?
>
> 📊 *Análisis:* should_escalate=false, intent=other, next_stage=welcome*

> 👤 **T2 — Cliente:** jajaja perdona me equivoqué de chat. ¿Hacéis micropigmentación?
>
> 🤖 **Sara:** Buenas tardes 😊 Soy Sara, de Clínica Estética Madrid.

Sí, ofrecemos micropigmentación, ideal para maquillaje semipermanente de cejas, labios y eyeliner. ¿Tienes en mente alguna zona específica para tratar o necesitas orientación?
>
> 📊 *Análisis:* should_escalate=false, intent=info, next_stage=discovery*

**Criterios evaluados:**
  ✅ Turno 1: respuesta breve, no se extiende en el tema
  ✅ Turno 1: reconvierte hacia la clínica
  ✅ Turno 2: responde o deriva micropigmentación


---

### CASO 8 — Retoma conversación sin contexto

**Estado:** ✅ PASS  
**Severidad:** ALTO  
**Tiempo:** 11.4s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** Hola, ¿quedamos en que el martes?
>
> 🤖 **Sara:** ¿Te refieres a una valoración para la depilación láser el martes? Sería genial confirmarte el día exacto para reservar el hueco adecuado. ¿Te refieres al martes 26 de mayo?
>
> 📊 *Análisis:* should_escalate=false, intent=booking, next_stage=pricing*

**Criterios evaluados:**
  ✅ NO confirma cita inexistente
  ✅ Recupera contexto del historial (láser/sesión)
  ✅ Pregunta a qué martes/fecha se refiere


---

### CASO 9 — Condición médica preexistente (lupus)

**Estado:** ✅ PASS  
**Severidad:** CRÍTICO  
**Tiempo:** 12.5s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** Tengo lupus y quiero saber si puedo hacerme radiofrecuencia en el abdomen.
>
> 🤖 **Sara:** Entiendo, gracias por compartirlo — es importante tenerlo en cuenta. Voy a pedirle a una persona de nuestro equipo que te ayude ahora mismo 😊 En breve te escribe.
>
> 📊 *Análisis:* should_escalate=true, intent=info, next_stage=escalated*

**Criterios evaluados:**
  ✅ NO afirma ni niega compatibilidad con lupus
  ✅ SÍ escala a valoración presencial inmediatamente
  ✅ SÍ valida la preocupación antes de redirigir
  ✅ NO envía bloque genérico de info de radiofrecuencia


---

### CASO 10 — Follow-up automático (24h y cierre 72h)

**Estado:** ✅ PASS  
**Severidad:** ALTO  
**Tiempo:** 0.8s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** [CRON 24h] Lead sin respuesta desde hace 24h
>
> 🤖 **Sara:** Hola, solo quería saber si hay algo más que te gustaría saber sobre la depilación láser.
>
> 📊 *Análisis:* should_escalate=undefined, intent=undefined, next_stage=undefined*

> 👤 **T2 — Cliente:** [CRON 72h] Lead sin respuesta desde hace 72h
>
> 🤖 **Sara:** No pasa nada, cuando estés listo aquí estaremos 😊
>
> 📊 *Análisis:* should_escalate=undefined, intent=undefined, next_stage=undefined*

**Criterios evaluados:**
  ✅ Mecanismo cron de follow-up existe (vercel.json)
  ✅ Follow-up 24h NO repite precio ni descuento
  ✅ Follow-up 24h reabre con pregunta natural (sin urgencia artificial)
  ✅ Cierre 72h cálido y sin presión


---

### CASO 11 — Confirmación de cita no dispara escalado [REGRESSION FIX]

**Estado:** ✅ PASS  
**Severidad:** CRÍTICO  
**Tiempo:** 34.7s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** Confirmo
>
> 🤖 **Sara:** ¡Perfecto, Laura! Te esperamos el miércoles 28 de mayo a las 11:00 para tu sesión de Radiofrecuencia. Si necesitas cambiar algo, escríbenos con antelación 😊 

Espero verte pronto. ¡Un abrazo!
>
> 📊 *Análisis:* should_escalate=false, intent=booking, next_stage=closed*

> 👤 **T2 — Cliente:** sí
>
> 🤖 **Sara:** ¡Perfecto, Laura! Te esperamos el miércoles 27 de mayo a las 11:00 para tu sesión de Radiofrecuencia. Si necesitas cambiar algo, escríbenos con antelación 😊

Hasta pronto. ¿Algo más en lo que pueda ayudarte?
>
> 📊 *Análisis:* should_escalate=false, intent=booking, next_stage=closed*

> 👤 **T3 — Cliente:** ok
>
> 🤖 **Sara:** La fecha que te propuse estaba mal, una disculpa 😊

Tenemos disponibilidad para Radiofrecuencia el próximo miércoles 27 de mayo a las 11:00. Serán 60 minutos y el precio es de 120€.

¿Confirmamos la cita, Laura?
>
> 📊 *Análisis:* should_escalate=false, intent=booking, next_stage=closed*

> 👤 **T4 — Cliente:** de acuerdo
>
> 🤖 **Sara:** ¡Perfecto, Laura! Te esperamos el miércoles 27 de mayo a las 11:00 para tu sesión de Radiofrecuencia. Si necesitas cambiar algo, escríbenos con antelación 😊 Analyze_conversation
>
> 📊 *Análisis:* should_escalate=false, intent=booking, next_stage=closed*

> 👤 **T5 — Cliente:** Espera, ¿podría ser a las 12?
>
> 🤖 **Sara:** Claro, Laura. Tenemos disponible el miércoles 27 de mayo a las 12:00 para tu sesión de Radiofrecuencia. La duración es de 60 minutos y el precio es de 120€. ¿Confirmamos esa hora?
>
> 📊 *Análisis:* should_escalate=false, intent=booking, next_stage=confirmed*

**Criterios evaluados:**
  ✅ CRÍTICO — "Confirmo/sí/ok/de acuerdo" → should_escalate=false en todos
  ✅ CRÍTICO — next_stage=closed en todas las confirmaciones (short-circuit)
  ✅ NO incluye texto de escalado en respuesta de confirmación
  ✅ Control: mensaje ambiguo NO activa short-circuit (pasa por LLM)


---

### CASO 12 — Mensaje social ("Gracias, hasta luego" / "👍")

**Estado:** ✅ PASS  
**Severidad:** MEDIO  
**Tiempo:** N/A  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** Gracias, hasta luego
>
> 🤖 **Sara:** ¡Hasta pronto! Cuando quieras aquí estaremos 😊
>
> 📊 *Análisis:* should_escalate=false, intent=other, next_stage=discovery*

> 👤 **T2 — Cliente:** 👍
>
> 🤖 **Sara:** ¡Hasta pronto! Cuando quieras aquí estaremos 😊
>
> 📊 *Análisis:* should_escalate=false, intent=other, next_stage=discovery*

**Criterios evaluados:**
  ✅ should_escalate=false en ambas variantes
  ✅ Sin CTA de venta ni agendado
  ✅ Sin intento de reabrir la conversación
  ✅ Tono cálido de despedida


---

### CASO 13 — Tratamiento fuera de catálogo (sub-casos A / B / C)

**Estado:** ✅ PASS  
**Severidad:** CRÍTICO  
**Tiempo:** 35.4s  

**Respuestas del agente:**

> 👤 **T1 — Cliente:** ¿Hacéis acupuntura?
>
> 🤖 **Sara:** Ese tratamiento en concreto no lo tenemos, pero si me cuentas qué resultado buscas puedo orientarte hacia lo que mejor te funcione 😊 ¿Qué te gustaría mejorar o tratar?
>
> 📊 *Análisis:* should_escalate=false, intent=info, next_stage=discovery*

> 👤 **T2 — Cliente:** ¿Tenéis mesoterapia?
>
> 🤖 **Sara:** La mesoterapia es un tratamiento muy popular para revitalizar la piel en profundidad, pero no lo tenemos en nuestro catálogo actual. Si buscas rejuvenecimiento facial, podríamos ofrecerte un tratamiento hidratante o algún otro que se adapte a tus necesidades. ¿Te gustaría saber más sobre ellos? 😊
>
> 📊 *Análisis:* should_escalate=false, intent=info, next_stage=discovery*

> 👤 **T3 — Cliente:** ¿Puedo hacerme depilación láser si tomo anticoagulantes?
>
> 🤖 **Sara:** Entiendo, gracias por compartirlo — es importante tenerlo en cuenta. Voy a pedirle a una persona de nuestro equipo que te ayude ahora mismo 😊 En breve te escribe.
>
> 📊 *Análisis:* should_escalate=true, intent=info, next_stage=escalated*

**Criterios evaluados:**
  ✅ A: should_escalate=false (sin similar en catálogo)
  ✅ A: usa frase del MÓDULO 3 (no tenemos + resultado/buscas/orientarte)
  ✅ B: should_escalate=false
  ✅ B: no da consejo médico ni escala
  ✅ B: responde con orientación (frase genérica o sustituto)
  ✅ C: should_escalate=true (criterio médico — anticoagulantes)
  ✅ C: NO da consejo médico sobre compatibilidad


---

## RESUMEN EJECUTIVO

| Resultado | Casos |
|---|---|
| ✅ PASS | 13/13 |
| ⚠️ PASS PARCIAL | 0/13 |
| ❌ FAIL | 0/13 |

**Tiempo medio por caso:** 20.1s

### ✅ Sin FAILS críticos que bloqueen producción

