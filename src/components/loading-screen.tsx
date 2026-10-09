import { Plane } from "lucide-react";
import { LOGO_O, LOGO_VAM } from "@/lib/logo-paths";

// Pantalla de carga (decisión 061): el logo flotando con la "o" que rebota, la línea punteada del
// recorrido con un avión que la cruza y una frase que va cambiando. Todo con CSS (las animaciones
// están en globals.css), así se ve apenas llega el HTML, antes de que cargue el JavaScript.

const PHRASES = ["Armando la valija…", "Buscando los pasajes…", "Haciendo las cuentas…", "Ya casi salimos…"];

export function LoadingScreen({ label = "Cargando" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="fixed inset-0 z-[1] flex flex-col items-center justify-center bg-white">
      <div className="loading-float">
        <svg viewBox="0 0 512 512" className="size-[96px] rounded-[28px] shadow-[0_12px_32px_rgb(255_56_92/0.3)]" aria-hidden>
          <rect width="512" height="512" fill="#FF385C" />
          <path d={LOGO_VAM} fill="white" />
          <path d={LOGO_O} fill="white" className="loading-bounce" />
        </svg>
      </div>

      {/* El recorrido: de un punto al otro, con el avión que avanza y la línea que se va llenando. */}
      <div className="relative mt-10 h-6 w-[176px]" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-dotted border-dots" />
        <div className="loading-trail absolute top-1/2 left-0 h-0.5 -translate-y-px rounded-full bg-pink" />
        <span className="absolute top-1/2 left-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
        <span className="absolute top-1/2 right-0 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pink bg-white" />
        <span className="loading-plane absolute top-1/2 left-0 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-pink">
          <Plane size={16} className="rotate-45" fill="currentColor" />
        </span>
      </div>

      <div className="relative mt-6 h-5 w-64 text-center text-[15px] font-semibold text-ink-2" aria-hidden>
        {PHRASES.map((p, i) => (
          <span key={p} className="loading-phrase absolute inset-x-0" style={{ animationDelay: `${i * 2}s` }}>
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
