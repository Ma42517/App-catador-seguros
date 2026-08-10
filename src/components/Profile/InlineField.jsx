import { useRef, useEffect } from 'react';

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

/**
 * Campo de varias líneas que crece con su contenido.
 *
 * El alto se ajusta en cada cambio en lugar de dejar una barra de desplazamiento
 * dentro del bloque: en un recuadro de cuatro líneas, desplazarse para releer lo
 * que se acaba de escribir hace perder el hilo. Y como la tarjeta muestra el
 * texto completo, el editor tiene que mostrar lo mismo.
 */
export function InlineTextarea({ value, onChange, label, placeholder, className = '' }) {
  const ref = useRef(null);

  /*
    El ajuste va en un efecto y no sólo en el `onChange` porque el valor también
    cambia desde fuera —al cargar la ficha guardada—, y en ese caso no hay ningún
    evento de escritura que dispare el cálculo.
  */
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      placeholder={placeholder}
      rows={2}
      /*
        `resize-none` quita el tirador de la esquina: el alto ya lo decide el
        contenido, y dejar que se pueda arrastrar permitiría dejarlo en un tamaño
        que no corresponde con lo que muestra la tarjeta.
      */
      className={`${BASE} resize-none overflow-hidden ${className}`}
    />
  );
}
