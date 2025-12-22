import { CourseForm } from '@/components/training/course-form';

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tambah Kursus Baru</h1>
        <p className="text-muted-foreground">
          Buat kursus pelatihan keselamatan kerja baru
        </p>
      </div>

      <CourseForm />
    </div>
  );
}
