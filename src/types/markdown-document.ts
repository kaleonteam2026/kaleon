export interface MarkdownDocument {
  id: number;
  title?: string;
  contentMarkdown?: string;
  profileId?: number;
  createdAt?: string;
}

export type Guidebook = MarkdownDocument;
export type AcademicRoadmap = MarkdownDocument;
