import { CostingClient } from './costing-client';

export const metadata = {
  title: 'Equipment Costing | Gama ERP',
  description: 'Track equipment depreciation and Total Cost of Ownership',
};

export default function CostingPage() {
  return <CostingClient />;
}
