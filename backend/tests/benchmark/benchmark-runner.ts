import * as path from 'path';
import { generateBenchmarkDataset } from './questions-dataset';
import { AnswerStrategyService } from '../../src/services/answer-strategy/answer-strategy.service';
import { EvaluationService } from '../../src/services/evaluation/evaluation.service';
import { estimateTokens } from '../../src/services/ai/ai.utils';
import { BenchmarkAggregates, BenchmarkCategoryMetrics, BenchmarkTestCase } from './benchmark.types';
import { ReportGenerator } from './report-generator';

async function runBenchmark() {
  console.log('======================================================');
  console.log('AI Mock Interview Coach - Launching Benchmark System');
  console.log('======================================================\n');

  const dataset = generateBenchmarkDataset();
  console.log(`Loaded dataset of ${dataset.length} scenarios across 18 categories.\n`);

  // Initialize category trackers
  const categoryMetricsMap: Record<string, BenchmarkCategoryMetrics> = {};
  
  let overallMaxLatency = 0;
  let overallTotalLatency = 0;
  let overallTotalTokens = 0;
  let overallTotalQuality = 0;
  let overallTotalGrounding = 0;
  let overallTotalConsistency = 0;
  let overallTotalHallucinations = 0;
  let overallTotalContradictions = 0;
  let overallTotalTechErrors = 0;

  console.log('Processing benchmark scenarios... (This runs in-process)');

  const startTime = Date.now();

  for (const tc of dataset) {
    if (!categoryMetricsMap[tc.category]) {
      categoryMetricsMap[tc.category] = {
        category: tc.category,
        testCount: 0,
        totalLatencyMs: 0,
        avgLatencyMs: 0,
        maxLatencyMs: 0,
        totalTokens: 0,
        avgTokens: 0,
        avgQualityScore: 0,
        avgGroundingScore: 0,
        avgConversationConsistency: 0,
        hallucinatedCount: 0,
        hallucinationRate: 0,
        contradictionCount: 0,
        technicalErrorCount: 0
      };
    }

    const metrics = categoryMetricsMap[tc.category];
    metrics.testCount++;

    // 1. Run Answer Strategy Engine
    const strategyInput = {
      candidateProfile: {
        name: tc.id,
        experienceYears: tc.experienceYears,
        currentCompany: tc.resumeCompanies[0] || null,
        previousCompany: tc.resumeCompanies[1] || null
      } as any,
      targetRound: tc.round,
      resumeIntelligence: {
        projects: tc.resumeProjects,
        skills: tc.resumeSkills,
        companies: tc.resumeCompanies,
        frameworks: [],
        libraries: [],
        cloud: [],
        databases: [],
        achievements: [],
        responsibilities: [],
        leadership: []
      },
      jobDescriptionIntelligence: {
        requiredSkills: tc.jdSkills,
        preferredSkills: [],
        mustHave: [],
        responsibilities: [],
        seniority: '',
        domain: '',
        keywords: []
      },
      currentQuestion: tc.question
    };

    const caseStart = performance.now();
    const strategyObj = AnswerStrategyService.generateStrategy(strategyInput);
    const strategyLatency = performance.now() - caseStart;

    // 2. Run Answer Evaluation Engine
    const evalInput = {
      currentQuestion: tc.question,
      candidateProfile: strategyInput.candidateProfile,
      resumeIntelligence: strategyInput.resumeIntelligence,
      jobDescriptionIntelligence: strategyInput.jobDescriptionIntelligence,
      strategyObject: strategyObj,
      rawAnswer: tc.rawAnswer,
      conversationHistory: []
    };

    const evalStart = performance.now();
    const evalResult = EvaluationService.evaluateAnswer(evalInput);
    const evalLatency = performance.now() - evalStart;

    const totalCaseLatency = strategyLatency + evalLatency;
    
    // Aggregate category fields
    metrics.totalLatencyMs += totalCaseLatency;
    if (totalCaseLatency > metrics.maxLatencyMs) {
      metrics.maxLatencyMs = totalCaseLatency;
    }
    if (totalCaseLatency > overallMaxLatency) {
      overallMaxLatency = totalCaseLatency;
    }

    const tokenEstimate = estimateTokens(evalResult.finalAnswer);
    metrics.totalTokens += tokenEstimate;

    // Aggregate quality scores
    metrics.avgQualityScore += evalResult.qualityScore.naturalness;
    metrics.avgGroundingScore += evalResult.qualityScore.resumeConsistency;
    metrics.avgConversationConsistency += evalResult.qualityScore.conversationConsistency;

    // Aggregate issues
    const hasHallucinations = evalResult.evaluation.issues.fakeProjects.length > 0 || 
                              evalResult.evaluation.issues.fakeCompanies.length > 0 ||
                              evalResult.evaluation.issues.fakeTechnologies.length > 0;
    
    if (hasHallucinations) {
      metrics.hallucinatedCount++;
      overallTotalHallucinations++;
    }

    const techErrCount = evalResult.evaluation.issues.technicalErrors.length;
    metrics.technicalErrorCount += techErrCount;
    overallTotalTechErrors += techErrCount;

    const contraCount = evalResult.evaluation.issues.contradictions.length;
    metrics.contradictionCount += contraCount;
    overallTotalContradictions += contraCount;

    // Aggregate overall metrics
    overallTotalLatency += totalCaseLatency;
    overallTotalTokens += tokenEstimate;
    overallTotalQuality += evalResult.qualityScore.naturalness;
    overallTotalGrounding += evalResult.qualityScore.resumeConsistency;
    overallTotalConsistency += evalResult.qualityScore.conversationConsistency;
  }

  const duration = Date.now() - startTime;
  console.log(`Processing complete. Finished ${dataset.length} cases in ${duration}ms.\n`);

  // Final calculations
  const totalCount = dataset.length;
  
  // Finalize Category metrics
  for (const catName of Object.keys(categoryMetricsMap)) {
    const cat = categoryMetricsMap[catName];
    cat.avgLatencyMs = cat.totalLatencyMs / cat.testCount;
    cat.avgTokens = cat.totalTokens / cat.testCount;
    cat.avgQualityScore = cat.avgQualityScore / cat.testCount;
    cat.avgGroundingScore = cat.avgGroundingScore / cat.testCount;
    cat.avgConversationConsistency = cat.avgConversationConsistency / cat.testCount;
    cat.hallucinationRate = (cat.hallucinatedCount / cat.testCount) * 100;
  }

  const aggregates: BenchmarkAggregates = {
    totalTests: totalCount,
    overallAverageLatencyMs: overallTotalLatency / totalCount,
    overallMaxLatencyMs: overallMaxLatency,
    overallTotalTokens: overallTotalTokens,
    overallAverageTokens: overallTotalTokens / totalCount,
    overallAverageQualityScore: overallTotalQuality / totalCount,
    overallAverageGroundingScore: overallTotalGrounding / totalCount,
    overallAverageConversationConsistency: overallTotalConsistency / totalCount,
    overallHallucinationRate: (overallTotalHallucinations / totalCount) * 100,
    overallContradictionCount: overallTotalContradictions,
    overallTechnicalErrorCount: overallTotalTechErrors,
    categoryMetrics: categoryMetricsMap
  };

  const reportPath = path.join(__dirname, 'benchmark_report.md');
  ReportGenerator.generateReport(aggregates, reportPath);

  console.log('======================================================');
  console.log('Benchmark execution successful!');
  console.log(`Aggregate Latency: ${(aggregates.overallAverageLatencyMs).toFixed(3)}ms`);
  console.log(`Overall Quality Score: ${(aggregates.overallAverageQualityScore).toFixed(1)} / 100`);
  console.log(`Overall Hallucination Rate: ${(aggregates.overallHallucinationRate).toFixed(1)}%`);
  console.log(`Report written to: ${reportPath}`);
  console.log('======================================================\n');
}

runBenchmark().catch(err => {
  console.error('Benchmark suite execution failed:', err);
  process.exit(1);
});
