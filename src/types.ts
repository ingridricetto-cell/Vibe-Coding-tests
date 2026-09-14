export type Language = 'pt' | 'en' | 'es';

export interface ExtractedData {
  stakeholders: string;
  terms: string;
  dates: string;
  nextSteps: string;
}

export interface AppState {
  step: number;
  transcript: string;
  extractedData: ExtractedData;
  language: Language;
  email: string;
  risks: string;
  report: string;
  finalReport: string;
  isLoading: boolean;
  error: string | null;
}
