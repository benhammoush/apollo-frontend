/**
 * Frontend CSV parsing utilities.
 *
 * Parses CSV text received from the backend API into JavaScript objects
 * for display in the dataset viewer. Also provides Arquero table creation
 * from columnar JSON for efficient data operations.
 */

import { table as aqTable } from 'arquero'
import type { ColumnTable as AqTable } from 'arquero'

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface MultiArrayCSVData {
  [key: string]: Record<string, unknown>[]
}

// ── Private helpers ────────────────────────────────────────────────────────────

const EMPTY_RE = /^\s*$/

const CSV_LINE_RE =
  /(?:,|\r?\n|^)("(?:[^"]|"")*"|[^",\r\n]*)/g

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/

const SCIENTIFIC_NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)$/

// ── parseCSVLine ──────────────────────────────────────────────────────────────

/**
 * Parses a single CSV line, handling quoted values.
 *
 * Comma delimiter only (commas inside double-quoted fields are ignored).
 * Double-quote escaping (`""` inside quotes) is resolved to a single `"`.
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }

  fields.push(current)
  return fields
}

// ── parseCSV ──────────────────────────────────────────────────────────────────

/**
 * Parses a CSV string into an array of row objects.
 *
 * The first line is treated as headers. Handles quoted values (with commas
 * inside), escaped quotes (`""` → `"`), and CRLF or LF line endings.
 * Empty lines are skipped. Returns an empty array for empty input.
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  if (!csvText || EMPTY_RE.test(csvText)) {
    return []
  }

  const lines = csvText.split(/\r?\n/)
  const rows: Record<string, string>[] = []
  let headers: string[] | null = null

  for (const rawLine of lines) {
    if (rawLine === '' || rawLine === '\r') {
      continue
    }

    const fields = parseCSVLine(rawLine)

    if (!headers) {
      headers = fields
      continue
    }

    const row: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = i < fields.length ? fields[i] : ''
    }
    rows.push(row)
  }

  return rows
}

// ── convertCSVValue ───────────────────────────────────────────────────────────

/**
 * Converts a CSV string value to an appropriate JavaScript type.
 *
 * Rules (first match wins):
 * - Empty string → `null`
 * - `"true"` → `true`, `"false"` → `false`
 * - Numeric strings (including scientific notation like `1.5e6`) → `number`
 * - Strings starting with `{` / `[` and ending with `}` / `]` → `JSON.parse()`
 *   on success, unchanged string on failure
 * - ISO date strings (`YYYY-MM-DDTHH:MM:SS` or `YYYY-MM-DD HH:MM:SS`) →
 *   kept as string
 * - Everything else → string
 */
export function convertCSVValue(value: string): unknown {
  if (value === '') {
    return null
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  // Numeric: integer, float, or scientific notation
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(value)) {
    return Number(value)
  }

  // JSON objects / arrays
  if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  // ISO date strings — keep as string
  if (ISO_DATE_RE.test(value)) {
    return value
  }

  return value
}

// ── parseCSVWithTypes ─────────────────────────────────────────────────────────

/**
 * Parses CSV text and converts each cell value to its inferred JavaScript type.
 *
 * Internally calls {@link parseCSV} then applies {@link convertCSVValue} to
 * every field.
 */
export function parseCSVWithTypes(csvText: string): Record<string, unknown>[] {
  const rows = parseCSV(csvText)

  return rows.map((row) => {
    const typed: Record<string, unknown> = {}
    for (const key of Object.keys(row)) {
      typed[key] = convertCSVValue(row[key])
    }
    return typed
  })
}

// ── parseColumnarJSON ─────────────────────────────────────────────────────────

/**
 * Converts a columnar JSON payload from the backend into row-oriented objects.
 *
 * The backend sends ``{columns: string[], rows: unknown[][]}`` — column names
 * once, then each row as a flat value array.  This function zips them back
 * into ``Record<string, unknown>[]`` with a single pass (no CSV string
 * splitting or regex type-detection needed).
 *
 * Backend already applies type conversion, so the values arrive as their
 * native JavaScript types (number, boolean, null, string, array, object).
 */
export function parseColumnarJSON(data: {
  columns: string[]
  rows: unknown[][]
}): Record<string, unknown>[] {
  const { columns, rows } = data
  const colCount = columns.length
  return rows.map(row => {
    const obj: Record<string, unknown> = {}
    for (let i = 0; i < colCount; i++) {
      obj[columns[i]] = row[i]
    }
    return obj
  })
}

// ── columnarToArquero ────────────────────────────────────────────────────────

/**
 * Converts a columnar JSON payload into an Arquero table.
 *
 * The backend sends ``{columns: string[], rows: unknown[][]}`` — column names
 * once, then each row as a flat value array. This function transposes the
 * row-oriented arrays into column-oriented arrays and creates an Arquero table,
 * which provides efficient columnar access for filtering, sorting, searching,
 * and unique-value computation.
 *
 * Backend already applies type conversion, so the values arrive as their
 * native JavaScript types (number, boolean, null, string, array, object).
 */
export function columnarToArquero(data: {
  columns: string[]
  rows: unknown[][]
}): AqTable {
  const { columns, rows } = data
  const colCount = columns.length
  const rowCount = rows.length

  const columnar: Record<string, unknown[]> = {}
  for (let ci = 0; ci < colCount; ci++) {
    const colName = columns[ci]
    const colData = new Array<unknown>(rowCount)
    for (let ri = 0; ri < rowCount; ri++) {
      colData[ri] = rows[ri][ci]
    }
    columnar[colName] = colData
  }

  return aqTable(columnar) as AqTable
}

// ── parseMultiArrayCSV ────────────────────────────────────────────────────────

/**
 * Parses a map of `{ key: csvText }` into typed row arrays.
 *
 * Designed for BB-style data where multiple CSV payloads are fetched
 * separately and each key identifies a distinct dataset (e.g. arrays
 * from different stream names).
 */
export function parseMultiArrayCSV(csvDataMap: Record<string, string>): MultiArrayCSVData {
  const result: MultiArrayCSVData = {}

  for (const key of Object.keys(csvDataMap)) {
    result[key] = parseCSVWithTypes(csvDataMap[key])
  }

  return result
}
