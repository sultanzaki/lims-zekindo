"use client";

import { useState } from "react";

let counter = 0;
function nextId() {
  counter += 1;
  return `row-${counter}`;
}

/**
 * Minimal state for an "add another" repeatable-row form. Each id is just a
 * React key — the actual field values live in uncontrolled inputs that all
 * share the same `name` per field across rows (e.g. every row's name input
 * is `name="name"`), read back server-side via `formData.getAll(fieldName)`
 * and zipped by index. No form library needed for forms this simple.
 */
export function useRepeatableRows(initialCount = 1) {
  const [ids, setIds] = useState<string[]>(() => Array.from({ length: initialCount }, nextId));
  const addRow = () => setIds((prev) => [...prev, nextId()]);
  const removeRow = (id: string) => setIds((prev) => (prev.length > 1 ? prev.filter((x) => x !== id) : prev));
  return { ids, addRow, removeRow };
}
