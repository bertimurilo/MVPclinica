'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import '@/app/landing.css'
import VenuIcon from '@/components/ui/VenuIcon'
import { subscribeToWaitlist } from '@/app/actions/waitlist'

const VENU_PRICE = 149
const LOST_RATE = 0.1

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: '¿Mis clientes notarán que es una IA?',
    a: 'No si configuras bien el tono. Venu responde con el nombre de tu clínica, en tu estilo, con tus tratamientos. La mayoría de clientes lo toman por una recepcionista.',
  },
  {
    q: '¿Qué pasa si el bot no sabe responder algo?',
    a: 'Escala automáticamente al humano. Te avisa por el inbox y el cliente recibe: "Te paso con una de nuestras especialistas ahora mismo."',
  },
  {
    q: '¿Tengo que dejar de responder yo?',
    a: 'No. Puedes intervenir en cualquier conversación desde el inbox. Venu cubre las ausencias; tú te quedas con los casos complejos.',
  },
  {
    q: '¿Funciona con mi número de WhatsApp actual?',
    a: 'Sí. No necesitas número nuevo. Venu actúa desde tu mismo número. Tus clientes no notan ningún cambio.',
  },
  {
    q: '¿Cuánto tarda el setup?',
    a: 'Menos de 1 hora. Te acompañamos en el onboarding: conectas el número, subes tus tratamientos y listo.',
  },
  {
    q: '¿Puedo cancelar cuando quiera?',
    a: 'Sí. Sin permanencia, sin penalización. Cancelas desde el panel con un clic.',
  },
]

export default function LandingPage({ remainingSlots }: { remainingSlots: number | null }) {
  const [email, setEmail] = useState('')
  const [formDone, setFormDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const revealRef = useRef<HTMLDivElement>(null)

  // ROI calculator
  const [leadsStr, setLeadsStr] = useState('200')
  const [ticketStr, setTicketStr] = useState('80')
  const leads = Math.max(0, Number(leadsStr) || 0)
  const ticket = Math.max(0, Number(ticketStr) || 0)
  const monthlyLoss = Math.round(leads * LOST_RATE * ticket)
  const monthlyDiff = Math.max(0, monthlyLoss - VENU_PRICE)
  const fmt = (n: number) => n.toLocaleString('es-ES')

  // FAQ accordion (un item abierto a la vez)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  // Mobile nav
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    const root = revealRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return

    // Progressive enhancement: el CSS solo oculta .reveal cuando .js-reveal
    // está presente, así sin JS (o si algo falla) el contenido siempre se ve.
    root.classList.add('js-reveal')

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in')
            io.unobserve(en.target)
          }
        })
      },
      { threshold: 0.05, rootMargin: '0px 0px -10% 0px' }
    )
    root.querySelectorAll('.reveal').forEach((el) => io.observe(el))

    // Red de seguridad: si el observer no dispara (navegadores raros, errores),
    // revelar todo pasados 2,5s.
    const fallback = window.setTimeout(() => {
      root.querySelectorAll('.reveal:not(.in)').forEach((el) => el.classList.add('in'))
    }, 2500)

    return () => {
      io.disconnect()
      window.clearTimeout(fallback)
    }
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    startTransition(async () => {
      const result = await subscribeToWaitlist(email)
      if (result.success) {
        setFormDone(true)
        setEmail('')
      } else {
        setFormError(result.error ?? 'Error inesperado.')
      }
    })
  }

  const lowSlots = remainingSlots != null && remainingSlots <= 15

  const navLinks = (
    <>
      <a href="#problema" onClick={() => setMenuOpen(false)}>Problema</a>
      <a href="#funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
      <a href="#producto" onClick={() => setMenuOpen(false)}>Producto</a>
      <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
      <a href="#precio" onClick={() => setMenuOpen(false)}>Precio</a>
      <a href="/login" className="btn btn-ghost">Acceder</a>
      <a href="#waitlist" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Reservar plaza</a>
    </>
  )

  return (
    <div id="landing" ref={revealRef}>

      {/* NAV */}
      <nav>
        <div className="container">
          <a href="#" className="logo">
            <VenuIcon size={26} />
            Venu
          </a>
          <div className="nav-links">{navLinks}</div>
          <button
            type="button"
            className={`nav-burger${menuOpen ? ' open' : ''}`}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* MOBILE NAV OVERLAY */}
      {menuOpen && (
        <div className="nav-overlay" onClick={() => setMenuOpen(false)}>
          <div className="nav-overlay-links" onClick={(e) => e.stopPropagation()}>
            {navLinks}
          </div>
        </div>
      )}

      {/* HERO — copy a la izquierda, demo WhatsApp a la derecha */}
      <header className="hero">
        <div className="container">
          <div className="hero-copy">
            <a href="#waitlist" className={`badge${lowSlots ? ' badge-warn' : ''}`}>
              <span className="pill">BETA PRIVADA</span>
              {remainingSlots != null ? `Quedan ${remainingSlots} plazas` : 'Plazas muy limitadas'}
              <span className="arr">→</span>
            </a>

            <h1 className="display">
              Tu WhatsApp pierde citas{' '}
              <span className="grad">mientras atiendes a otro cliente.</span>
            </h1>

            <p className="hero-sub">
              Venu responde, califica y agenda 24/7 desde tu mismo número. Tus clientes
              no notan nada. Solo que siempre obtienen respuesta.
            </p>

            <div className="hero-ctas">
              <a href="#waitlist" className="btn btn-primary btn-lg">
                Consigue mi plaza →
              </a>
              <a href="#funciona" className="btn btn-ghost btn-lg">
                Ver cómo funciona
              </a>
            </div>

            <div className="hero-proof">
              <div className="proof-facepile">
                <div className="proof-av">M</div>
                <div className="proof-av">I</div>
                <div className="proof-av">L</div>
                <div className="proof-av">S</div>
              </div>
              <span className="proof-dot" />
              <span>47 clínicas ya en la lista de espera</span>
            </div>
          </div>

          {/* Demo WhatsApp animada */}
          <div className="hero-visual">
            <div className="wa-phone">
              <div className="wa-header">
                <div className="wa-avatar">CA</div>
                <div className="wa-title">
                  <span className="wa-name">Clínica Aurora</span>
                  <span className="wa-status"><span className="wa-online" />Online</span>
                </div>
              </div>
              <div className="wa-chat">
                <div className="wa-msg wa-client wa-s1">
                  Hola, ¿hacéis tratamiento de manchas? ¿Qué precio tiene?
                </div>
                <div className="wa-typing wa-s2" aria-hidden="true"><span /><span /><span /></div>
                <div className="wa-msg wa-venu wa-s3">
                  ¡Hola! Sí, hacemos tratamiento de manchas con láser desde €120. ¿Te gustaría que
                  te reservara una consulta gratuita esta semana?
                </div>
                <div className="wa-msg wa-client wa-s4">Sí, el jueves si puede ser</div>
                <div className="wa-typing wa-s5" aria-hidden="true"><span /><span /><span /></div>
                <div className="wa-msg wa-venu wa-s6">
                  Perfecto ✓ Te confirmo el jueves a las 10:30h. Te mando recordatorio 24h antes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className="container">
          <div className="stat">
            <div className="n"><em>78%</em></div>
            <div className="l">de leads de Instagram llegan por WhatsApp</div>
          </div>
          <div className="stat">
            <div className="n"><em>4h</em></div>
            <div className="l">tiempo medio que tarda una clínica en contestar</div>
          </div>
          <div className="stat">
            <div className="n"><em>9/10</em></div>
            <div className="l">leads no vuelve si tardas más de 2 horas</div>
          </div>
          <div className="stat">
            <div className="n">€<em>1.600</em></div>
            <div className="l">lo que una clínica media deja de facturar al mes</div>
          </div>
        </div>
      </div>

      {/* PROBLEMA */}
      <section id="problema">
        <div className="container">
          <div className="sec-head">
            <span className="eyebrow">El problema</span>
            <h2>
              Los leads llegan a las 9am.<br />
              Tú los ves <span className="grad">a las 6pm.</span>
            </h2>
            <p className="sec-lead">
              Hablamos con dueñas de clínicas estéticas en España. El problema es siempre el mismo.
            </p>
          </div>

          <div className="problem-grid">
            <ul className="problem-list">
              <li>
                <span className="n">01</span>
                <div>
                  <strong>Instagram trae los leads. WhatsApp los pierde.</strong>
                  <p>
                    Gastas en Ads para que te escriban. El problema no es que no lleguen. Es que
                    cuando los lees ya se han ido a otra clínica.
                  </p>
                </div>
              </li>
              <li>
                <span className="n">02</span>
                <div>
                  <strong>&ldquo;Respondo cuando puedo.&rdquo;</strong>
                  <p>
                    Entre clientes, entre cabinas, al cerrar. Y para entonces el lead ya ha pedido
                    precio en tres sitios más.
                  </p>
                </div>
              </li>
              <li>
                <span className="n">03</span>
                <div>
                  <strong>Nadie hace seguimiento.</strong>
                  <p>
                    El lead que no reservó a la primera se queda en el limbo. No hay recordatorio a
                    las 24h, ni a los 3 días, ni al mes. Simplemente desaparece.
                  </p>
                </div>
              </li>
              <li>
                <span className="n">04</span>
                <div>
                  <strong>El software que usáis no está hecho para vosotras.</strong>
                  <p>
                    Los programas de salón de belleza son para peluquerías. No entienden tratamientos
                    de ticket alto, ni ciclos de varias sesiones, ni leads que necesitan convencerse
                    antes de reservar.
                  </p>
                </div>
              </li>
            </ul>

            <aside className="roi-card">
              <div className="tag">Haz la cuenta tú misma</div>
              <h3>Lo que tu clínica deja de ingresar este mes.</h3>
              <div className="roi-math">
                <div>
                  <label htmlFor="roi-leads">Leads que llegan al mes</label>
                  <input
                    id="roi-leads"
                    className="roi-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={9999}
                    value={leadsStr}
                    onChange={(e) => setLeadsStr(e.target.value)}
                  />
                </div>
                <div>
                  <span>Se pierden por no responder</span>
                  <span>10%</span>
                </div>
                <div>
                  <label htmlFor="roi-ticket">Ticket medio por cita (€)</label>
                  <input
                    id="roi-ticket"
                    className="roi-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={99999}
                    value={ticketStr}
                    onChange={(e) => setTicketStr(e.target.value)}
                  />
                </div>
              </div>
              <div className="roi-total">
                <span className="l">Pérdida mensual</span>
                <span className="a">€{fmt(monthlyLoss)}</span>
              </div>
              <div className="roi-foot">
                {`// Venu cuesta €${VENU_PRICE}/mes. La diferencia es de €${fmt(monthlyDiff)}/mes.`}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="funciona" className="section-soft">
        <div className="container">
          <div className="sec-head center">
            <span className="eyebrow">Cómo funciona</span>
            <h2>
              Tres pasos. <span className="grad">Nada más.</span>
            </h2>
            <p className="sec-lead">
              Conectas tu WhatsApp, le dices a Venu cómo trabajas y te olvidas. Tú recibes citas,
              no mensajes.
            </p>
          </div>

          <div className="steps">
            <article className="step reveal">
              <div className="n">01</div>
              <h3>Conecta tu WhatsApp</h3>
              <p>
                Enlazas tu número. El mismo que ya tienes. Tus clientes no notan ningún cambio.
              </p>
            </article>
            <article className="step reveal">
              <div className="n">02</div>
              <h3>Configura tu clínica</h3>
              <p>
                Subes tus tratamientos, precios y el tono en el que quieres que conteste. Venu
                responde como lo harías tú.
              </p>
            </article>
            <article className="step reveal">
              <div className="n">03</div>
              <h3>Abre la agenda y mira</h3>
              <p>Venu responde, filtra y agenda. Tú entras y ves el día lleno de citas confirmadas.</p>
            </article>
          </div>
        </div>
      </section>

      {/* PRODUCTO */}
      <section id="producto">
        <div className="container">
          <div className="sec-head center">
            <span className="eyebrow">Producto</span>
            <h2>
              No es solo un bot.<br />
              Es todo lo que necesitas para{' '}
              <span className="grad">gestionar leads.</span>
            </h2>
            <p className="sec-lead">
              CRM, pipeline, inbox y métricas. Pensado para clínicas de estética.
            </p>
          </div>

          {/* Dashboard mockup */}
          <div className="demo-wrap reveal">
            <div className="demo-frame">
              <div className="demo-tabs">
                <div className="traffic">
                  <span /><span /><span />
                </div>
                <div style={{ width: 54 }} />
              </div>

              <div className="demo-body">
                {/* Sidebar */}
                <aside className="demo-sidebar">
                  <h4>Clínica Aurora</h4>
                  <div className="nav-item active">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                      <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
                    </svg>
                    Dashboard
                  </div>
                  <div className="nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Inbox
                    <span className="count">12</span>
                  </div>
                  <div className="nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="18" /><rect x="14" y="3" width="7" height="10" />
                    </svg>
                    Pipeline
                  </div>
                  <div className="nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    Clientes
                    <span className="count">248</span>
                  </div>
                  <div className="nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
                    </svg>
                    Follow-up
                  </div>
                  <div className="nav-sep" />
                  <div className="nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Ajustes
                  </div>
                </aside>

                {/* Main */}
                <div className="demo-main">
                  <div className="demo-head">
                    <h3>
                      Resumen <span className="sub">noviembre 2026</span>
                    </h3>
                    <div className="range">
                      <span>7d</span>
                      <span className="on">30d</span>
                      <span>90d</span>
                    </div>
                  </div>

                  <div className="kpis">
                    <div className="kpi">
                      <div className="lbl">Citas agendadas</div>
                      <div className="val">187</div>
                      <span className="delta">↑ 32%</span>
                    </div>
                    <div className="kpi">
                      <div className="lbl">Conversión</div>
                      <div className="val">
                        41<span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>%</span>
                      </div>
                      <span className="delta">↑ 8.2%</span>
                    </div>
                    <div className="kpi">
                      <div className="lbl">Tiempo respuesta</div>
                      <div className="val">
                        12<span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>s</span>
                      </div>
                      <span className="delta">↓ 4h vs antes</span>
                    </div>
                    <div className="kpi">
                      <div className="lbl">Ingresos generados</div>
                      <div className="val">€14.9k</div>
                      <span className="delta">↑ 28%</span>
                    </div>
                  </div>

                  <div className="chart-card">
                    <div className="chart-head">
                      <h4>Citas en el tiempo</h4>
                      <span className="sub">
                        últimos 30 días · <b>+187 citas</b>
                      </span>
                    </div>
                    <svg className="chart-svg" viewBox="0 0 600 110" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gradLine" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>
                      </defs>
                      <g stroke="#ececf4" strokeWidth="1">
                        <line x1="0" y1="22" x2="600" y2="22" />
                        <line x1="0" y1="55" x2="600" y2="55" />
                        <line x1="0" y1="88" x2="600" y2="88" />
                      </g>
                      <path
                        d="M0,90 L40,82 L80,85 L120,72 L160,68 L200,60 L240,62 L280,48 L320,52 L360,38 L400,30 L440,34 L480,22 L520,18 L560,14 L600,10 L600,110 L0,110 Z"
                        fill="url(#gradArea)"
                      />
                      <path
                        d="M0,90 L40,82 L80,85 L120,72 L160,68 L200,60 L240,62 L280,48 L320,52 L360,38 L400,30 L440,34 L480,22 L520,18 L560,14 L600,10"
                        fill="none"
                        stroke="url(#gradLine)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="600" cy="10" r="4" fill="#7c3aed" />
                      <circle cx="600" cy="10" r="9" fill="#7c3aed" opacity="0.15" />
                    </svg>
                  </div>

                  <div className="pipeline-card">
                    <h4>Pipeline esta semana</h4>
                    <div className="pipe-cols">
                      <div className="pipe-col">
                        <div className="ph">
                          <span className="name">Nuevo</span>
                          <span className="n">14</span>
                        </div>
                        <div className="pipe-card">
                          <span className="who">Marta G.</span>
                          <span className="amt">€480</span>
                        </div>
                        <div className="pipe-card">
                          <span className="who">Laia R.</span>
                          <span className="amt">€220</span>
                        </div>
                      </div>
                      <div className="pipe-col">
                        <div className="ph">
                          <span className="name">Contactado</span>
                          <span className="n">9</span>
                        </div>
                        <div className="pipe-card">
                          <span className="who">Sofia V.</span>
                          <span className="amt">€340</span>
                        </div>
                      </div>
                      <div className="pipe-col">
                        <div className="ph">
                          <span className="name">Agendado</span>
                          <span className="n">23</span>
                        </div>
                        <div className="pipe-card alt">
                          <span className="who">Ana T.</span>
                          <span className="amt">€180</span>
                        </div>
                        <div className="pipe-card alt">
                          <span className="who">Lucía P.</span>
                          <span className="amt">€480</span>
                        </div>
                      </div>
                      <div className="pipe-col">
                        <div className="ph">
                          <span className="name">Cliente</span>
                          <span className="n">141</span>
                        </div>
                        <div className="pipe-card alt">
                          <span className="who">Carla M.</span>
                          <span className="amt">€80</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features grid compacto */}
          <div className="features-grid">
            <article className="feature-card reveal">
              <div className="ico">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <h3>WhatsApp 24/7</h3>
              <p>
                Responde, califica, agenda y escala a humano cuando toca. Da igual si es domingo a
                las 11 de la noche.
              </p>
            </article>

            <article className="feature-card reveal">
              <div className="ico">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>CRM de clientes</h3>
              <p>
                Ficha por persona con historial, tratamiento de interés y notas. Toda la información
                a un clic.
              </p>
            </article>

            <article className="feature-card reveal">
              <div className="ico">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h3>Inbox unificado</h3>
              <p>Todas las conversaciones en un sitio. Puedes intervenir en cualquier momento.</p>
            </article>

            <article className="feature-card reveal">
              <div className="ico">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="18" /><rect x="14" y="3" width="7" height="10" />
                </svg>
              </div>
              <h3>Pipeline visual</h3>
              <p>
                Sabes en qué punto está cada lead. De &ldquo;acaba de escribir&rdquo; a &ldquo;cliente que repite&rdquo;.
              </p>
            </article>

            <article className="feature-card reveal">
              <div className="ico">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
                </svg>
              </div>
              <h3>Follow-up automático</h3>
              <p>
                Si no responde en 24h, Venu insiste. A los 3 días también. Y reactiva clientes
                inactivos a los 90 días.
              </p>
            </article>

            <article className="feature-card reveal">
              <div className="ico">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3>Métricas</h3>
              <p>
                De dónde vienen los leads, cuántos convierten, cuánto tardas en responder. Números,
                no sensaciones.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* VOICES */}
      <section className="section-soft">
        <div className="container">
          <div className="sec-head">
            <span className="eyebrow">Validado con vosotras</span>
            <h2>
              Esto lo dijeron <span className="grad">ellas</span>, no nosotros.
            </h2>
            <p className="sec-lead">
              Hablamos con clínicas en España y Brasil antes de escribir una línea de código.
            </p>
          </div>

          <div className="voices">
            <article className="voice reveal">
              <blockquote>
                Respondo cuando puedo. Entre cliente y cliente, o al final del día. Sé que pierdo
                gente, pero es que no tengo manos.
              </blockquote>
              <div className="who">
                <div className="av">M</div>
                <div>
                  <div className="nm">María</div>
                  <div className="rl">Clínica estética · España</div>
                </div>
              </div>
            </article>
            <article className="voice reveal">
              <blockquote>
                Tengo dos números de WhatsApp y es un caos. No sé ni qué lead vino de dónde.
              </blockquote>
              <div className="who">
                <div className="av">I</div>
                <div>
                  <div className="nm">Inés</div>
                  <div className="rl">Centro de medicina estética</div>
                </div>
              </div>
            </article>
            <article className="voice reveal">
              <blockquote>
                Sé que hay herramientas para automatizar esto, llevo tiempo queriendo mirar. Pero no
                hay nada hecho para nuestro sector.
              </blockquote>
              <div className="who">
                <div className="av">L</div>
                <div>
                  <div className="nm">Lorena</div>
                  <div className="rl">Clínica de estética avanzada</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="container">
          <div className="sec-head center">
            <span className="eyebrow">Dudas frecuentes</span>
            <h2>
              Lo que toda clínica pregunta <span className="grad">antes de empezar.</span>
            </h2>
          </div>

          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => {
              const open = faqOpen === i
              return (
                <div className={`faq-item${open ? ' open' : ''}`} key={item.q}>
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={open}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-trigger-${i}`}
                    onClick={() => setFaqOpen(open ? null : i)}
                  >
                    {item.q}
                    <span className="faq-chevron" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>
                  <div
                    className="faq-a-wrap"
                    role="region"
                    id={`faq-panel-${i}`}
                    aria-labelledby={`faq-trigger-${i}`}
                  >
                    <div className="faq-a-inner">
                      <p className="faq-a">{item.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="precio" className="section-soft">
        <div className="container">
          <div className="pricing-wrap">
            <div>
              <span className="eyebrow">Precio</span>
              <h2>
                Un precio.<br />
                <span className="grad">Sin letra pequeña.</span>
              </h2>
              <p className="sec-lead" style={{ marginBottom: 32 }}>
                Nada de cobrar por mensaje, por conversación o por lead. Una cuota al mes que cuesta
                menos que dos citas perdidas.
              </p>
              <ul style={{ listStyle: 'none' }}>
                <li className="feature-li"><span className="ck">✓</span> Cancelas cuando quieras</li>
                <li className="feature-li"><span className="ck">✓</span> Setup y onboarding incluidos</li>
                <li className="feature-li"><span className="ck">✓</span> Soporte en español</li>
                <li className="feature-li"><span className="ck">✓</span> 30 días de garantía</li>
              </ul>
            </div>

            <div className="price-card">
              <div className="price-plan">Plan Venu</div>
              <div className="price-num">
                <span className="cur">€</span>
                <span className="n">149</span>
                <span className="per">/mes</span>
              </div>
              <p className="price-sub">Todo incluido. Sin sorpresas.</p>
              <ul className="price-list" style={{ listStyle: 'none' }}>
                <li className="feature-li"><span className="ck">✓</span> WhatsApp 24/7</li>
                <li className="feature-li"><span className="ck">✓</span> CRM con fichas de cliente</li>
                <li className="feature-li"><span className="ck">✓</span> Pipeline visual (kanban)</li>
                <li className="feature-li"><span className="ck">✓</span> Inbox de conversaciones</li>
                <li className="feature-li"><span className="ck">✓</span> Dashboard de métricas</li>
                <li className="feature-li"><span className="ck">✓</span> Follow-up automático</li>
                <li className="feature-li"><span className="ck">✓</span> Mensajes ilimitados</li>
              </ul>
              <a href="#waitlist" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
                Consigue mi plaza →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="waitlist" className="final">
        <div className="container">
          <span className="eyebrow">Beta privada</span>
          <h2>
            Sé la primera clínica<br />
            en <span className="grad">dejar de perder citas.</span>
          </h2>
          <p>Únete a la waitlist. Te avisamos cuando haya plaza. Sin compromiso, sin tarjeta.</p>
          {formDone ? (
            <p style={{ fontSize: '1.15rem', fontWeight: 600, color: '#7C3AED', marginTop: '1.5rem' }}>
              ¡Apuntado! Te avisamos en el lanzamiento 🎉
            </p>
          ) : (
            <>
              <form className="waitlist-form" onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="tu@clinica.com"
                  required
                  aria-label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                />
                <button type="submit" disabled={isPending} style={isPending ? { opacity: 0.7 } : undefined}>
                  {isPending ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Guardando…
                    </span>
                  ) : 'Consigue acceso →'}
                </button>
              </form>
              {formError && (
                <p style={{ color: '#dc2626', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  {formError}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container" style={{ justifyContent: 'center' }}>
          <div className="lgrid" style={{ justifyContent: 'center' }}>
            <div className="col">
              <h5>Producto</h5>
              <a href="#producto">Funcionalidades</a>
              <a href="#precio">Precio</a>
              <a href="#funciona">Cómo funciona</a>
            </div>
            <div className="col">
              <h5>Empresa</h5>
              <a href="https://x.com/venuhq" target="_blank" rel="noopener">@venuhq</a>
              <a href="https://www.indiehackers.com/venuhq" target="_blank" rel="noopener">IndieHackers</a>
              <a href="mailto:hola@venu.app">hola@venu.app</a>
            </div>
            <div className="col">
              <h5>Recursos</h5>
              <a href="#waitlist">Waitlist</a>
              <a href="#problema">El problema</a>
            </div>
          </div>
          <div className="legal" style={{ justifyContent: 'center' }}>
            <span>© 2026 Venu</span>
            <span>v0.1.0 · beta</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
