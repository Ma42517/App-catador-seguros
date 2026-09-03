import DigitalCard from './DigitalCard';

/**
 * src/components/GiftCard/GiftCardVisual.jsx
 *
 * Envoltorio delgado sobre DigitalCard, conservado para no romper los imports
 * existentes (GiftCardPage.jsx lo usaba en varios sitios). El visor de una sola
 * cara se reemplazó por la tarjeta con giro 3D y dos plantillas (Editorial y
 * Ejecutiva) más el reverso interactivo; toda esa lógica vive ahora en
 * DigitalCard. Este archivo sólo traduce la misma firma de props.
 *
 * @param card       Datos de la tarjeta (cualquier shape: repo o formulario).
 * @param onPickPhoto Si viene, aparece el botón de cámara para cambiar la foto.
 * @param uploading  Muestra el velo de carga sobre el retrato.
 */
export default function GiftCardVisual({ card, onPickPhoto, uploading = false }) {
  return <DigitalCard cardData={card} onPickPhoto={onPickPhoto} uploading={uploading} />;
}
