import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarCheck,
  Car,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Gauge,
  Hammer,
  KeyRound,
  Mail,
  MessageCircle,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Store,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { LandingEffects } from "@/components/landing/landing-effects";
import { LandingHeader } from "@/components/landing/landing-header";
import { getBillingCommissionPercent } from "@/lib/billing";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/types/domain";

const WHATSAPP_NUMBER = "584121385416";
const WHATSAPP_MESSAGE = "Hola, quiero TorkeOS para mi taller. ¿Me cuentan cómo empezar?";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
const CONTACT_EMAIL = "contacto@torkeos.com";

const commission = getBillingCommissionPercent();

const title = "TorkeOS · Software para talleres mecánicos: citas, diagnósticos y presupuestos";
const description = `Gestiona tu taller mecánico desde el teléfono: agenda online, órdenes de trabajo, diagnósticos, presupuestos aprobados por el cliente y avisos por WhatsApp. Gratis para clientes; los talleres pagan solo el ${commission}% de lo aprobado.`;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: [
    "software para talleres mecánicos",
    "sistema de gestión de taller",
    "órdenes de trabajo taller",
    "presupuestos taller mecánico",
    "agenda de citas taller",
    "diagnóstico automotriz",
    "taller mecánico Venezuela",
    "TorkeOS",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "TorkeOS",
    locale: "es_VE",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  category: "business",
};

type Step = { icon: LucideIcon; status?: string; title: string; body: string; branch?: string };

const ownerSteps: Step[] = [
  {
    icon: Store,
    title: "Alta de tu taller",
    body: "Creamos tu taller, te asignamos como dueño y activamos tu página pública de reservas con tu propio enlace.",
  },
  {
    icon: Users,
    title: "Arma tu equipo",
    body: "Registra a tus mecánicos con su especialidad (frenos, electroauto, motores, transmisiones…) y actívalos o desactívalos cuando quieras.",
  },
  {
    icon: CalendarCheck,
    status: ORDER_STATUS_LABELS.por_ingresar,
    title: "Recibe citas sin cruces",
    body: "Tus clientes reservan en bloques de 30 minutos entre 8:00 y 18:00. La agenda impide dos citas en el mismo horario. También puedes crear órdenes tú mismo.",
  },
  {
    icon: Car,
    status: ORDER_STATUS_LABELS.ingresado,
    title: "Recepción del vehículo",
    body: "Asignas un mecánico a la orden y él registra el ingreso del vehículo, con fecha y hora.",
  },
  {
    icon: Stethoscope,
    status: ORDER_STATUS_LABELS.diagnosticado,
    title: "Diagnóstico detallado",
    body: "El mecánico carga cada hallazgo con su precio. Todo queda registrado en la orden, sin papeles perdidos.",
  },
  {
    icon: FileText,
    status: ORDER_STATUS_LABELS.presupuestado,
    title: "Publicas el presupuesto",
    body: "Revisas los montos, indicas si incluye repuestos y lo publicas. Avisas al cliente por WhatsApp con un solo toque.",
  },
  {
    icon: Hammer,
    status: ORDER_STATUS_LABELS.en_reparacion,
    title: "El cliente decide",
    body: "Si lo aprueba, la orden pasa sola a reparación.",
    branch: `Si lo rechaza, queda como "${ORDER_STATUS_LABELS.presupuesto_rechazado}" y puedes volver a diagnosticar o enviar otro presupuesto.`,
  },
  {
    icon: KeyRound,
    status: `${ORDER_STATUS_LABELS.listo_para_entregar} → ${ORDER_STATUS_LABELS.entregado}`,
    title: "Entrega y cierre",
    body: "Marcas el vehículo como listo, el cliente recibe el aviso y cierras la orden con la entrega.",
  },
  {
    icon: Receipt,
    title: "Tu facturación, clara",
    body: `Cada mes ves los presupuestos aceptados, su total y la comisión del ${commission}%. Sin letras pequeñas.`,
  },
];

const clientSteps: Step[] = [
  {
    icon: UserPlus,
    title: "Crea tu cuenta gratis",
    body: "Solo nombre, correo, teléfono y cédula. Sin tarjetas y sin costo, ni ahora ni después.",
  },
  {
    icon: Car,
    title: "Registra tu vehículo",
    body: "Elige marca y modelo del catálogo y guarda tus vehículos para reservar más rápido.",
  },
  {
    icon: CalendarCheck,
    status: ORDER_STATUS_LABELS.por_ingresar,
    title: "Agenda tu cita",
    body: "Entra a la página de tu taller, elige día y hora libre y listo. Ves tus citas cuando quieras.",
  },
  {
    icon: Wrench,
    status: ORDER_STATUS_LABELS.ingresado,
    title: "Deja tu vehículo",
    body: "El taller registra el ingreso y un mecánico se encarga de revisarlo.",
  },
  {
    icon: ClipboardList,
    status: ORDER_STATUS_LABELS.presupuestado,
    title: "Mira el presupuesto",
    body: "Recibes cada trabajo con su precio, el total y si incluye repuestos. Todo claro antes de pagar.",
  },
  {
    icon: ShieldCheck,
    title: "Tú decides",
    body: "Apruebas o rechazas desde tu teléfono. Nada se repara sin tu autorización.",
  },
  {
    icon: Bell,
    status: ORDER_STATUS_LABELS.en_reparacion,
    title: "Sigue la reparación",
    body: "Te avisamos por WhatsApp cada vez que tu vehículo cambia de estado.",
  },
  {
    icon: KeyRound,
    status: ORDER_STATUS_LABELS.entregado,
    title: "Retira tu vehículo",
    body: "Cuando esté listo, te avisamos para que lo busques. Orden cerrada, historial guardado.",
  },
];

const faqs = [
  {
    q: "¿Cuánto cuesta TorkeOS?",
    a: `Para los clientes es completamente gratis. Los talleres no pagan cuota fija: solo el ${commission}% del monto de cada presupuesto que su cliente acepta.`,
  },
  {
    q: `¿Cómo se calcula el ${commission}%?`,
    a: `Se suma el total de los presupuestos aprobados en el mes y se aplica el ${commission}%. Los presupuestos rechazados o pendientes no generan ningún cobro.`,
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. TorkeOS funciona en el navegador de cualquier teléfono, tablet o computadora, y puedes agregarlo a tu pantalla de inicio como una app.",
  },
  {
    q: "¿Cómo se enteran mis clientes del estado de su vehículo?",
    a: "Desde cada orden envías por WhatsApp un mensaje con el estado del vehículo y, si aplica, el detalle completo del presupuesto.",
  },
  {
    q: "¿Puedo trabajar con varios mecánicos?",
    a: "Sí. Registras a tu equipo con su especialidad, asignas cada orden a un mecánico y cada uno ve solo los trabajos que le corresponden.",
  },
  {
    q: "¿Qué pasa si el cliente rechaza el presupuesto?",
    a: "La orden queda como presupuesto rechazado y puedes volver a diagnosticar o enviar un presupuesto nuevo sin perder el historial.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "#organization",
      name: "TorkeOS",
      email: CONTACT_EMAIL,
      contactPoint: { "@type": "ContactPoint", telephone: `+${WHATSAPP_NUMBER}`, contactType: "sales", availableLanguage: "es" },
    },
    {
      "@type": "SoftwareApplication",
      name: "TorkeOS",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS",
      description,
      inLanguage: "es",
      publisher: { "@id": "#organization" },
      offers: [
        { "@type": "Offer", name: "Clientes", price: "0", priceCurrency: "USD", description: "Cuenta gratuita para dueños de vehículos." },
        {
          "@type": "Offer",
          name: "Talleres",
          description: `Comisión del ${commission}% sobre los presupuestos aceptados por los clientes. Sin cuota fija.`,
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
    },
  ],
};

function delay(i: number) {
  return { "--i": i } as CSSProperties;
}

function SectionTag({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#ff765f]">
      <span className="h-px w-8 bg-[#ef3f26]" aria-hidden />
      {children}
    </p>
  );
}

function WhatsAppButton({ className, children = "Hablar por WhatsApp" }: { className?: string; children?: ReactNode }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-md bg-[#ef3f26] px-5 font-bold text-white transition hover:bg-[#d9341d] hover:shadow-[0_0_40px_rgba(239,63,38,0.55)] ${className ?? ""}`}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
      <MessageCircle size={19} className="relative" />
      <span className="relative">{children}</span>
      <ArrowRight size={18} className="relative transition-transform group-hover:translate-x-1" />
    </a>
  );
}

function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="landing-track relative grid gap-8 sm:gap-10">
      <span className="absolute left-[21px] top-2 bottom-2 w-0.5 bg-white/10 sm:left-[27px]" aria-hidden>
        <span className="landing-track-fill absolute inset-0 bg-gradient-to-b from-[#ff765f] to-[#ef3f26] shadow-[0_0_14px_#ef3f26]" />
      </span>
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <li key={step.title} className="landing-step relative grid grid-cols-[44px_1fr] gap-4 sm:grid-cols-[56px_1fr] sm:gap-6">
            <span className="landing-step-dot relative z-10 grid size-11 place-items-center rounded-full border-2 border-white/20 bg-[#171a1f] text-stone-400 sm:size-14">
              <Icon size={20} aria-hidden />
            </span>
            <div
              data-reveal="right"
              data-spotlight
              className="rounded-lg border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#ef3f26]/40 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-sm font-bold text-stone-500">{String(index + 1).padStart(2, "0")}</span>
                {step.status && (
                  <span className="rounded-full border border-[#ef3f26]/40 bg-[#ef3f26]/10 px-2.5 py-0.5 text-xs font-bold text-[#ff765f]">
                    {step.status}
                  </span>
                )}
              </div>
              <h3 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{step.title}</h3>
              <p className="mt-2 leading-7 text-stone-300">{step.body}</p>
              {step.branch && (
                <p className="mt-3 flex gap-2 rounded-md border border-white/10 bg-black/30 p-3 text-sm leading-6 text-stone-300">
                  <RotateCcw size={16} className="mt-1 shrink-0 text-[#ff765f]" aria-hidden />
                  {step.branch}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function HomePage() {
  const statusLabels = ORDER_STATUSES.map((status) => ORDER_STATUS_LABELS[status]);

  return (
    <div className="landing min-h-dvh overflow-x-clip bg-[#171a1f] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LandingEffects />
      <LandingHeader whatsappUrl={WHATSAPP_URL} />

      <main>
        {/* Hero */}
        <section className="relative isolate flex min-h-svh items-end overflow-hidden pb-16 pt-28 sm:items-center sm:pb-24" aria-labelledby="hero-title">
          <div className="landing-parallax absolute inset-0 -z-20">
            <div className="landing-kenburns absolute inset-0">
              <Image
                src="/images/cars/muscle.jpg"
                alt="Auto clásico verde con las luces traseras encendidas entrando a un taller"
                fill
                preload
                sizes="100vw"
                className="object-cover object-[60%_center]"
              />
            </div>
          </div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#171a1f] via-black/60 to-black/70" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
          <div className="landing-glow pointer-events-none absolute -bottom-40 left-1/2 -z-10 size-[600px] -translate-x-1/2 rounded-full blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-24 -z-10 overflow-hidden" aria-hidden>
            <span className="landing-taillight left-0 top-0" />
            <span className="landing-taillight left-0 top-6 opacity-60" style={{ "--d": "2.4s" } as CSSProperties} />
          </div>

          <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-12">
            <div className="max-w-4xl">
              <p className="landing-fade-up" style={delay(-3)}>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-stone-200 backdrop-blur sm:text-sm">
                  <span className="relative flex size-2">
                    <span className="landing-wa-ring absolute inset-0 rounded-full bg-[#ef3f26]" />
                    <span className="relative size-2 rounded-full bg-[#ef3f26]" />
                  </span>
                  Software para talleres mecánicos
                </span>
              </p>
              <h1 id="hero-title" className="mt-6 font-display text-[clamp(3rem,11vw,8.5rem)] font-bold leading-[0.88]">
                <span className="landing-line"><span style={delay(0)}>El taller completo,</span></span>
                <span className="landing-line"><span style={delay(1)} className="landing-gradient-text">bajo control.</span></span>
              </h1>
              <p className="landing-fade-up mt-6 max-w-2xl text-base leading-7 text-stone-200 sm:text-xl sm:leading-8" style={delay(1)}>
                Citas, órdenes, diagnósticos y presupuestos conectados en una sola plataforma. Tu equipo trabaja más rápido
                y tus clientes aprueban desde el teléfono.
              </p>
              <div className="landing-fade-up mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={delay(2)}>
                <WhatsAppButton>Quiero TorkeOS en mi taller</WhatsAppButton>
                <a
                  href="#talleres"
                  className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/40 bg-black/30 px-5 font-bold text-white backdrop-blur transition hover:border-white hover:bg-white/10"
                >
                  Ver cómo funciona
                </a>
              </div>
              <dl className="landing-fade-up mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-white/15 pt-6" style={delay(3)}>
                {[
                  ["$0", "para clientes"],
                  [`${commission}%`, "solo si aprueban"],
                  ["100%", "desde el móvil"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="sr-only">{label}</dt>
                    <dd className="font-display text-3xl font-bold sm:text-5xl">{value}</dd>
                    <dd className="mt-1 text-xs text-stone-300 sm:text-sm">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <a href="#nosotros" className="landing-scroll-cue absolute bottom-6 right-4 hidden items-center gap-2 text-sm font-bold text-stone-300 sm:right-8 sm:flex lg:right-12" aria-label="Bajar a Nosotros">
            Descubre <ChevronDown size={18} />
          </a>
        </section>

        {/* Status marquee */}
        <div className="landing-marquee overflow-hidden border-y border-white/10 bg-[#ef3f26] py-4" aria-hidden>
          <div className="landing-marquee-track flex w-max gap-10">
            {[...statusLabels, ...statusLabels].map((label, index) => (
              <span key={index} className="flex items-center gap-10 whitespace-nowrap font-display text-2xl font-bold uppercase sm:text-3xl">
                {label}
                <Wrench size={20} className="opacity-60" />
              </span>
            ))}
          </div>
        </div>

        {/* About */}
        <section id="nosotros" className="relative px-4 py-24 sm:px-8 sm:py-32 lg:px-12" aria-labelledby="nosotros-title">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <div data-reveal="up"><SectionTag>Nosotros</SectionTag></div>
              <h2 id="nosotros-title" data-reveal="up" style={delay(1)} className="mt-4 font-display text-5xl font-bold leading-[0.95] sm:text-6xl lg:text-7xl">
                Llevamos el taller al <span className="text-[#ef3f26]">siglo XXI</span>.
              </h2>
              <p data-reveal="up" style={delay(2)} className="mt-6 text-lg leading-8 text-stone-300">
                TorkeOS nace para resolver lo que más le cuesta a un taller mecánico: ordenar el trabajo y ganarse la confianza
                del cliente. Digitalizamos todo el ciclo de servicio, desde la cita hasta la entrega, y conectamos en una sola
                plataforma al dueño del taller, a sus mecánicos y a cada persona que confía su vehículo.
              </p>
              <p data-reveal="up" style={delay(3)} className="mt-4 text-lg leading-8 text-stone-300">
                Nuestro objetivo es simple: que el taller trabaje con orden y que el cliente sepa en todo momento qué se le hace a
                su vehículo, cuánto cuesta y cuándo estará listo.
              </p>

              <ul className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Gauge, title: "Control", body: "Cada orden con estado, responsable y fechas." },
                  { icon: BadgeCheck, title: "Transparencia", body: "Presupuestos claros que el cliente aprueba." },
                  { icon: Smartphone, title: "Movilidad", body: "Todo desde el teléfono, sin instalar nada." },
                ].map((item, index) => (
                  <li
                    key={item.title}
                    data-reveal="up"
                    data-spotlight
                    style={delay(index + 4)}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-[#ef3f26]/50"
                  >
                    <item.icon className="text-[#ef3f26]" size={26} aria-hidden />
                    <h3 className="mt-3 font-display text-2xl font-bold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-stone-400">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div data-reveal="curtain" className="relative aspect-[4/5] overflow-hidden rounded-lg sm:aspect-[4/3] lg:aspect-[4/5]">
                <Image
                  src="/images/cars/mechanic-man.jpg"
                  alt="Mecánico ajustando el motor de un vehículo con una llave de trinquete"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[2s] hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              </div>
              <div
                data-reveal="zoom"
                style={delay(3)}
                className="absolute -bottom-6 left-4 right-4 rounded-lg border border-white/15 bg-[#171a1f]/90 p-5 backdrop-blur-xl sm:-left-6 sm:right-auto sm:max-w-xs"
              >
                <p className="text-xs font-bold uppercase text-[#ff765f]">Un sistema, tres miradas</p>
                <ul className="mt-3 grid gap-2 text-sm text-stone-200">
                  <li className="flex gap-2"><Check size={18} className="shrink-0 text-[#ef3f26]" /> El dueño controla el negocio</li>
                  <li className="flex gap-2"><Check size={18} className="shrink-0 text-[#ef3f26]" /> El mecánico diagnostica</li>
                  <li className="flex gap-2"><Check size={18} className="shrink-0 text-[#ef3f26]" /> El cliente aprueba y sigue todo</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Cinematic band */}
        <section className="relative isolate overflow-hidden px-4 py-32 sm:px-8 sm:py-44 lg:px-12" aria-label="Trazabilidad">
          <Image src="/images/cars/sky-truck.jpg" alt="" fill sizes="100vw" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#171a1f] via-black/40 to-[#171a1f]" />
          <div className="mx-auto max-w-5xl text-center">
            <p data-reveal="zoom" className="font-display text-[clamp(2.5rem,8vw,6.5rem)] font-bold leading-[0.9]">
              Cada vehículo, <span className="landing-gradient-text">una historia trazable.</span>
            </p>
            <p data-reveal="up" style={delay(2)} className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-stone-200">
              Ocho estados, cero dudas. El taller sabe qué sigue y el cliente sabe dónde está su vehículo.
            </p>
          </div>
        </section>

        {/* Owner journey */}
        <section id="talleres" className="px-4 py-24 sm:px-8 sm:py-32 lg:px-12" aria-labelledby="talleres-title">
          <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div data-reveal="up"><SectionTag>Para talleres</SectionTag></div>
              <h2 id="talleres-title" data-reveal="up" style={delay(1)} className="mt-4 font-display text-5xl font-bold leading-[0.95] sm:text-6xl">
                Así trabaja tu taller con TorkeOS.
              </h2>
              <p data-reveal="up" style={delay(2)} className="mt-5 text-lg leading-8 text-stone-300">
                Desde el día uno hasta el cierre de cada orden: lo que haces como dueño en cada etapa.
              </p>
              <div data-reveal="curtain" style={delay(3)} className="relative mt-8 hidden aspect-[3/2] overflow-hidden rounded-lg lg:block">
                <Image
                  src="/images/cars/good.garage.webp"
                  alt="Camioneta con las puertas abiertas dentro de un taller iluminado"
                  fill
                  sizes="40vw"
                  className="object-cover"
                />
              </div>
              <div data-reveal="up" style={delay(4)} className="mt-8">
                <WhatsAppButton>Registrar mi taller</WhatsAppButton>
              </div>
            </div>
            <Timeline steps={ownerSteps} />
          </div>
        </section>

        {/* Client journey */}
        <section id="clientes" className="relative overflow-hidden bg-[#111317] px-4 py-24 sm:px-8 sm:py-32 lg:px-12" aria-labelledby="clientes-title">
          <div className="landing-glow pointer-events-none absolute -right-40 top-20 size-[500px] rounded-full blur-3xl" aria-hidden />
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
            <div className="order-2 lg:order-1">
              <Timeline steps={clientSteps} />
            </div>
            <div className="order-1 lg:sticky lg:top-28 lg:order-2 lg:self-start">
              <div data-reveal="up"><SectionTag>Para clientes</SectionTag></div>
              <h2 id="clientes-title" data-reveal="up" style={delay(1)} className="mt-4 font-display text-5xl font-bold leading-[0.95] sm:text-6xl">
                Tu vehículo en buenas manos, y a la vista.
              </h2>
              <p data-reveal="up" style={delay(2)} className="mt-5 text-lg leading-8 text-stone-300">
                Agenda, aprueba y sigue la reparación desde tu teléfono. Gratis, siempre.
              </p>
              <div data-reveal="curtain" style={delay(3)} className="relative mt-8 hidden aspect-[3/2] overflow-hidden rounded-lg lg:block">
                <Image src="/images/cars/raptor.jpg" alt="Camioneta todoterreno en el desierto" fill sizes="40vw" className="object-cover" />
              </div>
              <div data-reveal="up" style={delay(4)} className="mt-8">
                <Link
                  href="/register"
                  className="group inline-flex min-h-12 items-center gap-2 rounded-md bg-white px-5 font-bold text-stone-950 transition hover:bg-stone-100"
                >
                  Crear cuenta gratis <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section id="planes" className="px-4 py-24 sm:px-8 sm:py-32 lg:px-12" aria-labelledby="planes-title">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <div data-reveal="up"><SectionTag>Planes</SectionTag></div>
              <h2 id="planes-title" data-reveal="up" style={delay(1)} className="mt-4 font-display text-5xl font-bold leading-[0.95] sm:text-6xl">
                Pagas solo cuando ganas.
              </h2>
              <p data-reveal="up" style={delay(2)} className="mt-5 text-lg leading-8 text-stone-300">
                Sin mensualidades ni cuota fija. Si tu cliente no aprueba, no pagas nada.
              </p>
            </div>

            <div className="mt-14 grid items-stretch gap-6 md:grid-cols-2 lg:gap-8">
              <article data-reveal="left" data-spotlight className="flex flex-col rounded-xl border border-white/15 bg-white/[0.03] p-6 sm:p-10">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-md bg-white/10"><Car size={24} aria-hidden /></span>
                  <div>
                    <h3 className="font-display text-3xl font-bold">Clientes</h3>
                    <p className="text-sm text-stone-400">Dueños de vehículos</p>
                  </div>
                </div>
                <p className="mt-8 flex items-end gap-2">
                  <span className="font-display text-7xl font-bold leading-none sm:text-8xl">$0</span>
                  <span className="pb-2 text-stone-400">para siempre</span>
                </p>
                <ul className="mt-8 grid gap-3 text-stone-200">
                  {[
                    "Cuenta y vehículos ilimitados",
                    "Agenda online con tu taller",
                    "Presupuestos detallados por trabajo",
                    "Apruebas o rechazas desde el teléfono",
                    "Avisos de estado por WhatsApp",
                  ].map((item) => (
                    <li key={item} className="flex gap-3"><Check size={20} className="mt-0.5 shrink-0 text-[#ef3f26]" aria-hidden />{item}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-10">
                  <Link
                    href="/register"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-white/40 px-5 font-bold transition hover:bg-white hover:text-stone-950"
                  >
                    Crear cuenta gratis
                  </Link>
                </div>
              </article>

              <article data-reveal="right" className="landing-conic rounded-xl">
                <div data-spotlight className="flex h-full flex-col rounded-xl bg-[#1d2027] p-6 sm:p-10">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-md bg-[#ef3f26]"><Wrench size={24} aria-hidden /></span>
                    <div>
                      <h3 className="font-display text-3xl font-bold">Dueños de taller</h3>
                      <p className="text-sm text-stone-400">Todo el taller, un solo cobro</p>
                    </div>
                  </div>
                  <p className="mt-8 flex items-end gap-2">
                    <span className="landing-gradient-text font-display text-7xl font-bold leading-none sm:text-8xl">{commission}%</span>
                    <span className="pb-2 text-stone-400">por presupuesto aceptado</span>
                  </p>
                  <ul className="mt-8 grid gap-3 text-stone-200">
                    {[
                      "Sin mensualidad ni costo de entrada",
                      "Página pública de reservas para tu taller",
                      "Agenda, órdenes y equipo de mecánicos",
                      "Diagnósticos y presupuestos digitales",
                      "Mensajes de estado por WhatsApp",
                      "Reporte mensual de facturación",
                    ].map((item) => (
                      <li key={item} className="flex gap-3"><Check size={20} className="mt-0.5 shrink-0 text-[#ef3f26]" aria-hidden />{item}</li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-10">
                    <WhatsAppButton className="w-full">Lo quiero para mi taller</WhatsAppButton>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas" className="border-t border-white/10 px-4 py-24 sm:px-8 sm:py-32 lg:px-12" aria-labelledby="preguntas-title">
          <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div data-reveal="up"><SectionTag>Preguntas frecuentes</SectionTag></div>
              <h2 id="preguntas-title" data-reveal="up" style={delay(1)} className="mt-4 font-display text-5xl font-bold leading-[0.95] sm:text-6xl">
                Todo lo que quieres saber.
              </h2>
            </div>
            <div className="grid gap-3">
              {faqs.map((faq, index) => (
                <details key={faq.q} data-reveal="up" style={delay(index)} className="landing-faq group rounded-lg border border-white/10 bg-white/[0.03] open:border-[#ef3f26]/40">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold sm:text-lg">
                    {faq.q}
                    <Plus size={20} className="landing-faq-icon shrink-0 text-[#ef3f26] transition-transform duration-300" aria-hidden />
                  </summary>
                  <p className="px-5 pb-5 leading-7 text-stone-300">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="contacto" className="relative isolate overflow-hidden px-4 py-28 sm:px-8 sm:py-40 lg:px-12" aria-labelledby="contacto-title">
          <Image src="/images/cars/old-car.jpg" alt="" fill sizes="100vw" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <div data-reveal="up"><SectionTag>Contacto</SectionTag></div>
              <h2 id="contacto-title" data-reveal="up" style={delay(1)} className="mt-4 font-display text-[clamp(2.75rem,8vw,6rem)] font-bold leading-[0.9]">
                Conversemos sobre tu taller.
              </h2>
              <p data-reveal="up" style={delay(2)} className="mt-6 max-w-xl text-lg leading-8 text-stone-200">
                Escríbenos y en minutos te explicamos cómo empezar. Sin compromiso.
              </p>
              <div data-reveal="up" style={delay(3)} className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <WhatsAppButton>Escribir por WhatsApp</WhatsAppButton>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 font-bold text-stone-950 transition hover:bg-stone-100"
                >
                  <Mail size={19} /> {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="TorkeOS, inicio">
            <span className="grid size-9 place-items-center rounded-md bg-[#ef3f26]"><Wrench size={18} /></span>
            <span className="font-display text-xl font-bold">TorkeOS</span>
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-400" aria-label="Enlaces del pie de página">
            <a href="#nosotros" className="hover:text-white">Nosotros</a>
            <a href="#planes" className="hover:text-white">Planes</a>
            <Link href="/register" className="hover:text-white">Crear cuenta</Link>
            <Link href="/login" className="hover:text-white">Iniciar sesión</Link>
          </nav>
          <p className="text-sm text-stone-500">© {new Date().getFullYear()} TorkeOS</p>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escríbenos por WhatsApp"
        className="landing-wa-float fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.45)] transition-transform hover:scale-110 sm:right-6 sm:size-16"
      >
        <span className="landing-wa-ring absolute inset-0 rounded-full bg-[#25d366]" aria-hidden />
        <svg viewBox="0 0 24 24" className="relative size-7 sm:size-8" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
        </svg>
      </a>
    </div>
  );
}
