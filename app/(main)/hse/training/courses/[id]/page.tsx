import { notFound } from 'next/navigation';
import { getCourseById } from '@/lib/training-actions';
import { CourseForm } from '@/components/training/course-form';

interface CourseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params;
  const course = await getCourseById(id);

  if (!course) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Kursus</h1>
        <p className="text-muted-foreground">
          {course.courseCode} - {course.courseName}
        </p>
      </div>

      <CourseForm course={course} />
    </div>
  );
}
