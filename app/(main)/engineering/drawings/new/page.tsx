'use client';

// New Drawing Page
// Create a new engineering drawing

import { DrawingForm } from '@/components/drawings/drawing-form';

export default function NewDrawingPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Drawing</h1>
        <p className="text-muted-foreground">
          Create a new engineering drawing entry
        </p>
      </div>

      <DrawingForm mode="create" />
    </div>
  );
}
