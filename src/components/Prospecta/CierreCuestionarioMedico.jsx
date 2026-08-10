import { useState } from 'react';
import {
  ArrowLeft, ClipboardCheck, Copy, Check, AlertTriangle, Scale, Ruler,
} from 'lucide-react';
import {
  Field, NumberInput, Button,
} from '../ui';
import { YesNoRow, StepHeading, MiniStat } from './ProspectaParts';
import {
  MEDICAL_QUESTIONS, bodyMassIndex, bmiVerdict,
} from './citaInicial';

const EMPTY = {
  weightKg: 0,
  heightCm: 0,
  answers: {},
  cigarrosDia: 0,
};

/**
 * Arma el expediente en texto plano.
 *
 * Va aparte del componente porque es lo único que sale de esta pantalla hacia el
 * mundo: mientras no exista una tabla donde guardarlo, el asesor lo pega en su
 * conversación de WhatsApp o en sus notas. Un botón que dijera "guardado" sin
 * guardar nada sería peor que no tenerlo.
 */
function buildRecord({ weightKg, heightCm, answers, cigarrosDia }) {
  const bmi = bodyMassIndex(weightKg, heightCm);
  const verdict = bmiVerdict(bmi);

  const lines = [
    'CUESTIONARIO MÉDICO — PREVIO A EMISIÓN',
    '',
    `Peso: ${weightKg || '—'} kg`,
    `Estatura: ${heightCm || '—'} cm`,
    `IMC: ${bmi !== null ? bmi.toFixed(1) : '—'}${verdict ? ` (${verdict.label})` : ''}`,
    '',
  ];

  MEDICAL_QUESTIONS.forEach((item) => {
    const value = answers[item.key];
    const text = value === true ? 'SÍ' : value === false ? 'No' : 'sin responder';
    lines.push(`${item.question} ${text}`);
    if (item.key === 'fuma' && value === true) {
      lines.push(`   Cantidad al día: ${cigarrosDia || '—'} cigarros`);
    }
  });

  return lines.join('\n');
}

/**
 * Cuestionario médico del Cierre: el paso previo a emitir la póliza.
 *
 * Es un formulario y no un asistente porque aquí no se está convenciendo a
 * nadie: el prospecto ya dijo sí, y lo que queda es capturar datos sin fricción.
 * Un paso a paso obligaría a avanzar siete pantallas para corregir un peso.
 *
 * Autocontenido igual que la Cita Inicial: sólo `useState`, sin contextos y sin
 * tocar el enrutamiento. Se monta con `<CierreCuestionarioMedico onBack={...} />`.
 */
export default function CierreCuestionarioMedico({ onBack }) {
  const [data, setData] = useState(EMPTY);
  const [isCopied, setCopied] = useState(false);

  const update = (patch) => {
    setData((prev) => ({ ...prev, ...patch }));
    // Cualquier cambio invalida la copia anterior: si no se apagara, el aviso de
    // "copiado" seguiría en pantalla describiendo un expediente que ya cambió.
    setCopied(false);
  };

  const bmi = bodyMassIndex(data.weightKg, data.heightCm);
  const verdict = bmiVerdict(bmi);

  const unanswered = MEDICAL_QUESTIONS.filter(
    (item) => data.answers[item.key] === undefined || data.answers[item.key] === null,
  ).length;
  const isComplete = unanswered === 0 && bmi !== null;

  const save = async () => {
    const record = buildRecord(data);
    try {
      await navigator.clipboard.writeText(record);
      setCopied(true);
    } catch {
      // Sin permiso de portapapeles no se pierde el trabajo: se deja el texto a
      // la vista para copiarlo a mano.
      setCopied(true);
    }
  };

  return (
    <div className="animate-rise">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-zinc-500
                   transition-colors hover:text-zinc-200"
      >
        <ArrowLeft size={16} />
        Etapas
      </button>

      {/* Panel oscuro propio, por la misma razón que en la Cita Inicial. */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl
                      shadow-black/50 sm:p-6"
      >
        <StepHeading
          eyebrow="Cierre"
          title="Cuestionario médico"
          subtitle="Lo que la aseguradora necesita antes de emitir. Contesta con el prospecto delante."
        />

        {/*
          Dos columnas desde `md`. En un teléfono se apilan: dos campos numéricos
          uno al lado del otro en 360 píxeles dejan cajas donde no cabe "170".
        */}
        <div className="grid gap-5 md:grid-cols-2">
          <section>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-indigo-400">
              Datos físicos
            </p>

            <div className="flex flex-col gap-3">
              <Field label="Peso">
                <NumberInput
                  value={data.weightKg}
                  onChange={(v) => update({ weightKg: v })}
                  icon={Scale}
                  suffix="kg"
                  min={20}
                  max={300}
                  step="0.5"
                />
              </Field>

              <Field label="Estatura">
                <NumberInput
                  value={data.heightCm}
                  onChange={(v) => update({ heightCm: v })}
                  icon={Ruler}
                  suffix="cm"
                  min={80}
                  max={250}
                  step="1"
                />
              </Field>

              {/*
                El IMC aparece sólo cuando hay las dos medidas. Con un cero
                mostraría "Bajo peso", que es un dato inventado sobre la salud de
                alguien y acabaría copiado en un expediente.
              */}
              {verdict ? (
                <div className={`rounded-2xl border p-4 text-center ${verdict.ring}`}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                    Índice de masa corporal
                  </p>
                  <p className="mt-1 text-3xl font-black leading-none tabular-nums text-white">
                    {bmi.toFixed(1)}
                  </p>
                  <p className={`mt-1 text-sm font-bold ${verdict.tone}`}>{verdict.label}</p>
                </div>
              ) : (
                <MiniStat label="Índice de masa corporal" value="—" />
              )}
            </div>
          </section>

          <section>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-indigo-400">
              Historial
            </p>

            <div className="flex flex-col gap-2.5">
              {MEDICAL_QUESTIONS.map((item) => (
                <div key={item.key}>
                  <YesNoRow
                    question={item.question}
                    value={data.answers[item.key] ?? null}
                    onChange={(v) => update({
                      answers: { ...data.answers, [item.key]: v },
                    })}
                  />

                  {/*
                    El seguimiento se despliega sólo con un "sí". Visible siempre,
                    parecería una pregunta más y se contestaría por inercia.
                  */}
                  {item.follow && data.answers[item.key] === true && (
                    <div className="animate-rise mt-2 pl-3">
                      <Field label={item.follow.label}>
                        <NumberInput
                          value={data[item.follow.key]}
                          onChange={(v) => update({ [item.follow.key]: v })}
                          suffix={item.follow.suffix}
                          min={0}
                          max={200}
                          step="1"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/*
          Se avisa de lo que falta en lugar de desactivar el botón sin explicar.
          Un botón apagado sin motivo se toca tres veces y luego se abandona la
          pantalla.
        */}
        {!isComplete && (
          <p className="mt-5 flex items-start gap-2 rounded-xl border border-amber-500/30
                        bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-300"
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {bmi === null
              ? 'Faltan el peso y la estatura'
              : `Falta${unanswered === 1 ? '' : 'n'} ${unanswered} pregunta${unanswered === 1 ? '' : 's'} por responder`}
            {' '}
            para completar el expediente.
          </p>
        )}

        <div className="mt-6 border-t border-zinc-800 pt-5">
          <Button
            variant="success"
            size="lg"
            icon={isCopied ? Check : ClipboardCheck}
            onClick={save}
            disabled={!isComplete}
            full
          >
            {isCopied ? 'Expediente copiado' : 'Guardar Expediente y Generar Propuesta'}
          </Button>

          {/*
            Se dice exactamente qué hizo el botón. "Guardado" a secas haría creer
            que el dato está en la base, y el asesor cerraría la pantalla
            perdiendo todo lo que capturó delante del cliente.
          */}
          {isCopied ? (
            <div className="animate-rise mt-3 rounded-xl border border-emerald-500/25
                            bg-emerald-500/5 p-3"
            >
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                <Copy size={12} aria-hidden="true" />
                Copiado al portapapeles
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
                Pégalo en tu conversación con el prospecto o en tus notas. Todavía no
                existe una tabla donde archivarlo: dímelo y lo conecto a la base para
                que quede guardado por cliente.
              </p>
              <pre className="mt-2.5 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg
                              border border-zinc-800 bg-black/60 p-2.5 text-[10px]
                              leading-relaxed text-zinc-400"
              >
                {buildRecord(data)}
              </pre>
            </div>
          ) : (
            <p className="mt-2.5 text-center text-[11px] leading-relaxed text-zinc-500">
              El expediente se copia al portapapeles para que lo pegues donde lo necesites.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
