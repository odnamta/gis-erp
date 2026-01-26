/**
 * FAQ Search Unit Tests
 * v0.38.1: Help Center Enhancement
 */

import { describe, it, expect } from 'vitest';
import { filterFAQsByQuery } from '@/components/help-center/faq-search';
import { HelpFAQ } from '@/types/help-center';

// Sample FAQ data for testing
const sampleFaqs: HelpFAQ[] = [
  {
    id: '1',
    question: 'Bagaimana cara login ke sistem?',
    answer: 'Buka halaman login di /login, masukkan email dan password Anda.',
    category: 'getting_started',
    applicableRoles: [],
    displayOrder: 1,
    createdAt: '2026-01-26T00:00:00Z',
  },
  {
    id: '2',
    question: 'Bagaimana cara membuat PJO baru?',
    answer: 'Buka menu Proforma JO, klik "Buat PJO Baru".',
    category: 'jobs',
    applicableRoles: [],
    displayOrder: 1,
    createdAt: '2026-01-26T00:00:00Z',
  },
  {
    id: '3',
    question: 'Bagaimana cara membuat invoice?',
    answer: 'Buka Job Order yang sudah selesai dan klik "Buat Invoice".',
    category: 'finance',
    applicableRoles: ['finance', 'finance_manager'],
    displayOrder: 1,
    createdAt: '2026-01-26T00:00:00Z',
  },
  {
    id: '4',
    question: 'Sistem terasa lambat, apa yang harus dilakukan?',
    answer: 'Coba refresh halaman dengan menekan Ctrl+R atau F5.',
    category: 'troubleshooting',
    applicableRoles: [],
    displayOrder: 1,
    createdAt: '2026-01-26T00:00:00Z',
  },
];

describe('filterFAQsByQuery', () => {
  describe('empty query handling', () => {
    it('should return all FAQs when query is empty', () => {
      const result = filterFAQsByQuery(sampleFaqs, '');
      expect(result).toHaveLength(sampleFaqs.length);
      expect(result).toEqual(sampleFaqs);
    });

    it('should return all FAQs when query is whitespace only', () => {
      const result = filterFAQsByQuery(sampleFaqs, '   ');
      expect(result).toHaveLength(sampleFaqs.length);
    });
  });

  describe('question matching', () => {
    it('should filter FAQs by matching question text', () => {
      const result = filterFAQsByQuery(sampleFaqs, 'login');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should be case-insensitive when matching questions', () => {
      const result = filterFAQsByQuery(sampleFaqs, 'LOGIN');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should match partial words in questions', () => {
      const result = filterFAQsByQuery(sampleFaqs, 'PJO');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('answer matching', () => {
    it('should filter FAQs by matching answer text', () => {
      const result = filterFAQsByQuery(sampleFaqs, 'refresh');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('4');
    });

    it('should be case-insensitive when matching answers', () => {
      const result = filterFAQsByQuery(sampleFaqs, 'REFRESH');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('4');
    });
  });

  describe('combined matching', () => {
    it('should return FAQs matching either question or answer', () => {
      // "Buat" appears in multiple FAQs
      const result = filterFAQsByQuery(sampleFaqs, 'Buat');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should return multiple FAQs when query matches multiple items', () => {
      // "cara" appears in multiple questions
      const result = filterFAQsByQuery(sampleFaqs, 'cara');
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('no results', () => {
    it('should return empty array when no FAQs match', () => {
      const result = filterFAQsByQuery(sampleFaqs, 'xyz123nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty FAQ array', () => {
      const result = filterFAQsByQuery([], 'login');
      expect(result).toHaveLength(0);
    });

    it('should trim query before matching', () => {
      const result = filterFAQsByQuery(sampleFaqs, '  login  ');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should handle special characters in query', () => {
      const result = filterFAQsByQuery(sampleFaqs, '/login');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });
});

describe('FAQ Search Component Behavior', () => {
  describe('results count', () => {
    it('should show correct count when filtering', () => {
      const result = filterFAQsByQuery(sampleFaqs, 'invoice');
      expect(result).toHaveLength(1);
    });
  });

  describe('category preservation', () => {
    it('should preserve category information in filtered results', () => {
      const result = filterFAQsByQuery(sampleFaqs, 'login');
      expect(result[0].category).toBe('getting_started');
    });

    it('should preserve all FAQ properties in filtered results', () => {
      const result = filterFAQsByQuery(sampleFaqs, 'invoice');
      const faq = result[0];
      expect(faq).toHaveProperty('id');
      expect(faq).toHaveProperty('question');
      expect(faq).toHaveProperty('answer');
      expect(faq).toHaveProperty('category');
      expect(faq).toHaveProperty('applicableRoles');
      expect(faq).toHaveProperty('displayOrder');
      expect(faq).toHaveProperty('createdAt');
    });
  });
});
