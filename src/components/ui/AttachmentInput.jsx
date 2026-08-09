import { useRef } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { ACCEPT_ATTACHMENTS, attachmentKind, attachmentName, formatBytes } from '../../data/attachments';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Icono según lo que sea el adjunto, para reconocerlo de un vistazo. */
export function AttachmentIcon({ url, size = 14 }) {
  const Icon = attachmentKind(url) === 'document' ? FileText : ImageIcon;
  return <Icon size={size} aria-hidden="true" />;
}

/**
 * Selector de archivo adjunto, compartido por el panel y por la hoja de
 * publicación del muro.
 *
 * Distingue tres estados que no se pueden confundir: sin nada, un archivo
 * elegido que todavía no sube, y un adjunto que ya vive en la base. Mezclar los
 * dos últimos llevaría a creer que algo se subió cuando no.
 *
 * `existingUrl` sólo lo usa el modo edición; al publicar de cero se omite.
 */
export default function AttachmentInput({
  id = 'attachment',
  label = 'Archivo adjunto (opcional)',
  file,
  existingUrl = '',
  onPick,
  onClear,
  disabled = false,
  hint,
}) {
  const inputRef = useRef(null);

  const pick = (event) => {
    onPick(event.target.files?.[0] ?? null);
  };

  // Sin limpiar el input, volver a elegir el mismo archivo no dispara `change`.
  const clear = () => {
    if (inputRef.current) inputRef.current.value = '';
    onClear();
  };

  return (
    <div>
      <span className={LABEL}>{label}</span>

      {/*
        El input nativo se oculta pero sigue en el foco del teclado: su botón
        rotula "Choose File" según el idioma del navegador, no el de la app, y
        no hay forma de traducirlo desde HTML. La etiqueta de al lado hace de
        disparador y sí está en español.

        Se usa `sr-only` en lugar de `hidden` a propósito: escondido del todo,
        el campo dejaría de ser alcanzable con Tab.
      */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPT_ATTACHMENTS}
        onChange={pick}
        disabled={disabled}
        className="peer sr-only"
      />

      <label
        htmlFor={id}
        className={`flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-1
                    transition-colors peer-focus-visible:border-indigo-500
                    peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500
                    dark:border-zinc-700 dark:bg-zinc-950/60
                    ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-zinc-300'}`}
      >
        <span
          className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold
                     text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          {file ? 'Cambiar archivo' : 'Elegir archivo'}
        </span>

        {/* Con archivo elegido el nombre lo lleva el chip de abajo, junto con su
            peso y el botón de quitar. Repetirlo aquí sería decir lo mismo dos
            veces en dos renglones seguidos. */}
        {!file && (
          <span className="min-w-0 flex-1 truncate pr-2 text-xs text-zinc-500">
            Ningún archivo seleccionado
          </span>
        )}
      </label>

      {/* Archivo elegido, aún sin subir */}
      {file && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-indigo-500/40
                        bg-indigo-500/5 px-3 py-2"
        >
          <Paperclip size={13} className="shrink-0 text-indigo-400" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-[11px] text-zinc-600 dark:text-zinc-300">
            {file.name} · {formatBytes(file.size)}
          </p>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors
                       hover:bg-rose-500/10 hover:text-rose-500"
            aria-label="Quitar archivo"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Adjunto ya publicado: se conserva si no se elige otro */}
      {!file && existingUrl && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-200
                        bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <span className="shrink-0 text-zinc-400">
            <AttachmentIcon url={existingUrl} size={13} />
          </span>
          <p className="min-w-0 flex-1 truncate text-[11px] text-zinc-600 dark:text-zinc-300">
            {attachmentName(existingUrl)}
          </p>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors
                       hover:bg-rose-500/10 hover:text-rose-500"
            aria-label="Quitar adjunto actual"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {hint && <p className="mt-1.5 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}
