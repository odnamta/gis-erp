'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CourseList } from '@/components/training/course-list';
import { TrainingCourse, TrainingType, CourseFilters } from '@/types/training';
import { getCourses } from '@/lib/training-actions';
import { Plus, Search, Loader2 } from 'lucide-react';

const TRAINING_TYPES: { value: TrainingType | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Jenis' },
  { value: 'induction', label: 'Induksi' },
  { value: 'refresher', label: 'Penyegaran' },
  { value: 'specialized', label: 'Khusus' },
  { value: 'certification', label: 'Sertifikasi' },
  { value: 'toolbox', label: 'Toolbox Talk' },
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [trainingType, setTrainingType] = useState<TrainingType | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [trainingType, showInactive]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const filters: CourseFilters = {};
      if (trainingType !== 'all') {
        filters.trainingType = trainingType;
      }
      if (!showInactive) {
        filters.isActive = true;
      }
      const data = await getCourses(filters);
      setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      course.courseCode.toLowerCase().includes(searchLower) ||
      course.courseName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daftar Kursus Pelatihan</h1>
          <p className="text-muted-foreground">
            Kelola kursus pelatihan keselamatan kerja
          </p>
        </div>
        <Link href="/hse/training/courses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Kursus
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari kode atau nama kursus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={trainingType}
          onValueChange={(value) => setTrainingType(value as TrainingType | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRAINING_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showInactive ? 'secondary' : 'outline'}
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? 'Sembunyikan Nonaktif' : 'Tampilkan Nonaktif'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CourseList courses={filteredCourses} onRefresh={loadCourses} />
      )}
    </div>
  );
}
