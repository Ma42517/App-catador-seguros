import FullScreenView from '../Layout/FullScreenView';
import TimeBlocks from './TimeBlocks';

/**
 * Pantalla completa de los bloques de enfoque.
 *
 * El temporizador dejó de vivir desplegado en el hub: ocupaba más alto que
 * cualquier otra pieza y desplazaba hacia abajo todo lo demás. Ahora se entra a
 * él como a las otras secciones.
 *
 * El bloque en curso no se detiene al cerrar esta pantalla: la sesión guarda el
 * instante en que termina, no los segundos restantes, así que al volver muestra
 * el tiempo correcto aunque el componente se haya desmontado.
 */
export default function TimeBlocksScreen({ isOpen, onClose, username, name }) {
  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="Bloques de Tiempo"
      label="Bloques de tiempo"
    >
      <TimeBlocks username={username} name={name} />
    </FullScreenView>
  );
}
