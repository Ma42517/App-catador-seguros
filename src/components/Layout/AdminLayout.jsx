import { useState } from 'react';
import BottomTabBar from './BottomTabBar';
import MoreMenu from './MoreMenu';

/**
 * Chrome de navegación del área autenticada.
 *
 * La navegación es idéntica en celular, tableta y escritorio: una sola barra
 * inferior. El Diagnóstico 360 no ocupa un destino fijo, vive dentro del panel
 * "Ver más" junto con las opciones de cuenta.
 */
export default function AdminLayout({
  onNavigate, onLogout, children, canUsePreview = false, isDark, onToggleTheme,
}) {
  const [moreOpen, setMoreOpen] = useState(false);

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
        onMore={() => setMoreOpen(true)}
      />

      <MoreMenu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onOpenDiagnostico={() => goTo('wizard')}
        onOpenPreview={() => goTo('preview')}
        onLogout={onLogout}
        canUsePreview={canUsePreview}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />
    </div>
  );
}
