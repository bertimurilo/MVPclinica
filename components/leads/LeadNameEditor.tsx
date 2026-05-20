'use client'

import { useState } from 'react'
import { updateLeadName } from '@/lib/actions'

export function LeadNameEditor({
  leadId,
  initialName,
}: {
  leadId: string
  initialName: string | null
}) {
  const [name, setName] = useState(initialName ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (trimmed === (initialName ?? '')) return
    setSaving(true)
    try {
      await updateLeadName(leadId, trimmed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      className="font-semibold text-white bg-transparent border-b border-transparent hover:border-gray-600 focus:border-violet-500 focus:outline-none w-full truncate transition-colors disabled:opacity-50"
      value={name}
      placeholder="Sin nombre — editar"
      onChange={e => setName(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      disabled={saving}
    />
  )
}
