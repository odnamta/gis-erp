'use client'

import { useRouter } from 'next/navigation'
import { Combobox } from '@/components/forms/combobox'

interface JOSelectorProps {
  jobOrders: { id: string; jo_number: string; customer_name: string; description: string | null }[]
}

export function JOSelector({ jobOrders }: JOSelectorProps) {
  const router = useRouter()

  const options = jobOrders.map((jo) => ({
    value: jo.id,
    label: `${jo.jo_number} — ${jo.customer_name}${jo.description ? ` (${jo.description})` : ''}`,
  }))

  return (
    <Combobox
      options={options}
      onSelect={(joId) => {
        if (joId) {
          router.push(`/invoices/new?joId=${joId}`)
        }
      }}
      placeholder="Pilih Job Order..."
      searchPlaceholder="Cari nomor JO atau customer..."
      emptyText="Tidak ada Job Order yang bisa diinvoice."
    />
  )
}
