import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, IdCard, FileText, Mail, Scale, Ruler, Briefcase,
  AlertTriangle, Stethoscope, Cigarette, Check, X, Ban, Save,
} from 'lucide-react';
import { Checkbox, NumberInput, TextInput, Select } from '../ui';
import { saveExpedienteLead } from '../../data/leads';
import {
  RISK_FREQUENCY_OPTIONS, MEDICAL_CATEGORIES, HEALTH_STATUS_OPTIONS, HABIT_TYPES,
} from './underwritingOptions';

/**
 * src/components/Prospecta/UnderwritingDrawer.jsx
 *
 * Expediente médico rápido, previo a emisión. Reduce el formulario largo a
 * 3 "Súper Preguntas" —Riesgos, Médico, Hábitos/Familia— con un botón
 * binario gigante cada una: si el cliente está sano, el asesor contesta
 * "No" a las tres y termina en 4 toques (los 3 botones + guardar), sin
 * haber visto ni un campo más. El 90% del formulario —categorías de
 * riesgo, fechas, consumo— sólo aparece cuando de verdad hace falta.
 *
 * Autocontenido igual que `CierreCuestionarioMedico.jsx`/
 * `CitaInicialWizard.jsx`: sólo `useState`, sin contextos ni enrutamiento
 * propio. Se monta con `<UnderwritingDrawer onBack={...} />` y no deja
 * rastro al desmontarse. `backLabel` (por omisión "Etapas") es el único
 * ajuste de contexto que admite: `Shell` (`App.jsx`) lo abre como
 * pantalla completa aparte, fuera de Prospecta, desde el botón ámbar
 * (`Sparkles`, "Asistente de requisitos") del reverso de
 * `PipelineCard.jsx`, y ahí pasa `"Cerrar"` en vez del rótulo por
 * omisión — el resto de la pantalla no sabe ni le importa desde dónde se
 * llegó.
 *
 * "Riesgos y Deportes" es la única de las 3 Súper Preguntas con 3 campos
 * obligatorios: actividad/deporte, frecuencia/nivel y detalle de cómo,
 * cuándo y dónde se practica. Médico y Hábitos/Familia conservan sus
 * campos como opcionales dentro del sub-formulario, porque no llegó una
 * regla equivalente para ellas.
 */

const EMPTY = {
  // Sección fija
  hasIne: false,
  hasRfc: false,
  hasEmail: false,
  weightKg: 0,
  heightCm: 0,
  occupation: '',

  // Súper Pregunta 1 — Riesgos y Deportes. Los 3 campos son obligatorios
  // en cuanto se responde "Sí" (ver `RISK_REQUIRED_FIELDS` más abajo).
  hasRisks: null,
  riskActivity: '',
  riskFrequency: '',
  riskDetails: '',

  // Súper Pregunta 2 — Médico
  hasMedicalHistory: null,
  medicalCategory: '',
  medicalDate: '',
  medicalStatus: '',

  // Súper Pregunta 3 — Hábitos / Familia
  hasHabits: null,
  habitType: '',
  habitFrequency: '',
  quitHabit: false,
};

// Las 4 listas de opciones de las Súper Preguntas viven en
// `underwritingOptions.js` (import de arriba), no aquí: `LeadsList.jsx`
// también las necesita para traducir a texto legible el detalle completo
// de un expediente ya guardado, y exportarlas desde este componente
// generaba una advertencia de lint (`react/only-export-components`,
// rompe el Fast Refresh de un archivo que también exporta un componente).

/** Botón binario gigante de una Súper Pregunta. */
function SuperQuestionToggle({ icon: Icon, question, value, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border
                     border-slate-700 bg-slate-800 text-indigo-400"
          aria-hidden="true"
        >
          <Icon size={17} />
        </span>
        <p className="text-sm font-semibold leading-snug text-slate-100">{question}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={question}>
        <button
          type="button"
          role="radio"
          aria-checked={value === true}
          onClick={() => onChange(true)}
          className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm
                      font-bold transition-all active:scale-95 ${value === true
              ? 'bg-amber-500 text-slate-950'
              : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          <Check size={16} aria-hidden="true" />
          Sí
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === false}
          onClick={() => onChange(false)}
          className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm
                      font-bold transition-all active:scale-95 ${value === false
              ? 'bg-emerald-500 text-slate-950'
              : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          <X size={16} aria-hidden="true" />
          No
        </button>
      </div>
    </div>
  );
}

/**
 * Envoltura animada del sub-formulario condicional: se desliza hacia abajo
 * al aparecer, con el fondo un tono más claro (`bg-slate-800` sobre el
 * `bg-slate-900` de la tarjeta) para marcar que es contenido de segundo
 * nivel, no una pregunta más al mismo nivel que las 3 Súper Preguntas.
 */
function ConditionalPanel({ children }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="mt-3 flex flex-col gap-3 rounded-xl bg-slate-800 p-4">
        {children}
      </div>
    </motion.div>
  );
}

/**
 * Campo compacto con etiqueta pequeña; comparte forma en las dos secciones
 * fijas y condicionales. `required` agrega el asterisco: se usa en los 3
 * campos obligatorios del sub-formulario de Riesgos y Deportes, para que
 * el asesor vea de entrada cuáles no puede dejar vacíos.
 */
function CompactField({ label, required = false, children }) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </span>
      {children}
    </div>
  );
}

/**
 * Textarea con el mismo estilo base que el resto de campos del expediente
 * (no existe un `Textarea` en `components/ui`, así que se dibuja aquí a
 * mano con las mismas clases que ya usa el input de fecha, más abajo, para
 * no introducir un tercer estilo de campo distinto en la misma pantalla).
 */
function CompactTextarea({ value, onChange, placeholder, required = false, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      rows={rows}
      className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/60 px-3
                 py-2.5 text-sm text-slate-100 placeholder:text-slate-500
                 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );
}

export default function UnderwritingDrawer({
  onBack, backLabel = 'Etapas',
  /*
    Prospecto al que pertenece este expediente —nombre y teléfono, los
    mismos que ya trae el evento de la Cita de Propuesta
    (`PipelineCard.jsx`, vía `App.jsx`)—: sin esto, "Guardar Expediente"
    no tendría a quién asociar la captura. Si se abre sin cliente (por
    ejemplo, entrando a mano en algún flujo futuro), cae a "Prospecto"
    igual que el resto de capturas sin nombre en la app.
  */
  client = null,
  /*
    Clave del asesor (`identity.key`): a quién pertenece "Prospectos
    capturados" en su perfil. Sin ella, "Guardar Expediente" no tiene
    dónde escribir — el botón se deshabilita.
  */
  username = null,
}) {
  const [data, setData] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const update = (patch) => { setData((prev) => ({ ...prev, ...patch })); setSaved(false); };

  /*
    Guarda el expediente completo como un prospecto más en "Prospectos
    capturados" (`LeadsList.jsx`, mismo almacén que ya usa la tarjeta
    digital — ver `saveExpedienteLead`, `data/leads.js`) y regresa. No hay
    ninguna validación de campos obligatorios más allá de las 3 Súper
    Preguntas del propio formulario: si el cliente está sano, guardar con
    las tres en "No" es justo el caso rápido que este componente existe
    para resolver.
  */
  const handleSave = () => {
    saveExpedienteLead(username, {
      name: client?.name,
      phone: client?.phone,
      expediente: data,
    });
    setSaved(true);
  };

  return (
    <div className="animate-rise">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500
                   transition-colors hover:text-slate-200"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </button>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl
                      shadow-black/50 sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
          Expediente Previo a Emisión
        </p>
        <h2 className="mt-1 text-lg font-bold leading-snug text-white">
          {client?.name || 'Suscripción rápida'}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Si el cliente está sano, contesta "No" a las 3 preguntas y termina en
          cuatro toques.
        </p>

        {/* ── Sección fija: siempre visible ── */}
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-800
                        bg-slate-950/60 p-4"
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Checkbox
              checked={data.hasIne}
              onChange={(v) => update({ hasIne: v })}
              label={(
                <span className="flex items-center gap-1.5">
                  <IdCard size={13} className="shrink-0 text-slate-500" aria-hidden="true" />
                  INE
                </span>
              )}
            />
            <Checkbox
              checked={data.hasRfc}
              onChange={(v) => update({ hasRfc: v })}
              label={(
                <span className="flex items-center gap-1.5">
                  <FileText size={13} className="shrink-0 text-slate-500" aria-hidden="true" />
                  RFC
                </span>
              )}
            />
            <Checkbox
              checked={data.hasEmail}
              onChange={(v) => update({ hasEmail: v })}
              label={(
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="shrink-0 text-slate-500" aria-hidden="true" />
                  Correo
                </span>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CompactField label="Peso">
              <NumberInput
                value={data.weightKg}
                onChange={(v) => update({ weightKg: v })}
                suffix="kg"
                icon={Scale}
                min={0}
                max={300}
              />
            </CompactField>
            <CompactField label="Estatura">
              <NumberInput
                value={data.heightCm}
                onChange={(v) => update({ heightCm: v })}
                suffix="cm"
                icon={Ruler}
                min={0}
                max={250}
              />
            </CompactField>
            <CompactField label="Ocupación">
              <TextInput
                value={data.occupation}
                onChange={(v) => update({ occupation: v })}
                placeholder="Ej. Contador"
                icon={Briefcase}
              />
            </CompactField>
          </div>
        </div>

        {/* ── Las 3 Súper Preguntas ── */}
        <div className="mt-5 flex flex-col gap-3">
          {/* 1. Riesgos */}
          <div>
            <SuperQuestionToggle
              icon={AlertTriangle}
              question="¿Practica alguna actividad de alto riesgo o viaja con frecuencia a zonas de riesgo?"
              value={data.hasRisks}
              onChange={(v) => update({ hasRisks: v })}
            />
            {/*
              Al responder "Sí" se revelan de inmediato los 3 campos
              obligatorios de este sub-formulario — actividad, frecuencia/
              nivel y detalle— y no uno a la vez ni tras otra confirmación:
              es la misma "Súper Pregunta" abriendo su formulario completo,
              igual que Médico y Hábitos.
            */}
            <AnimatePresence>
              {data.hasRisks === true && (
                <ConditionalPanel>
                  <CompactField label="¿Qué actividad o deporte realiza?" required>
                    <TextInput
                      value={data.riskActivity}
                      onChange={(v) => update({ riskActivity: v })}
                      placeholder="Ej. Motociclismo, buceo, paracaidismo..."
                      required
                    />
                  </CompactField>

                  <CompactField label="Frecuencia / Nivel" required>
                    <Select
                      value={data.riskFrequency}
                      onChange={(v) => update({ riskFrequency: v })}
                      options={RISK_FREQUENCY_OPTIONS}
                      required
                    />
                  </CompactField>

                  <CompactField
                    label="Especifique detalles (cómo, cuándo y dónde lo practica)"
                    required
                  >
                    <CompactTextarea
                      value={data.riskDetails}
                      onChange={(v) => update({ riskDetails: v })}
                      placeholder="Describe cómo, cuándo y dónde practica esta actividad..."
                      required
                    />
                  </CompactField>
                </ConditionalPanel>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Médico */}
          <div>
            <SuperQuestionToggle
              icon={Stethoscope}
              question="¿Tiene algún padecimiento médico diagnosticado?"
              value={data.hasMedicalHistory}
              onChange={(v) => update({ hasMedicalHistory: v })}
            />
            <AnimatePresence>
              {data.hasMedicalHistory === true && (
                <ConditionalPanel>
                  <CompactField label="Categoría">
                    <Select
                      value={data.medicalCategory}
                      onChange={(v) => update({ medicalCategory: v })}
                      options={MEDICAL_CATEGORIES}
                    />
                  </CompactField>
                  <div className="grid grid-cols-2 gap-3">
                    <CompactField label="Fecha del diagnóstico">
                      <input
                        type="date"
                        value={data.medicalDate}
                        onChange={(e) => update({ medicalDate: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60
                                   px-3 py-2.5 text-sm text-slate-100 [color-scheme:dark]
                                   focus:border-indigo-500 focus:outline-none focus:ring-2
                                   focus:ring-indigo-500"
                      />
                    </CompactField>
                    <CompactField label="Estado de salud">
                      <Select
                        value={data.medicalStatus}
                        onChange={(v) => update({ medicalStatus: v })}
                        options={HEALTH_STATUS_OPTIONS}
                      />
                    </CompactField>
                  </div>
                </ConditionalPanel>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Hábitos / Familia */}
          <div>
            <SuperQuestionToggle
              icon={Cigarette}
              question="¿Tiene hábitos de consumo (tabaco, alcohol) o antecedentes familiares de riesgo?"
              value={data.hasHabits}
              onChange={(v) => update({ hasHabits: v })}
            />
            <AnimatePresence>
              {data.hasHabits === true && (
                <ConditionalPanel>
                  <div className="grid grid-cols-2 gap-3">
                    <CompactField label="Tipo">
                      <Select
                        value={data.habitType}
                        onChange={(v) => update({ habitType: v })}
                        options={HABIT_TYPES}
                      />
                    </CompactField>
                    <CompactField label="Frecuencia de consumo">
                      <TextInput
                        value={data.habitFrequency}
                        onChange={(v) => update({ habitFrequency: v })}
                        placeholder="Ej. 5 cigarros al día"
                      />
                    </CompactField>
                  </div>

                  <button
                    type="button"
                    onClick={() => update({ quitHabit: !data.quitHabit })}
                    aria-pressed={data.quitHabit}
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5
                                text-xs font-semibold transition-all active:scale-95 ${
                      data.quitHabit
                        ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'border border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Ban size={14} aria-hidden="true" />
                    {data.quitHabit ? 'Abandonó el hábito' : 'Marcar como abandonado'}
                  </button>
                </ConditionalPanel>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/*
          "Guardar Expediente": sin esto, el formulario nunca escribía en
          ningún lado — se podía contestar todo y cerrar la pantalla sin
          dejar rastro. Se anuncia con un cambio de color y texto en vez de
          un `Toast` aparte, porque el botón mismo es el lugar donde la
          persona está mirando en ese instante.
        */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!username}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3
                      text-sm font-semibold transition-all active:scale-[0.98]
                      disabled:cursor-not-allowed disabled:opacity-50 ${saved
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
        >
          {saved ? <Check size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          {saved ? 'Guardado en Prospectos capturados' : 'Guardar Expediente'}
        </button>
      </div>
    </div>
  );
}
