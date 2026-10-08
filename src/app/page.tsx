import { TripTabs } from "@/components/trip-tabs";

// Pantalla provisoria de la Etapa 1: sirve para probar la instalación en el iPhone,
// las safe areas, las fuentes y los colores. La reemplaza la pantalla de inicio.
export default function Home() {
  return (
    <main
      className="mx-auto max-w-[1080px] px-5"
      style={{ paddingTop: "calc(var(--safe-top) + 24px)", paddingBottom: "calc(var(--safe-bottom) + 120px)" }}
    >
      <div className="text-[13px] font-bold text-navy">Hola,</div>
      <h1 className="mt-0.5 text-[30px] leading-[1.1] font-extrabold tracking-[-0.02em]">Viajes en grupo</h1>
      <p className="mt-1 text-sm text-ink-2">Pronto acá vas a ver tus viajes.</p>

      <section className="bg-card-gradient mt-6 rounded-card-lg border border-navy/[.07] p-[18px] shadow-card">
        <div className="text-[13px] font-bold text-ink-2">Otoño en Europa</div>
        <div className="mt-1 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em]">17 oct – 20 nov</div>
        <p className="mt-1 text-[13px] text-ink-2">12 destinos · 34 noches</p>
        <p className="font-hand mt-3 text-[28px] leading-none text-navy">Waffles, papas fritas y cómics</p>
      </section>

      <button
        type="button"
        className="bg-navy-gradient mt-6 h-14 w-full rounded-button text-base font-bold text-white shadow-button"
      >
        Nuevo viaje
      </button>

      <TripTabs />
    </main>
  );
}
