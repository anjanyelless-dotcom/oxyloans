import { EvaluationInput, QualityScores, ValidationIssues } from '../../src/services/evaluation/evaluation.types';

export interface BenchmarkTestCase {
  id: string;
  category: string;
  question: string;
  experienceYears: number;
  round: string;
  resumeSkills: string[];
  resumeProjects: string[];
  resumeCompanies: string[];
  jdSkills: string[];
  rawAnswer: string;
}

export interface BenchmarkCategoryMetrics {
  category: string;
  testCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  totalTokens: number;
  avgTokens: number;
  avgQualityScore: number;
  avgGroundingScore: number;
  avgConversationConsistency: number;
  hallucinatedCount: number;
  hallucinationRate: number; // percentage
  contradictionCount: number;
  technicalErrorCount: number;
}

export interface BenchmarkAggregates {
  totalTests: number;
  overallAverageLatencyMs: number;
  overallMaxLatencyMs: number;
  overallTotalTokens: number;
  overallAverageTokens: number;
  overallAverageQualityScore: number;
  overallAverageGroundingScore: number;
  overallAverageConversationConsistency: number;
  overallHallucinationRate: number;
  overallContradictionCount: number;
  overallTechnicalErrorCount: number;
  categoryMetrics: Record<string, BenchmarkCategoryMetrics>;
}
