import { useState, useEffect, useRef } from 'react';
import { Send, Save, Loader2, ImagePlus, X, Link2 } from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { METRIC_LIST, metricOf } from '../../data/goals';
import { prepareGoalImage } from '../../data/goalImage';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'placeholder:text-zinc-400 transition-colors focus:border-amber-500 focus:outline-none '
  + 'focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-950/60 '
  + 'dark:text-zinc-100 dark:placeholder:text-zinc-600';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

const EMPTY = {
  title: '', strategy: '', imageUrl: '', deadline: '', metric: 'money', target: '',
};

/**
 * Selector de la imagen de fondo: archivo o dirección web.
 *
 * Se ofrecen las dos porque resuelven casos distintos. La foto del celular es
 * lo natural para una meta personal ("la playa a la que quiero ir"); la URL
 * sirve cuando la promotoría comparte la imagen oficial de un concurso.
 */
function ImagePicker({ value, onChange, onError }) {
  const inputRef = useRef(null);
  const [isProcessing, setProcessing] = useState(false);
  const [mode, setMode] = useState('file');

  const pickFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      const { dataUrl } = await prepareGoalImage(file);
      onChange(dataUrl);
      onError('');
    } catch (error) {
      onError(error.message);
    } finally {
      setProcessing(false);
      // Sin limpiar, volver a elegir el mismo archivo no dispara `change`.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <span className={LABEL}>Imagen de fondo (opcional)</span>

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          <img src={value} alt="Vista previa del fondo" className="h-28 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Quitar imagen"
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg
                       bg-zinc-950/70 text-white transition-colors hover:bg-rose-500"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`flex-1 rounded-lg border py-1.5 text-[11px] font-semibold
                          transition-colors ${mode === 'file'
                ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                : 'border-zinc-200 text-zinc-500 dark:border-zinc-700'}`}
            >
              Desde mi galería
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`flex-1 rounded-lg border py-1.5 text-[11px] font-semibold
                          transition-colors ${mode === 'url'
                ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                : 'border-zinc-200 text-zinc-500 dark:border-zinc-700'}`}
            >
              Pegar dirección
            </button>
          </div>

          {mode === 'file' ? (
            <>
              {/* Oculto pero enfocable: el botón nativo se rotula en el idioma
                  del navegador y no se puede traducir desde HTML. */}
              <input
                ref={inputRef}
                id="goal-image"
                type="file"
                accept="image/*"
                onChange={pickFile}
                className="peer sr-only"
              />
              <label
                htmlFor="goal-image"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl
                           border border-dashed border-zinc-300 py-6 text-xs font-semibold
                           text-zinc-500 transition-colors hover:border-amber-500
                           hover:text-amber-600 peer-focus-visible:border-amber-500
                           peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500
                           dark:border-zinc-700"
              >
                {isProcessing
                  ? <><Loader2 size={15} className="animate-spin" /> Preparando imagen...</>
                  : <><ImagePlus size={15} /> Elegir una foto</>}
              </label>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link2 size={15} className="shrink-0 text-zinc-400" aria-hidden="true" />
              <input
                className={INPUT}
                placeholder="https://..."
                inputMode="url"
                autoComplete="off"
                onChange={(event) => onChange(event.target.value.trim())}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Alta y edición de una meta. La misma hoja sirve para las dos. */
export default function GoalFormSheet({ isOpen, onClose, onSubmit, goal }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const isEdit = Boolean(goal);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm(goal
      ? {
        title: goal.title,
        strategy: goal.strategy ?? '',
        imageUrl: goal.imageUrl ?? '',
        deadline: goal.deadline ?? '',
        metric: goal.metric,
        target: String(goal.target ?? ''),
      }
      : EMPTY);
  }, [isOpen, goal]);

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError('La meta necesita un nombre.');
      return;
    }
    const target = Number(form.target);
    if (!Number.isFinite(target) || target <= 0) {
      setError('Escribe la meta final como un número mayor que cero.');
      return;
    }

    onSubmit({ ...form, target });
    onClose();
  };

  const metric = metricOf(form.metric);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label={isEdit ? 'Editar meta' : 'Nueva meta'}>
      <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-white">
        {isEdit ? 'Editar meta' : 'Nueva meta'}
      </h2>

      <form onSubmit={submit}>
        <div className="mb-4">
          <label className={LABEL} htmlFor="goal-title">Nombre de la meta</label>
          <input
            id="goal-title"
            className={INPUT}
            value={form.title}
            onChange={setField('title')}
            placeholder="Ej. Viaje a Cancún"
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <ImagePicker
            value={form.imageUrl}
            onChange={(url) => { setForm((prev) => ({ ...prev, imageUrl: url })); setError(''); }}
            onError={setError}
          />
        </div>

        <div className="mb-4">
          <span className={LABEL}>Tipo de medición</span>
          <div role="radiogroup" aria-label="Tipo de medición" className="flex gap-2">
            {METRIC_LIST.map((option) => {
              const active = form.metric === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setForm((prev) => ({ ...prev, metric: option.key }))}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold
                              transition-all active:scale-95 ${active
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : 'border-zinc-200 text-zinc-500 dark:border-zinc-700'}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 flex gap-3">
          <div className="min-w-0 flex-1">
            <label className={LABEL} htmlFor="goal-target">
              Meta final ({metric.unit})
            </label>
            <input
              id="goal-target"
              className={INPUT}
              value={form.target}
              onChange={setField('target')}
              placeholder={form.metric === 'money' ? '100000' : '12'}
              inputMode="numeric"
              autoComplete="off"
            />
          </div>

          <div className="min-w-0 flex-1">
            <label className={LABEL} htmlFor="goal-deadline">Fecha límite</label>
            <input
              id="goal-deadline"
              type="date"
              className={INPUT}
              value={form.deadline}
              onChange={setField('deadline')}
            />
          </div>
        </div>

        <div className="mb-5">
          <label className={LABEL} htmlFor="goal-strategy">¿Cómo lo voy a lograr?</label>
          <textarea
            id="goal-strategy"
            rows={3}
            className={`${INPUT} resize-none`}
            value={form.strategy}
            onChange={setField('strategy')}
            placeholder="Ej. 3 citas nuevas por semana y seguimiento a mis referidos."
          />
        </div>

        {error && (
          <p role="alert" className="mb-4 text-xs font-medium text-rose-500">{error}</p>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500
                     px-4 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/25
                     transition-all hover:bg-amber-400 active:scale-[0.98]"
        >
          {isEdit ? <Save size={16} /> : <Send size={16} />}
          {isEdit ? 'Guardar cambios' : 'Crear mi meta'}
        </button>
      </form>
    </BottomSheet>
  );
}
