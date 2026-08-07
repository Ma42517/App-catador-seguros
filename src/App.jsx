import { useState } from 'react';
import {
  PlayCircle, RotateCcw, Download, FileJson, FileSpreadsheet, X, Gauge,
} from 'lucide-react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { ReferralProvider } from './context/ReferralContext';
import StepWizard from './components/Wizard/StepWizard';
import { Button } from './components/ui';
import { exportJSON, exportCSV } from './data/exporters';

function Header() {
  const { loadDemoData, resetAll, data, diagnosis, isDemo } = useFinance();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-700/50 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        {/* Marca */}
        <span
          className="mr-1 hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 sm:grid"
          aria-hidden="true"
        >
          <Gauge size={17} className="text-white" />
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[13px] font-extrabold uppercase tracking-[0.14em] text-slate-50 sm:text-sm">
            Diagnóstico Financiero <span className="text-indigo-400">360</span>
          </h1>
          {isDemo ? (
            <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(16_185_129/0.9)]" />
              Datos de ejemplo cargados
            </p>
          ) : (
            <p className="hidden text-[10px] text-slate-500 sm:block">
              Sistema de inteligencia financiera personal
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          icon={PlayCircle}
          onClick={loadDemoData}
          className="shrink-0"
        >
          <span className="hidden sm:inline">Cargar ejemplo</span>
          <span className="sm:hidden">Demo</span>
        </Button>

        <div className="relative shrink-0">
          <Button
            size="sm"
            variant="ghost"
            icon={menuOpen ? X : Download}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="hidden sm:inline">Exportar</span>
          </Button>


          {menuOpen && (
            <div className="animate-rise absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/95 shadow-2xl shadow-slate-950/70 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => { exportCSV(data, diagnosis); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-900/50"
              >
                <FileSpreadsheet size={14} className="text-slate-500" />
                Exportar diagnóstico (CSV)
              </button>
              <button
                type="button"
                onClick={() => { exportJSON(data); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 border-t border-slate-700/50 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-900/50"
              >
                <FileJson size={14} className="text-slate-500" />
                Respaldar mis datos (JSON)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Esto borrará toda tu información capturada. ¿Continuar?')) {
                    resetAll();
                    setMenuOpen(false);
                  }
                }}
                className="flex w-full items-center gap-2 border-t border-slate-700/50 px-3 py-2.5 text-left text-xs text-red-400 hover:bg-red-500/10"
              >
                <RotateCcw size={14} />
                Empezar de cero
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Shell() {
  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* Iluminación ambiental fija del fondo */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-grid-fade"
        aria-hidden="true"
      />

      <div className="relative">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <StepWizard />
        </main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4">
          <div className="border-t border-slate-800 pt-5">
            <p className="text-center text-[10px] leading-relaxed text-slate-600">
              Herramienta de diagnóstico y simulación. Los resultados son estimaciones basadas en los
              supuestos que capturas y no constituyen asesoría financiera, fiscal ni de inversión.
              Tu información se guarda únicamente en este navegador.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <ReferralProvider>
        <Shell />
      </ReferralProvider>
    </FinanceProvider>
  );
}
