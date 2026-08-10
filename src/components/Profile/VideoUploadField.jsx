import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  uploadVideo, abortVideoUpload, validateVideoFile, isVideoUploadConfigured,
  ACCEPT_VIDEO, MAX_VIDEO_SECONDS,
} from '../../data/videoUpload';
import { videoKind, videoFileUrl, videoPosterUrl } from '../../data/videoEmbed';

/**
 * Subida del video de presentación, dentro del panel de datos ocultos.
 *
 * La alternativa era pedir un enlace de YouTube, y funciona, pero le carga al
 * asesor una tarea de cuatro pasos —abrir YouTube, subir, esperar el proceso,
 * copiar el enlace, volver, pegar— para algo que él vive como "grabo y listo".
 * La mayoría abandona en el segundo paso. Aquí elige el archivo y ya está.
 *
 * El enlace de YouTube sigue aceptándose en el campo de al lado: quien ya lo
 * tenía puesto no debe perderlo, y para un video largo sigue siendo mejor sitio.
 */
export default function VideoUploadField({ value, onChange, disabled = false }) {
  const inputRef = useRef(null);
  const [isUploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  /*
    Si el panel se cierra a media subida, se corta. Sin esto la petición sigue
    viva contra un componente que ya no existe: gasta los datos de la persona en
    un archivo que nadie va a recibir.
  */
  useEffect(() => () => abortVideoUpload(), []);

  const hasFileVideo = videoKind(value) === 'file';

  const pick = async (event) => {
    const file = event.target.files?.[0];
    // El input se limpia siempre: sin esto, elegir el mismo archivo dos veces
    // seguidas —tras un error— no dispara ningún evento y parece que se ignora.
    const reset = () => { if (inputRef.current) inputRef.current.value = ''; };

    if (!file) return;

    setError('');

    const problem = await validateVideoFile(file);
    if (problem) {
      setError(problem);
      reset();
      return;
    }

    setUploading(true);
    setProgress(0);

    const { url, error: uploadError } = await uploadVideo(file, { onProgress: setProgress });

    setUploading(false);
    reset();

    // Una subida cancelada no es un fallo que haya que explicar: la persona sabe
    // que la cortó ella.
    if (uploadError?.code === 'ABORTED') return;

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    onChange(url);
  };

  /*
    Sin el servicio configurado no se muestra un botón que va a fallar: se dice
    qué falta. El asesor no puede arreglarlo, pero quien administra el proyecto
    sí, y el aviso es lo que hace que se entere.
  */
  if (!isVideoUploadConfigured) {
    return (
      <p
        className="flex items-start gap-2 rounded-xl border border-amber-500/30
                   bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-600
                   dark:text-amber-400"
      >
        <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        Falta configurar la variable
        {' '}
        <span className="font-mono">VITE_CLOUDINARY_CLOUD_NAME</span>
        {' '}
        en el proyecto para poder subir videos. Mientras tanto puedes pegar un
        enlace de YouTube abajo.
      </p>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        id="card-video-file"
        type="file"
        accept={ACCEPT_VIDEO}
        onChange={pick}
        disabled={disabled || isUploading}
        /*
          Estilo del propio botón del navegador con `file:`. Un input de archivo
          sin estilar rompe el resto del panel: cada sistema lo dibuja a su
          manera y en móvil se sale del ancho.
        */
        className="block w-full cursor-pointer text-sm text-zinc-500
                   file:mr-3 file:cursor-pointer file:rounded-full file:border-0
                   file:bg-indigo-600 file:px-4 file:py-2 file:text-sm
                   file:font-semibold file:text-white hover:file:bg-indigo-500
                   disabled:cursor-wait disabled:opacity-50"
      />

      {isUploading && (
        <div className="mt-3" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-[11px] font-semibold text-indigo-500">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            Subiendo tu video…
            {' '}
            {progress}
            %
          </p>

          {/*
            Barra de avance y no sólo un texto que gira. Con datos móviles la
            subida tarda decenas de segundos, y una espera sin avance visible se
            interpreta como colgada: la persona cierra la app y vuelve a
            empezar, duplicando el gasto.
          */}
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200
                          dark:bg-zinc-800"
          >
            <div
              className="h-full rounded-full bg-indigo-500 transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            type="button"
            onClick={abortVideoUpload}
            className="mt-2 text-[11px] font-semibold text-zinc-500 underline
                       underline-offset-2 hover:text-rose-500"
          >
            Cancelar la subida
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2.5 flex items-start gap-2 rounded-xl border border-rose-500/30
                     bg-rose-500/10 p-2.5 text-[11px] leading-relaxed text-rose-600
                     dark:text-rose-400"
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {hasFileVideo && !isUploading && (
        <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600
                        dark:text-emerald-400"
          >
            <CheckCircle2 size={13} aria-hidden="true" />
            Video listo. Ya aparece en el reverso de tu tarjeta.
          </p>

          {/*
            Vista previa con el mismo `playsInline` y la misma portada que usa la
            tarjeta: si aquí se viera distinto, el asesor aprobaría una cosa y
            publicaría otra.
          */}
          <video
            src={videoFileUrl(value)}
            poster={videoPosterUrl(value)}
            controls
            playsInline
            preload="metadata"
            className="w-full rounded-xl border border-zinc-200 bg-black dark:border-zinc-700"
          >
            <track kind="captions" />
          </video>

          <button
            type="button"
            onClick={() => { setError(''); onChange(''); }}
            className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500
                       transition-colors hover:text-rose-500"
          >
            <Trash2 size={12} aria-hidden="true" />
            Quitar este video
          </button>
        </div>
      )}

      {!hasFileVideo && !isUploading && !error && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
          Máximo
          {' '}
          {MAX_VIDEO_SECONDS}
          {' '}
          segundos. Grábate en horizontal, di quién eres y a quién ayudas.
        </p>
      )}
    </div>
  );
}
