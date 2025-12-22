'use client';

import { TrainingCourse } from '@/types/training';
import { CourseCard } from './course-card';

interface CourseListProps {
  courses: TrainingCourse[];
}

export function CourseList({ courses }: CourseListProps) {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Tidak ada kursus ditemukan
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
