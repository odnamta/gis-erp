import { getPPEInventory, getPPETypes } from '@/lib/ppe-actions';
import { InventoryTable } from '@/components/ppe/inventory-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PPEInventoryPage() {
  const [inventory, ppeTypes] = await Promise.all([
    getPPEInventory(),
    getPPETypes(),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventaris PPE</h1>
        <p className="text-muted-foreground">
          Pantau stok dan catat pembelian Alat Pelindung Diri (APD).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Level Stok</CardTitle>
          <CardDescription>
            Pantau jumlah inventaris dan peringatan reorder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryTable inventory={inventory} ppeTypes={ppeTypes} />
        </CardContent>
      </Card>
    </div>
  );
}
