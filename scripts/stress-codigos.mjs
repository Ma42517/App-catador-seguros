/**
 * Prueba de carga de los códigos de invitación.
 *
 *   node scripts/stress-codigos.mjs
 *
 * Responde a una sola pregunta: ¿aguanta esto cuando se registren muchos
 * usuarios? Simula el índice único de Postgres con un `Set` y el reintento del
 * componente que guarda el código, así que mide lo mismo que ocurriría en la
 * base sin necesidad de tocarla.
 *
 * No usa ninguna librería de pruebas a propósito: el proyecto no tiene una, y
 * añadir un marco entero para un guion que se corre a mano cuando se cambia el
 * formato del código costaría más de lo que ahorra.
 */
import {
  generateCode, normalizeCode, isValidCode, initialsFrom,
} from '../src/data/promotoriaCode.js';

/** Reintentos que hace `InviteCodeCard` al chocar un código. */
const RETRIES = 5;

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails += 1;
};

/** Reparte códigos entre `count` promotorías, contando choques y fallos. */
function distribute(count, nameFor) {
  const taken = new Set(); // hace de índice único
  let collisions = 0;
  let unresolved = 0;

  for (let i = 0; i < count; i += 1) {
    let saved = false;
    for (let attempt = 0; attempt < RETRIES; attempt += 1) {
      const code = generateCode(nameFor(i));
      if (taken.has(code)) { collisions += 1; continue; }
      taken.add(code);
      saved = true;
      break;
    }
    if (!saved) unresolved += 1;
  }

  return { unique: taken.size, collisions, unresolved };
}

// ── 1. Caso real: 500 promotorías con nombres distintos ──
{
  const r = distribute(500, (i) => `Promotoria Numero ${i} Seguros`);
  check('500 promotorias distintas obtienen codigo unico',
    r.unique === 500 && r.unresolved === 0,
    `${r.unique} codigos, ${r.collisions} choques reintentados, ${r.unresolved} sin resolver`);
}

// ── 2. Peor caso: 2000 promotorías con el MISMO nombre, o sea el mismo prefijo ──
{
  const r = distribute(2000, () => 'M. Aceves y Consultores');
  check('2000 promotorias con prefijo identico', r.unresolved === 0,
    `${r.unique} unicos, ${r.collisions} choques, ${r.unresolved} sin resolver`);
}

// ── 3. Dónde está el techo de verdad ──
{
  const r = distribute(60000, () => 'MAC');
  console.log(`INFO  con 60000 codigos del MISMO prefijo: ${r.unresolved} fallarian `
    + `tras ${RETRIES} intentos (${r.unique} unicos de 100000 combinaciones)`);
  console.log('      Es el limite teorico, no un problema real: harian falta 60 mil');
  console.log('      promotorias con el mismo nombre para llegar ahi.');
}

// ── 4. Lo que un asesor puede teclear en el campo del código ──
{
  const nasty = [
    "'; DROP TABLE profiles;--", '<script>alert(1)</script>', 'PROMO-866-01 OR 1=1',
    '😀😀😀-866-01', 'ÑÁÉ-866-01', 'a'.repeat(500), '', '   ', null, undefined,
    'MAC--866--08', 'mac_866_08', '  PROMO-866-01\n', 'PROMO-866-01;DELETE',
  ];

  let crashed = false;
  const garbage = [];

  for (const input of nasty) {
    try {
      const clean = normalizeCode(input);
      // Nada que pase la validación puede tener otra forma que la esperada.
      if (isValidCode(input) && !/^[A-Z]{2,8}-\d{3}-\d{2}$/.test(clean)) garbage.push(input);
    } catch (error) {
      crashed = true;
      console.log('   excepcion con', JSON.stringify(input), error.message);
    }
  }

  check(`${nasty.length} entradas adversarias sin excepcion`, !crashed);
  check('ninguna basura pasa como codigo valido', garbage.length === 0,
    garbage.length ? JSON.stringify(garbage) : 'todas rechazadas o normalizadas');

  console.log('   ', JSON.stringify("'; DROP TABLE profiles;--"), '->',
    JSON.stringify(normalizeCode("'; DROP TABLE profiles;--")), '(sin digitos: invalido)');
  console.log('   ', JSON.stringify('mac_866_08'), '->',
    JSON.stringify(normalizeCode('mac_866_08')), isValidCode('mac_866_08') ? '(valido)' : '(invalido)');
}

// ── 5. El prefijo nunca sale mal formado, ni con nombres raros ──
{
  const bad = [];
  for (const name of ['', '   ', '123', '😀', 'Ñ', 'de la y el', null, 'A', 'AB']) {
    const initials = initialsFrom(name);
    if (!/^[A-Z]{3}$/.test(initials)) bad.push(`${JSON.stringify(name)} -> ${initials}`);
  }
  check('initialsFrom siempre devuelve 3 letras A-Z', bad.length === 0,
    bad.join(', ') || 'probado con vacios, numeros y emoji');
}

console.log(`\n${fails === 0 ? 'TODAS PASAN' : `${fails} FALLAN`}`);

/*
  Se lanza en lugar de llamar a `process.exit`.

  El resultado es el mismo -Node termina con codigo distinto de cero, que es lo
  que necesita un guion de pruebas- pero `process` es un global de Node que el
  linter de este proyecto no conoce, porque esta configurado para codigo de
  navegador. Un `eslint-disable` habria callado el aviso sin resolverlo.
*/
if (fails > 0) throw new Error(`${fails} prueba(s) fallaron.`);
