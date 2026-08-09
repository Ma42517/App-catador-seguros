import { useState, useRef, useEffect, useCallback } from 'react';
import { Smartphone, Tablet, Monitor, RotateCw, RefreshCw, ExternalLink } from 'lucide-react';

/**
 * Tamaños de referencia (viewport CSS, no píxeles físicos) de dispositivos
 * comunes. Se eligieron para caer en cada breakpoint de Tailwind usado en
 * la app: móvil (<640), tableta (>=768) y escritorio (>=1024).
 */
/** Píxeles que el marco (padding p-2.5 + borde) añade alrededor del iframe. */
const FRAME_CHROME = 22;

export const DEVICES = [
  { key: 'mobile', label: 'Celular', Icon: Smartphone, width: 390, height: 844, hint: 'iPhone 14 · 390px' },
  { key: 'tablet', label: 'Tableta', Icon: Tablet, width: 820, height: 1180, hint: 'iPad Air · 820px' },
  { key: 'desktop', label: 'Computadora', Icon: Monitor, width: 1440, height: 900, hint: 'Laptop · 1440px' },
];

/**
 * Previsualizador multi-dispositivo.
 *
 * Importante: los breakpoints de Tailwind (`sm:`, `md:`, `lg:`) responden al
 * ancho del *viewport*, no al de un contenedor. Por eso la app se carga dentro
 * de un <iframe> dimensionado al dispositivo: dentro del iframe el viewport
 * realmente mide ese ancho, así que las media queries se disparan igual que
 * en un teléfono o tableta real. Un simple div angosto mostraría el layout de
 * escritorio comprimido, no la vista móvil.
 *
 * El iframe carga la misma app con `?preview=1`, bandera que App.jsx usa para
 * omitir el splash y ocultar esta sección (evita anidar previsualizaciones).
 */
export default function DevicePreview() {
  const [deviceKey, setDeviceKey] = useState('mobile');
  const [isLandscape, setIsLandscape] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [scale, setScale] = useState(1);
  const areaRef = useRef(null);

  const device = DEVICES.find((d) => d.key === deviceKey) ?? DEVICES[0];
  const width = isLandscape ? device.height : device.width;
  const height = isLandscape ? device.width : device.height;

  // La URL vive fuera de React para que el iframe no se recargue en cada render.
  const previewUrl = `${window.location.pathname}?preview=1`;

  // Ajusta el zoom para que el dispositivo simulado quepa en el área visible.
  // Se suma FRAME_CHROME porque el marco (padding + borde) rodea al iframe:
  // el iframe conserva exactamente el ancho del dispositivo.
  const recalcScale = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    const margin = 48;
    const availableW = area.clientWidth - margin;
    const availableH = area.clientHeight - margin;
    if (availableW <= 0 || availableH <= 0) return;
    setScale(
      Math.min(
        1,
        availableW / (width + FRAME_CHROME),
        availableH / (height + FRAME_CHROME),
      ),
    );
  }, [width, height]);

  useEffect(() => {
    recalcScale();
    const area = areaRef.current;
    if (!area || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', recalcScale);
      return () => window.removeEventListener('resize', recalcScale);
    }
    const observer = new ResizeObserver(recalcScale);
    observer.observe(area);
    return () => observer.disconnect();
  }, [recalcScale]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Barra de herramientas */}
      <div className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-zinc-50">
              Vista previa <span className="text-indigo-400">multi-dispositivo</span>
            </h2>
            <p className="truncate text-[10px] text-zinc-500">
              {device.hint} · {width}×{height}px {isLandscape ? '(horizontal)' : '(vertical)'}
            </p>
          </div>

          {/* Selector de dispositivo */}
          <div
            role="tablist"
            aria-label="Dispositivo a previsualizar"
            className="flex shrink-0 items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/70 p-1"
          >
            {DEVICES.map(({ key, label, Icon }) => {
              const active = key === deviceKey;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDeviceKey(key)}
                  title={label}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Acciones */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setIsLandscape((v) => !v)}
              title="Rotar"
              className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              <RotateCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              title="Recargar vista previa"
              className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              <RefreshCw size={14} />
            </button>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              title="Abrir en una pestaña nueva"
              className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Escenario */}
      <div
        ref={areaRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden p-6"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-grid-fade"
          aria-hidden="true"
        />

        {/*
          Marco del dispositivo. El tamaño se aplica al <iframe>, no al marco,
          para que el viewport interno mida exactamente el ancho del dispositivo
          (si el marco llevara el tamaño, su padding y borde le restarían px al
          iframe y los breakpoints se dispararían antes de lo esperado).
        */}
        <div
          className="relative shrink-0 rounded-[2rem] border border-zinc-800 bg-zinc-900 p-2.5 shadow-2xl shadow-zinc-950/70 backdrop-blur-md transition-all duration-300"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        >
          <iframe
            // Cambiar la key fuerza un remonte del iframe = recarga limpia.
            key={`${deviceKey}-${isLandscape}-${reloadToken}`}
            src={previewUrl}
            title={`Vista previa en ${device.label}`}
            style={{ width, height }}
            className="block rounded-[1.5rem] border-0 bg-zinc-950"
          />
        </div>
      </div>

      <p className="px-4 pb-6 text-center text-[10px] leading-relaxed text-zinc-600">
        La vista previa carga la app real dentro de un marco del tamaño del dispositivo,
        por lo que los breakpoints responsivos se comportan igual que en el equipo físico.
        Escala actual: {Math.round(scale * 100)}%.
      </p>
    </div>
  );
}
