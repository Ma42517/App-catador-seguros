import { useState } from 'react';
import { ClipboardList, BarChart3, PlayCircle } from 'lucide-react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { ReferralProvider } from './context/ReferralContext';
import StepWizard from './components/Wizard/StepWizard';
import ExecutiveDashboard from './components/Dashboard/ExecutiveDashboard';

function AppContent() {
  const [tab, setTab] = useState('wizard');
  const { loadDemoData } = useFinance();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
            DIAGNÓSTICO FINANCIERO 360
          </h1>
          <button
            onClick={() => { loadDemoData(); setTab('dashboard'); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            <PlayCircle size={16} />
            <span className="hidden sm:inline">Cargar Ejemplo (Demo)</span>
            <span className="sm:hidden">Demo</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button onClick={() => setTab('wizard')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'wizard' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <ClipboardList size={16} /> Formulario
          </button>
          <button onClick={() => setTab('dashboard')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'dashboard' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <BarChart3 size={16} /> Dashboard
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'wizard' && <StepWizard onComplete={() => setTab('dashboard')} />}
        {tab === 'dashboard' && <ExecutiveDashboard />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <ReferralProvider>
        <AppContent />
      </ReferralProvider>
    </FinanceProvider>
  );
}
