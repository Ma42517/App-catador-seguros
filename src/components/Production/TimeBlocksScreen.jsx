import FullScreenView from '../Layout/FullScreenView';
import TimeBlocks from './TimeBlocks';

/**
 * Pantalla completa de los bloques de enfoque.
 *
 * Va en modo inmersivo: negro absoluto, sin título y sin la cabecera con borde. El
 * cronómetro no es una sección más de la app —es una pantalla en la que se entra
 * para dejar de mirar la app—, y un encabezado gris con su línea divisoria basta
 * para romper eso.
 *
 * El bloque en curso no se detiene al cerrarla: la sesión guarda el instante en que
 * termina, no los segundos restantes, así que al volver muestra el tiempo correcto
 * aunque el componente se haya desmontado.
 */
export default function TimeBlocksScreen({ isOpen, onClose, username }) {
  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      immersive
      title="Bloques de Tiempo"
      label="Bloques de tiempo"
    >
      <TimeBlocks username={username} />
    </FullScreenView>
  );
}
