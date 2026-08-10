/**
 * Estilos compartidos por los campos que se editan sobre la tarjeta.
 *
 * El campo no se disfraza de campo: hereda el tipo de letra, el tamaño y el
 * color del texto que sustituye, y sólo se delata al pasar por encima o al
 * recibir el foco. La idea es que la tarjeta siga leyéndose como una tarjeta y
 * no como un formulario con la piel de una tarjeta.
 *
 * `w-full` es lo que evita el salto: un campo que crece con su contenido movería
 * todo lo que tiene al lado en cada letra que se escribe.
 */
const BASE = 'w-full rounded-md border-none bg-transparent outline-none transition-colors'
  + ' hover:bg-white/10 focus:bg-white/20'
  + ' placeholder:text-white/35';

/**
 * Campo de una línea que se edita en su sitio.
 *
 * `aria-label` es obligatorio y no opcional: sin etiqueta visible —que es justo
 * lo que buscamos— un lector de pantalla anunciaría "campo de texto" sin decir
 * cuál. El texto de ejemplo no sirve para eso, porque desaparece al escribir.
 */
export function InlineInput({ value, onChange, label, placeholder, className = '' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      placeholder={placeholder}
      /*
        `autoComplete="off"` y `spellCheck` apagado: el navegador ofrecería
        autocompletar el nombre con datos de otros formularios, y subrayaría en
        rojo los nombres propios y los términos del oficio.
      */
      autoComplete="off"
      spellCheck="false"
      className={`${BASE} ${className}`}
    />
  );
}
