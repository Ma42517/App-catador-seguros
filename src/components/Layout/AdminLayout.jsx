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
import LeadsList from '../Profile/LeadsList';
import AdminPanel from '../Admin/AdminPanel';
import UserApprovals from '../Admin/UserApprovals';
import { useEvents } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import { countPendingProfiles } from '../../data/profilesRepo';
import { useDashboardVersion } from '../../context/dashboardVersion';
import { highestPriorityOf } from '../Activities/priorities';
import { buildMessage } from '../../lib/homeMessage';
import useTypewriter from '../../lib/useTypewriter';

/**
 * Chrome de navegación del área autenticada.
 *
 * La navegación es idéntica en celular, tableta y escritorio: una sola barra
 * inferior. El Diagnóstico 360 no ocupa un destino fijo, vive dentro del panel
 * "Ver más" junto con las notas y las opciones de cuenta.
 */
export default function AdminLayout({
  onNavigate, onLogout, children, canUsePreview = false, isAdminUser = false,
  isPromoterUser = false, onOpenPromotoria, username,
  /*
    Modo inmersivo: la sección se queda con la pantalla completa y se hace cargo de
    su propia salida.

    Lo usa el Diagnóstico 360, que es el único destino donde se trabaja de pie y con
    el prospecto delante: seis módulos de captura con formularios largos, donde la
    barra inferior se comía cuatro centímetros de alto útil en cada scroll y ofrecía
    cuatro destinos que ahí no se van a usar. Quien la esconda tiene que poner un
    "Regresar" en su cabecera; si no, la sección se convierte en un callejón.
  */
  immersive = false,
  /*
    "Nueva Actividad" pre-llenada desde el router de ventas de
    `PresentationEndModal.jsx` ("Avanzamos a Propuesta" / "Requiere
    Seguimiento"): cuando llega un valor no nulo, se abre `ActivityForm`
    sola, ya con el tipo elegido. `onActivityPrefillConsumed` limpia el
    valor en `App.jsx` para que cerrar y volver a abrir "Nueva Actividad"
    desde el menú "Agregar" no reaparezca con el mismo prellenado.
  */
  activityPrefill = null, onActivityPrefillConsumed,
}) {
  const { addEvent, addNote, loadDemoWeek, clearAgenda, activeToday, highPriorityToday } = useEvents();

  useEffect(() => {
    if (activityPrefill) setActiveForm('actividad');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityPrefill]);

  /*
    Mismo texto y el mismo `useTypewriter` que ya usa `AISequence.jsx` para
    revelar el saludo, la fecha y los recordatorios de "Hoy" — no una segunda
    versión del efecto, ni otra velocidad. Las dos instancias del hook
    montan en el mismo instante (esta barra y el contenido de "Hoy" son
    hermanos dentro del mismo commit inicial) y corren el mismo intervalo
    sobre el mismo texto, así que terminan de "escribir" juntas y la barra
    se revela exactamente cuando el resto lo hace.
  */
  const { isTyping: isHomeTextTyping } = useTypewriter(buildMessage(highPriorityToday.length));

  /*
    El panel de administración tiene una sola llave: el rol `admin`.

    Antes también lo abría el modo promotor —el que se desbloquea con el código y
    su contraseña—, y ahí estaba el agujero: aprobar usuarios y ascender rangos
    quedaban al alcance de cualquiera que conociera ese código, que es un secreto
    compartido y no una identidad. Quien administra los permisos de la promotoría
    tiene que ser una persona concreta con su rol en la base, no quien recuerde
    una clave.
  */
  const { refreshIdentity } = useSession();
  const canOpenAdmin = isAdminUser;

  // Qué versión del diagnóstico abre el menú. El estado vive en el Shell, que es el
  // antepasado común de este menú y del tablero.
  const { setVersion } = useDashboardVersion();

  const [moreOpen, setMoreOpen] = useState(false);
  const [isQuickAddOpen, setQuickAddOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardEditOpen, setCardEditOpen] = useState(false);
  const [leadsOpen, setLeadsOpen] = useState(false);
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
    /*
      Se relee la identidad al abrir el panel. Antes sólo se leía al iniciar
      sesión, así que una pestaña abierta desde antes de guardar la tarjeta
      seguía mostrando el ícono genérico en lugar de la foto —y el nombre
      anterior— hasta recargar la página.
    */
    refreshIdentity();
    setMoreOpen(true);
  };

  const goTo = (section) => {
    onNavigate(section);
    setMoreOpen(false);
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden flex flex-col relative bg-white dark:bg-black">
      {/*
        `pb-28 mb-24` reserva el alto de la barra inferior. En modo inmersivo la barra
        no existe, y ese hueco tiene que irse con ella: dejarlo abriría trece
        centímetros de negro al final de cada módulo, con el último campo flotando a
        media pantalla.

        Tampoco se limita el ancho ahí: el Diagnóstico ya centra su propio contenido
        en `max-w-5xl`, y encajarlo además en `max-w-md` estrangulaba sus rejillas de
        campos en el teléfono.
      */}
      <div
        className={immersive
          ? 'flex-1 min-w-0 w-full'
          : 'flex-1 min-w-0 w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto px-4 pb-28 mb-24'}
      >
        {children}
      </div>

      {!immersive && (
        <BottomTabBar
          onToday={() => goTo('home')}
          onProductivity={() => goTo('productivity')}
          onAgenda={() => goTo('agenda')}
          onAdd={() => setQuickAddOpen(true)}
          onMore={openMore}
          agendaCount={activeToday.length}
          agendaPriority={highestPriorityOf(activeToday)}
          /*
            Mismo fundido, mismo instante que el saludo/fecha/recordatorios
            de "Hoy": ambos usan la clase `revealClass` de `AISequence.jsx`
            (transition-opacity duration-1000), gobernada por el mismo
            `isTyping`. No es una animación nueva ni una copia con otra
            velocidad — es la misma condición leída aquí también.
          */
          revealed={!isHomeTextTyping}
        />
      )}

      <QuickAddMenu
        isOpen={isQuickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSelect={setActiveForm}
      />

      <ActivityForm
        isOpen={activeForm === 'actividad' || activeForm === 'recordatorio'}
        type={activeForm === 'recordatorio' ? 'recordatorio' : 'actividad'}
        onClose={() => { setActiveForm(null); onActivityPrefillConsumed?.(); }}
        onSave={addEvent}
        initialTipoActividad={activityPrefill?.tipoActividad ?? null}
        initialProspectName={activityPrefill?.prospectName ?? ''}
        initialProspectPhone={activityPrefill?.prospectPhone ?? ''}
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

      <LeadsList isOpen={leadsOpen} onClose={() => setLeadsOpen(false)} />

      <UserProfile
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        username={username}
        onEditCard={() => { setProfileOpen(false); setCardEditOpen(true); }}
        onOpenLeads={() => { setProfileOpen(false); setLeadsOpen(true); }}
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
        /*
          La versión elegida se fija **antes** de navegar. Al revés —navegar y luego
          cambiarla— el tablero se montaría con la anterior y se vería un parpadeo
          del diagnóstico que no se pidió.
        */
        onOpenDiagnostico={(version) => { setVersion(version); goTo('wizard'); }}
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
        /*
          Permiso independiente del de administración: un promotor gestiona a su
          equipo pero no reparte permisos, y un administrador reparte permisos
          pero no tiene equipo propio. Son dos llaves distintas y ninguna implica
          la otra.
        */
        isPromoterUser={isPromoterUser}
        onOpenPromotoria={() => { setMoreOpen(false); onOpenPromotoria?.(); }}
        pendingCount={pendingCount}
      />
    </div>
  );
}
