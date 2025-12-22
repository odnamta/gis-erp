'use client';

// New Transmittal Page
// Create a new drawing transmittal

import { TransmittalForm } from '@/components/drawings/transmittal-form';

export default function NewTransmittalPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Transmittal</h1>
        <p className="text-muted-foreground">
          Create a new drawing transmittal for distribution
        </p>
      </div>

      <TransmittalForm />
    </div>
  );
}
