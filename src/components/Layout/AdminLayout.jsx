import { useState, useEffect, useCallback } from 'react';
import BottomTabBar from './BottomTabBar';
import MoreMenu from './MoreMenu';
import QuickAddMenu from './QuickAddMenu';
import ActivityForm from '../Activities/ActivityForm';
import QuickNoteForm from '../Notes/QuickNoteForm';
import NotesList from '../Notes/NotesList';
import UserProfile from '../Profile/UserProfile';
import DigitalCardBuilder from '../Profile/DigitalCardBuilder';
import DigitalCardScreen from '../Profile/DigitalCardScreen';
import AdminPanel from '../Admin/AdminPanel';
import UserApprovals from '../Admin/UserApprovals';
import { useEvents } from '../../context/EventContext';
import { useAccess } from '../../context/AccessContext';
import { countPendingProfiles } from '../../data/profilesRepo';

/**
 * Chrome de navegación del área autenticada.
 *
 * La navegación es idéntica en celular, tableta y escritorio: una sola barra
 * inferior. El Diagnóstico 360 no ocupa un destino fijo, vive dentro del panel
 * "Ver más" junto con las notas y las opciones de cuenta.
 */
export default function AdminLayout({
  onNavigate, onLogout, children, canUsePreview = false, isAdminUser = false,
  isDark, onToggleTheme, username,
}) {
  const { addEvent, addNote, loadDemoWeek, clearAgenda } = useEvents();

  // El panel se abre por dos vías: ser el usuario administrador de la app, o
  // haber desbloqueado el modo promotor con el código y su contraseña. Son
  // permisos distintos que llevan al mismo lugar.
  const { isPromoter } = useAccess();
  const canOpenAdmin = isAdminUser || isPromoter;

  const [moreOpen, setMoreOpen] = useState(false);
  const [isQuickAddOpen, setQuickAddOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardEditOpen, setCardEditOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  /*
    El conteo se refresca al abrir el menú y al volver de aprobar, no con un
    temporizador de fondo: una consulta cada pocos segundos gastaría cuota de la
    base para un número que sólo se mira al abrir ese panel.
  */
  const refreshPending = useCallback(async () => {
    if (!canOpenAdmin) return;
    const { count } = await countPendingProfiles();
    setPendingCount(count);
  }, [canOpenAdmin]);

  useEffect(() => { refreshPending(); }, [refreshPending]);

  // Qué formulario está abierto: 'actividad' | 'recordatorio' | 'nota' | null.
  const [activeForm, setActiveForm] = useState(null);

  const openMore = () => {
    refreshPending();
    setMoreOpen(true);
  };

  const goTo = (section) => {
    onNavigate(section);
    setMoreOpen(false);
  };

  return (
    <div className="min-h-screen w-full max-w-full bg-white dark:bg-black">
      {/* pb-24 evita que el contenido quede bajo la barra inferior */}
      <div className="min-w-0 pb-28">{children}</div>

      <BottomTabBar
        onToday={() => goTo('home')}
        onProductivity={() => goTo('productivity')}
        onAgenda={() => goTo('agenda')}
        onAdd={() => setQuickAddOpen(true)}
        onMore={openMore}
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

      {/* Mostrar la tarjeta y editarla son dos pantallas distintas. */}
      <DigitalCardScreen
        isOpen={cardOpen}
        onClose={() => setCardOpen(false)}
        onEdit={() => { setCardOpen(false); setCardEditOpen(true); }}
      />

      <DigitalCardBuilder
        isOpen={cardEditOpen}
        onClose={() => setCardEditOpen(false)}
      />

      <UserProfile
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        username={username}
        onEditCard={() => { setProfileOpen(false); setCardEditOpen(true); }}
      />

      {/* Sin permiso no se monta: perder el permiso con el panel abierto lo cierra. */}
      {canOpenAdmin && (
        <>
          <UserApprovals
            isOpen={approvalsOpen}
            onClose={() => { setApprovalsOpen(false); refreshPending(); }}
            onChanged={refreshPending}
          />
          <AdminPanel isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
        </>
      )}

      <MoreMenu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onOpenDiagnostico={() => goTo('wizard')}
        onOpenPreview={() => goTo('preview')}
        onOpenNotes={() => { setMoreOpen(false); setNotesOpen(true); }}
        onOpenProfile={() => { setMoreOpen(false); setProfileOpen(true); }}
        onOpenCard={() => { setMoreOpen(false); setCardOpen(true); }}
        onOpenAdmin={() => { setMoreOpen(false); setAdminOpen(true); }}
        onOpenApprovals={() => { setMoreOpen(false); setApprovalsOpen(true); }}
        onLogout={onLogout}
        onLoadDemo={() => { loadDemoWeek(); setMoreOpen(false); onNavigate('agenda'); }}
        onClearAgenda={() => { clearAgenda(); setMoreOpen(false); }}
        canUsePreview={canUsePreview}
        isAdminUser={canOpenAdmin}
        pendingCount={pendingCount}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />
    </div>
  );
}
