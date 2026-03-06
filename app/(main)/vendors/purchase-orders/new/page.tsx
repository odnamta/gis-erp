'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createPurchaseOrder } from '@/lib/purchase-order-actions';
import { POLineItem } from '@/types/purchase-order';
import { formatCurrency } from '@/lib/utils/format';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';

interface LineItemForm {
  item_description: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

const emptyLineItem: LineItemForm = {
  item_description: '',
  quantity: '1',
  unit: 'pcs',
  unit_price: '0',
};

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<{ id: string; vendor_name: string; contact_person: string | null }[]>([]);

  const [formData, setFormData] = useState({
    vendor_id: '',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    delivery_address: '',
    payment_terms: '',
    notes: '',
  });

  const [lineItems, setLineItems] = useState<LineItemForm[]>([{ ...emptyLineItem }]);

  useEffect(() => {
    async function loadVendors() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase
          .from('vendors' as never)
          .select('id, vendor_name, contact_person')
          .eq('is_active', true)
          .order('vendor_name');
        setVendors((data as { id: string; vendor_name: string; contact_person: string | null }[] | null) || []);
      } catch (err) {
        console.error('Failed to load vendors:', err);
      }
    }
    loadVendors();
  }, []);

  function addLineItem() {
    setLineItems((prev) => [...prev, { ...emptyLineItem }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItemForm, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function getLineTotal(item: LineItemForm): number {
    return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  }

  const subtotal = lineItems.reduce((sum, item) => sum + getLineTotal(item), 0);
  const taxAmount = Math.round(subtotal * 0.11);
  const totalAmount = subtotal + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const items: Omit<POLineItem, 'id' | 'po_id'>[] = lineItems.map((item, idx) => ({
      item_description: item.item_description,
      quantity: parseFloat(item.quantity) || 0,
      unit: item.unit || 'pcs',
      unit_price: parseFloat(item.unit_price) || 0,
      total_price: getLineTotal(item),
      notes: null,
      sort_order: idx,
    }));

    const result = await createPurchaseOrder({
      vendor_id: formData.vendor_id,
      order_date: formData.order_date,
      delivery_date: formData.delivery_date || undefined,
      delivery_address: formData.delivery_address || undefined,
      payment_terms: formData.payment_terms || undefined,
      notes: formData.notes || undefined,
      line_items: items,
    });

    setLoading(false);

    if (result.success) {
      router.push('/vendors/purchase-orders');
    } else {
      setError(result.error || 'Gagal membuat Purchase Order');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/vendors/purchase-orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Purchase Order</h1>
          <p className="text-muted-foreground">Isi detail PO dan item pesanan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Detail PO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(v) => setFormData((p) => ({ ...p, vendor_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal Order *</Label>
                <Input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData((p) => ({ ...p, order_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tanggal Pengiriman</Label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData((p) => ({ ...p, delivery_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Syarat Pembayaran</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData((p) => ({ ...p, payment_terms: e.target.value }))}
                  placeholder="Contoh: Net 30 hari"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat Pengiriman</Label>
              <Textarea
                value={formData.delivery_address}
                onChange={(e) => setFormData((p) => ({ ...p, delivery_address: e.target.value }))}
                placeholder="Alamat tujuan pengiriman"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Catatan tambahan (opsional)"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Item Pesanan</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Deskripsi</TableHead>
                  <TableHead className="w-[10%]">Qty</TableHead>
                  <TableHead className="w-[10%]">Satuan</TableHead>
                  <TableHead className="w-[20%]">Harga Satuan</TableHead>
                  <TableHead className="w-[15%] text-right">Total</TableHead>
                  <TableHead className="w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={item.item_description}
                        onChange={(e) => updateLineItem(index, 'item_description', e.target.value)}
                        placeholder="Deskripsi item"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                        placeholder="pcs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                        min="0"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(getLineTotal(item))}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>PPN 11%</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan sebagai Draft
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/vendors/purchase-orders">Batal</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
