import { UserCheck } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import AccessRequests from './AccessRequests';

/**
 * Pantalla dedicada a aprobar el acceso de los nuevos usuarios.
 *
 * Vive aparte del Panel de Administración a propósito. Ese panel es una
 * herramienta técnica —consola de diagnóstico, pruebas contra la base— y esto
 * es una tarea operativa que se hace a diario. Mezclarlas obligaba a atravesar
 * una pantalla de depuración para algo tan común como dar de alta a un asesor.
 */
export default function UserApprovals({ isOpen, onClose, onChanged }) {
  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="Aprobar Usuarios"
      label="Aprobar usuarios"
    >
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-lg font-bold leading-snug
                       text-zinc-900 dark:text-white"
        >
          <UserCheck size={19} className="shrink-0 text-indigo-500" aria-hidden="true" />
          Control de acceso
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          Quien entra por primera vez queda en espera hasta que lo apruebes aquí.
          Nadie ve el contenido de la promotoría sin pasar por esta pantalla.
        </p>
      </div>

      <AccessRequests onChanged={onChanged} />
    </FullScreenView>
  );
}
