import { useState } from 'react';
import {
  PlayCircle, RotateCcw, Download, FileJson, FileSpreadsheet, X,
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base">
            DIAGNÓSTICO FINANCIERO 360
          </h1>
          {isDemo && (
            <p className="text-[10px] font-medium text-emerald-600">Datos de ejemplo cargados</p>
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
            <div className="absolute right-0 top-full mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <button
                type="button"
                onClick={() => { exportCSV(data, diagnosis); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <FileSpreadsheet size={14} className="text-slate-400" />
                Exportar diagnóstico (CSV)
              </button>
              <button
                type="button"
                onClick={() => { exportJSON(data); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <FileJson size={14} className="text-slate-400" />
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
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-xs text-red-600 hover:bg-red-50"
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
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-5">
        <StepWizard />
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 pt-2">
        <p className="text-center text-[10px] leading-relaxed text-slate-400">
          Herramienta de diagnóstico y simulación. Los resultados son estimaciones basadas en los
          supuestos que capturas y no constituyen asesoría financiera, fiscal ni de inversión.
          Tu información se guarda únicamente en este navegador.
        </p>
      </footer>
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
