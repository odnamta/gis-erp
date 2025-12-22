'use client';

// Engineering Drawings List Page
// Main page for drawing register management

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DrawingStatusCards } from '@/components/drawings/drawing-status-cards';
import { DrawingList } from '@/components/drawings/drawing-list';
import { getDrawings, getCategories } from '@/lib/drawing-actions';
import { createClient } from '@/lib/supabase/client';
import {
  DrawingWithDetails,
  DrawingCategory,
  DrawingFilters,
  DrawingStatus,
} from '@/types/drawing';
import { getDrawingStatusCounts } from '@/lib/drawing-utils';

interface Project {
  id: string;
  name: string;
}

export default function DrawingsPage() {
  const [drawings, setDrawings] = useState<DrawingWithDetails[]>([]);
  const [categories, setCategories] = useState<DrawingCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState<DrawingFilters>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadDrawings();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      const [categoriesData, projectsData] = await Promise.all([
        getCategories(),
        loadProjects(),
      ]);
      setCategories(categoriesData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadProjects = async (): Promise<Project[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('name');
    return data || [];
  };

  const loadDrawings = async () => {
    setLoading(true);
    try {
      const data = await getDrawings(filters);
      setDrawings(data);
    } catch (error) {
      console.error('Error loading drawings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (status: DrawingStatus | null) => {
    setFilters((prev) => ({
      ...prev,
      status: status || undefined,
    }));
  };

  const statusCounts = getDrawingStatusCounts(drawings);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Engineering Drawings</h1>
          <p className="text-muted-foreground">
            Manage CAD files, revisions, and drawing distribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/engineering/drawings/transmittals">
              Transmittals
            </Link>
          </Button>
          <Button asChild>
            <Link href="/engineering/drawings/new">
              <Plus className="h-4 w-4 mr-2" />
              New Drawing
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <DrawingStatusCards
        counts={statusCounts}
        onStatusClick={handleStatusClick}
        selectedStatus={filters.status || null}
      />

      {/* Drawing List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DrawingList
          drawings={drawings}
          categories={categories}
          projects={projects}
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}
    </div>
  );
}
