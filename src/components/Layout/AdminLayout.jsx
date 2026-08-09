import { useState } from 'react';
import BottomTabBar from './BottomTabBar';
import MoreMenu from './MoreMenu';
import QuickAddMenu from './QuickAddMenu';
import ActivityForm from '../Activities/ActivityForm';
import QuickNoteForm from '../Notes/QuickNoteForm';
import NotesList from '../Notes/NotesList';
import UserProfile from '../Profile/UserProfile';
import { useEvents } from '../../context/EventContext';

/**
 * Chrome de navegación del área autenticada.
 *
 * La navegación es idéntica en celular, tableta y escritorio: una sola barra
 * inferior. El Diagnóstico 360 no ocupa un destino fijo, vive dentro del panel
 * "Ver más" junto con las notas y las opciones de cuenta.
 */
export default function AdminLayout({
  onNavigate, onLogout, children, canUsePreview = false, isDark, onToggleTheme, username,
}) {
  const { addEvent, addNote, loadDemoWeek, clearAgenda } = useEvents();
  const [moreOpen, setMoreOpen] = useState(false);
  const [isQuickAddOpen, setQuickAddOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // Qué formulario está abierto: 'actividad' | 'recordatorio' | 'nota' | null.
  const [activeForm, setActiveForm] = useState(null);

  const goTo = (section) => {
    onNavigate(section);
    setMoreOpen(false);
  };

  return (
    <div className="min-h-screen w-full max-w-full bg-white dark:bg-black">
      {/* pb-24 evita que el contenido quede bajo la barra inferior */}
      <div className="min-w-0 pb-24">{children}</div>

      <BottomTabBar
        onToday={() => goTo('home')}
        onProductivity={() => goTo('productivity')}
        onAgenda={() => goTo('agenda')}
        onAdd={() => setQuickAddOpen(true)}
        onMore={() => setMoreOpen(true)}
      />

      <QuickAddMenu
        isOpen={isQuickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSelect={setActiveForm}
      />

      <ActivityForm
        isOpen={activeForm === 'actividad' || activeForm === 'recordatorio'}
        type={activeForm === 'recordatorio' ? 'recordatorio' : 'actividad'}
        onClose={() => setActiveForm(null)}
        onSave={addEvent}
      />

      <QuickNoteForm
        isOpen={activeForm === 'nota'}
        onClose={() => setActiveForm(null)}
        onSave={addNote}
      />

      <NotesList isOpen={notesOpen} onClose={() => setNotesOpen(false)} />

      <UserProfile
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        username={username}
      />

      <MoreMenu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onOpenDiagnostico={() => goTo('wizard')}
        onOpenPreview={() => goTo('preview')}
        onOpenNotes={() => { setMoreOpen(false); setNotesOpen(true); }}
        onOpenProfile={() => { setMoreOpen(false); setProfileOpen(true); }}
        onLogout={onLogout}
        onLoadDemo={() => { loadDemoWeek(); setMoreOpen(false); onNavigate('agenda'); }}
        onClearAgenda={() => { clearAgenda(); setMoreOpen(false); }}
        canUsePreview={canUsePreview}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />
    </div>
  );
}
