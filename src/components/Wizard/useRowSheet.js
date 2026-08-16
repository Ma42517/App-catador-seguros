import { useState, useCallback } from 'react';

/**
 * La maquinaria de "capturar en hoja modal", compartida por los cinco módulos.
 *
 * Ingresos, gastos, deudas, activos y metas hacen exactamente lo mismo: abrir un
 * borrador en blanco, o abrir una copia de una fila existente, y al guardar decidir
 * entre `add` y `update`. Repetido cinco veces son cien líneas idénticas, y con ellas
 * cinco sitios donde arreglar el mismo despiste. Los campos sí cambian entre módulos;
 * esta mecánica no.
 *
 * @param collection Clave de la colección en el estado: 'incomes', 'debts'...
 * @param create     Fábrica de filas nuevas: `createIncome`, `createDebt`...
 * @param add        Acción `add` del contexto financiero.
 * @param update     Acción `update` del contexto financiero.
 */
export default function useRowSheet({ collection, create, add, update }) {
  const [isOpen, setOpen] = useState(false);

  /*
    El borrador no se vacía al cerrar, y no es un descuido: la hoja tarda 300 ms en
    salir de pantalla. Quitarle los datos antes la dejaría animando en blanco, con los
    campos parpadeando a vacío justo cuando se desliza hacia abajo.
  */
  const [draft, setDraft] = useState(create);

  /** `null` significa "estoy creando". Con un id, "estoy corrigiendo esa fila". */
  const [editingId, setEditingId] = useState(null);

  const openNew = useCallback((overrides) => {
    setDraft(create(overrides));
    setEditingId(null);
    setOpen(true);
  }, [create]);

  const openEdit = useCallback((row) => {
    // Copia, no la fila del estado: se edita el borrador, no el diagnóstico.
    setDraft({ ...row });
    setEditingId(row.id);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const patch = useCallback((p) => setDraft((d) => ({ ...d, ...p })), []);

  /**
   * Escribe el borrador en el diagnóstico. Es el único momento en que se toca el
   * estado global: hasta aquí, lo escrito se puede cancelar.
   */
  const save = useCallback(() => {
    const clean = { ...draft, name: (draft.name || '').trim() };
    if (editingId !== null) update(collection, editingId, clean);
    else add(collection, clean);
    setOpen(false);
  }, [draft, editingId, collection, add, update]);

  return {
    isOpen, draft, patch, isEditing: editingId !== null, openNew, openEdit, close, save,
  };
}

/**
 * El último capturado, arriba.
 *
 * Se invierte al pintar en lugar de insertar al principio de la colección: quien
 * inserta es el reducer de `FinanceContext`, zona intocable del proyecto, y el orden
 * de lectura de una lista es asunto de la vista. El resultado es el que se buscaba
 * —lo que acabas de agregar aparece sin bajar la pantalla— y el orden del archivo
 * exportado se queda como estaba.
 */
export function newestFirst(rows) {
  return [...rows].reverse();
}
