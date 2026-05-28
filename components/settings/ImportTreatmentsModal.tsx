'use client'

import { useState, useRef } from 'react'
import { parseTreatmentsFile, importTreatments } from '@/app/(dashboard)/settings/actions'
import type { Treatment } from '@/lib/types'
import type { ParsedTreatment } from '@/app/(dashboard)/settings/actions'

type Step = 'upload' | 'processing' | 'preview' | 'importing' | 'result'

type PreviewRow = {
  _key: string
  name: string
  price: string
  duration_minutes: string
  category: string
  description: string
  selected: boolean
  isDuplicate: boolean
}

type ImportResult = { inserted: number; updated: number; errors: string[] }

const CELL =
  'w-full bg-gray-900 border border-gray-700 text-white rounded px-2 py-1.5 text-xs placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500 transition-colors'

export function ImportTreatmentsModal({
  existingTreatments,
  onClose,
}: {
  existingTreatments: Treatment[]
  onClose: () => void
}) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const existingNamesLower = new Set(existingTreatments.map(t => t.name.toLowerCase()))

  const toPreviewRows = (parsed: ParsedTreatment[]): PreviewRow[] =>
    parsed.map((t, i) => ({
      _key: `${i}_${t.name}`,
      name: t.name,
      price: t.price != null ? String(t.price) : '',
      duration_minutes: t.duration_minutes != null ? String(t.duration_minutes) : '',
      category: t.category ?? '',
      description: t.description ?? '',
      selected: true,
      isDuplicate: existingNamesLower.has(t.name.toLowerCase()),
    }))

  const updateRow = (i: number, patch: Partial<PreviewRow>) =>
    setRows(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setParseError(null)
  }

  const handleProcess = async () => {
    if (!file) return
    setParseError(null)
    setStep('processing')
    const fd = new FormData()
    fd.set('file', file)
    const res = await parseTreatmentsFile(fd)
    if (res.error || !res.treatments) {
      setParseError(res.error ?? 'Error desconocido al procesar el archivo')
      setStep('upload')
    } else if (res.treatments.length === 0) {
      setParseError('No se encontraron tratamientos en el archivo')
      setStep('upload')
    } else {
      setRows(toPreviewRows(res.treatments))
      setStep('preview')
    }
  }

  const handleImport = async () => {
    setStep('importing')
    const selected: ParsedTreatment[] = rows
      .filter(r => r.selected && r.name.trim().length >= 2)
      .map(r => ({
        name: r.name.trim(),
        price: r.price !== '' ? parseFloat(r.price) || null : null,
        duration_minutes: r.duration_minutes !== '' ? parseInt(r.duration_minutes) || null : null,
        description: r.description.trim() || null,
        category: r.category.trim() || null,
      }))
    const res = await importTreatments(selected)
    setResult(res)
    setStep('result')
  }

  const selectedCount = rows.filter(r => r.selected).length
  const duplicateCount = rows.filter(r => r.isDuplicate).length
  const allSelected = rows.length > 0 && rows.every(r => r.selected)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-white">
            {step === 'result' ? 'Importación completada' : 'Importar tratamientos'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              <p className="text-sm text-gray-400">
                Sube un archivo con tu lista de tratamientos. Compatible con{' '}
                <span className="text-gray-300">PDF</span>,{' '}
                <span className="text-gray-300">Excel (.xlsx/.xls)</span> y{' '}
                <span className="text-gray-300">CSV</span>.
              </p>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-700 hover:border-violet-500/60 rounded-xl p-10 text-center transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3 group-hover:bg-violet-900/30 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                {file ? (
                  <p className="text-sm text-violet-400 font-medium">{file.name}</p>
                ) : (
                  <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                    Arrastra un archivo o{' '}
                    <span className="text-violet-400">haz clic para seleccionar</span>
                  </p>
                )}
                <p className="text-xs text-gray-600 mt-1">PDF, .xlsx, .xls, .csv</p>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />

              {parseError && (
                <div className="flex items-start gap-2.5 bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-sm text-red-400">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Procesando archivo…</p>
              {file?.name.toLowerCase().endsWith('.pdf') && (
                <p className="text-xs text-gray-600">Los PDFs pueden tardar unos segundos</p>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  <span className="text-white font-medium">{rows.length}</span>{' '}
                  tratamiento{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''}
                  {duplicateCount > 0 && (
                    <span className="ml-2 text-yellow-500/80">
                      · {duplicateCount} ya existe{duplicateCount !== 1 ? 'n' : ''} en tu catálogo (se actualizarán)
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRows(r => r.map(x => ({ ...x, selected: true })))}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    onClick={() => setRows(r => r.map(x => ({ ...x, selected: false })))}
                    className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
                  >
                    Deseleccionar todos
                  </button>
                </div>
              </div>

              <div className="border border-gray-700 rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[28px_1fr_78px_68px_130px] gap-2 px-3 py-2.5 border-b border-gray-700 bg-gray-800/80 shrink-0">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={e => setRows(r => r.map(x => ({ ...x, selected: e.target.checked })))}
                    className="w-4 h-4 accent-violet-500 self-center"
                  />
                  {['Nombre *', 'Precio (€)', 'Dur. (min)', 'Categoría'].map(h => (
                    <span key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </span>
                  ))}
                </div>

                {/* Table rows */}
                <div className="divide-y divide-gray-700/60 overflow-y-auto max-h-64">
                  {rows.map((row, i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-[28px_1fr_78px_68px_130px] gap-2 px-3 py-2 items-center transition-colors ${
                        row.isDuplicate
                          ? 'bg-yellow-900/20 border-l-2 border-yellow-500/60'
                          : 'hover:bg-gray-800/40'
                      } ${!row.selected ? 'opacity-40' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={e => updateRow(i, { selected: e.target.checked })}
                        className="w-4 h-4 accent-violet-500 self-center"
                      />
                      <input
                        value={row.name}
                        onChange={e => updateRow(i, { name: e.target.value })}
                        className={CELL}
                        placeholder="Nombre"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.price}
                        onChange={e => updateRow(i, { price: e.target.value })}
                        className={CELL}
                        placeholder="—"
                      />
                      <input
                        type="number"
                        min="1"
                        value={row.duration_minutes}
                        onChange={e => updateRow(i, { duration_minutes: e.target.value })}
                        className={CELL}
                        placeholder="—"
                      />
                      <input
                        value={row.category}
                        onChange={e => updateRow(i, { category: e.target.value })}
                        className={CELL}
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-600">
                * El nombre es obligatorio. Las filas sin nombre no se importarán.
              </p>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Guardando tratamientos…</p>
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && result && (
            <div className="space-y-4">
              {(result.inserted > 0 || result.updated > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {result.inserted > 0 && (
                    <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-5">
                      <p className="text-2xl font-bold text-green-400">{result.inserted}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        tratamiento{result.inserted !== 1 ? 's' : ''} creado{result.inserted !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  {result.updated > 0 && (
                    <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-5">
                      <p className="text-2xl font-bold text-blue-400">{result.updated}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        tratamiento{result.updated !== 1 ? 's' : ''} actualizado{result.updated !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {result.inserted === 0 && result.updated === 0 && result.errors.length === 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <p className="text-sm text-gray-400">No se realizaron cambios.</p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-red-400">
                    {result.errors.length} error{result.errors.length !== 1 ? 'es' : ''}
                  </p>
                  <ul className="space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-400/80">
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700 shrink-0">
          {step === 'upload' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcess}
                disabled={!file}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Procesar archivo
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setRows([]) }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Volver
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Importar seleccionados ({selectedCount})
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
