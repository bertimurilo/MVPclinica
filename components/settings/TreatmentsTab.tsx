'use client'

import { useState, useTransition } from 'react'
import { saveTreatment, deleteTreatment } from '@/app/(dashboard)/settings/actions'
import { ImportTreatmentsModal } from './ImportTreatmentsModal'
import type { Treatment } from '@/lib/types'

type EditState = {
  id: string | null
  name: string
  description: string
  price: string
  duration_minutes: string
  category: string
  active: boolean
}

const BLANK: EditState = {
  id: null, name: '', description: '', price: '', duration_minutes: '', category: '', active: true,
}

export function TreatmentsTab({ treatments }: { treatments: Treatment[] }) {
  const [editing, setEditing] = useState<EditState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showImport, setShowImport] = useState(false)

  const startEdit = (t: Treatment) => setEditing({
    id: t.id,
    name: t.name,
    description: t.description ?? '',
    price: t.price?.toString() ?? '',
    duration_minutes: t.duration_minutes?.toString() ?? '',
    category: t.category ?? '',
    active: t.active,
  })

  const handleSave = () => {
    if (!editing || !editing.name.trim()) return
    const fd = new FormData()
    if (editing.id) fd.set('id', editing.id)
    fd.set('name', editing.name)
    fd.set('description', editing.description)
    fd.set('price', editing.price)
    fd.set('duration_minutes', editing.duration_minutes)
    fd.set('category', editing.category)
    fd.set('active', editing.active ? 'true' : 'false')
    startTransition(async () => {
      await saveTreatment(fd)
      setEditing(null)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTreatment(id)
      setDeleteConfirm(null)
    })
  }

  const isAddingNew = editing?.id === null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{treatments.length} tratamiento{treatments.length !== 1 ? 's' : ''}</p>
        {!editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Importar
            </button>
            <button
              onClick={() => setEditing(BLANK)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Añadir tratamiento
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_80px_80px_120px_60px_100px] gap-3 px-4 py-2.5 border-b border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span>Nombre</span>
          <span>Precio</span>
          <span>Duración</span>
          <span>Categoría</span>
          <span>Activo</span>
          <span className="text-right">Acciones</span>
        </div>

        {/* Empty state */}
        {treatments.length === 0 && !isAddingNew && (
          <div className="px-4 py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 font-medium">Sin tratamientos</p>
            <p className="text-xs text-gray-600 mt-1">Añade los servicios que ofrece tu clínica</p>
            <button
              onClick={() => setEditing(BLANK)}
              className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              Añadir primer tratamiento
            </button>
          </div>
        )}

        {/* Rows */}
        <div className="divide-y divide-gray-700/60">
          {treatments.map(t => {
            const isEditing = editing?.id === t.id
            const isDeleting = deleteConfirm === t.id

            if (isEditing) {
              return <EditRow key={t.id} state={editing!} onChange={setEditing} onSave={handleSave} onCancel={() => setEditing(null)} pending={isPending} />
            }

            return (
              <div key={t.id} className="grid grid-cols-[1fr_80px_80px_120px_60px_100px] gap-3 px-4 py-3.5 items-center hover:bg-gray-700/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{t.description}</p>}
                </div>
                <span className="text-sm text-gray-300">{t.price != null ? `${t.price}€` : '—'}</span>
                <span className="text-sm text-gray-300">{t.duration_minutes != null ? `${t.duration_minutes}m` : '—'}</span>
                <span className="text-sm text-gray-400 truncate">{t.category || '—'}</span>
                <span className={`text-xs font-medium ${t.active ? 'text-violet-400' : 'text-gray-600'}`}>
                  {t.active ? 'Sí' : 'No'}
                </span>
                <div className="flex items-center gap-2 justify-end">
                  {isDeleting ? (
                    <>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={isPending}
                        className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                      >
                        {isPending ? '...' : 'Sí, borrar'}
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:text-gray-300">No</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setDeleteConfirm(null); startEdit(t) }}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(t.id)}
                        className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                      >
                        Borrar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* New row */}
          {isAddingNew && (
            <EditRow state={editing!} onChange={setEditing} onSave={handleSave} onCancel={() => setEditing(null)} pending={isPending} isNew />
          )}
        </div>
      </div>

      {showImport && (
        <ImportTreatmentsModal
          existingTreatments={treatments}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

const INPUT_CLS =
  'w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all'

function EditRow({
  state,
  onChange,
  onSave,
  onCancel,
  pending,
  isNew,
}: {
  state: EditState
  onChange: (s: EditState) => void
  onSave: () => void
  onCancel: () => void
  pending: boolean
  isNew?: boolean
}) {
  const set = (key: keyof EditState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...state, [key]: e.target.value })

  return (
    <div className="px-4 py-3 space-y-3 bg-gray-800/60">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre *">
          <input
            value={state.name}
            onChange={set('name')}
            placeholder="Ej: Botox facial"
            className={INPUT_CLS}
            autoFocus
          />
        </Field>
        <Field label="Categoría">
          <input value={state.category} onChange={set('category')} placeholder="Ej: Medicina estética" className={INPUT_CLS} />
        </Field>
        <Field label="Descripción">
          <input value={state.description} onChange={set('description')} placeholder="Breve descripción del tratamiento" className={INPUT_CLS} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio (€)">
            <input value={state.price} onChange={set('price')} type="number" min="0.01" step="0.01" placeholder="350" className={INPUT_CLS} />
          </Field>
          <Field label="Duración (min)">
            <input value={state.duration_minutes} onChange={set('duration_minutes')} type="number" min="0" placeholder="45" className={INPUT_CLS} />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={state.active}
            onChange={e => onChange({ ...state, active: e.target.checked })}
            className="sr-only peer"
          />
          <span className="relative w-9 h-5 bg-gray-700 peer-checked:bg-violet-600 rounded-full transition-colors block shrink-0 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-transform peer-checked:after:translate-x-4" />
          <span className="text-sm text-gray-400">Activo</span>
        </label>

        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={pending || !state.name.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {pending && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isNew ? 'Crear' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
