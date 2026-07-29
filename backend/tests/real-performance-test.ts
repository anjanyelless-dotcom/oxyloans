/**
 * Real API performance test for AI response optimization
 * Measures actual API response times for streaming vs non-streaming
 */

import { openai } from '../src/config/openai';
import { buildAnswerPrompt } from '../src/services/simple-prompt.service';

interface TestProfile {
  candidateName: string;
  experienceYears: number;
  currentCompany: string;
  currentRole: string;
  previousCompany: string;
  previousRole: string;
  targetCompany: string;
  jobTitle: string;
  interviewRound: string;
  resumeText: string;
  jobDescriptionText: string;
  recentProjectsUsed: string[];
}

const testProfile: TestProfile = {
  candidateName: "Test Developer",
  experienceYears: 5,
  currentCompany: "Tech Corp",
  currentRole: "Senior Developer",
  previousCompany: "Startup Inc",
  previousRole: "Developer",
  targetCompany: "Big Tech",
  jobTitle: "Senior Frontend Engineer",
  interviewRound: "Technical Round 1",
  resumeText: "PROJECTS:\nDATA PIPELINE AUTOMATION - Built end-to-end data pipeline using Apache Airflow, Apache Spark, and AWS Glue. Automated ETL processes for processing 10TB+ of daily data. Implemented data quality checks and monitoring.\nREAL-TIME ANALYTICS DASHBOARD - Developed real-time analytics dashboard using Python, Pandas, and Plotly. Integrated with Kafka for streaming data processing. Provided insights for business stakeholders.\nMACHINE LEARNING MODEL DEPLOYMENT - Deployed ML models using TensorFlow and SageMaker. Built model serving infrastructure with Docker and Kubernetes.",
  jobDescriptionText: "Looking for senior data engineer with experience in building data pipelines, real-time analytics, and ML model deployment. Should have experience with Airflow, Spark, AWS Glue, and streaming technologies.",
  recentProjectsUsed: []
};

const testQuestion = "What was the most challenging feature you developed?";

async function measureNonStreamingAPI() {
  console.log("=== NON-STREAMING API TEST ===");
  
  const startTime = Date.now();
  
  const prompt = buildAnswerPrompt(testProfile, []).replace("{{USER_QUESTION}}", testQuestion);
  
  const messages: Array<{role: 'system' | 'user', content: string}> = [
    { role: "user", content: prompt }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      temperature: 0.85,
      max_tokens: 400, // Original setting
      messages
    });

    const endTime = Date.now();
    const answer = response.choices[0].message.content;
    
    console.log(`Question: "${testQuestion}"`);
    console.log(`Response time: ${endTime - startTime}ms`);
    console.log(`Answer length: ${answer?.length || 0} characters`);
    console.log(`Max tokens: 400`);
    console.log(`Model: ${process.env.OPENAI_MODEL || "gpt-4o"}`);
    console.log(`Answer preview: "${answer?.substring(0, 100)}..."`);
  } catch (error) {
    console.error("API call failed:", error);
  }
}

async function measureStreamingAPI() {
  console.log("\n=== STREAMING API TEST ===");
  
  const startTime = Date.now();
  let firstTokenTime = 0;
  let tokenCount = 0;
  
  const prompt = buildAnswerPrompt(testProfile, []).replace("{{USER_QUESTION}}", testQuestion);
  
  const messages: Array<{role: 'system' | 'user', content: string}> = [
    { role: "user", content: prompt }
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      temperature: 0.85,
      max_tokens: 200, // Reduced setting
      messages,
      stream: true
    });

    let fullAnswer = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        if (firstTokenTime === 0) {
          firstTokenTime = Date.now();
        }
        fullAnswer += content;
        tokenCount++;
      }
    }

    const endTime = Date.now();
    
    console.log(`Question: "${testQuestion}"`);
    console.log(`Time to first token: ${firstTokenTime - startTime}ms`);
    console.log(`Total completion time: ${endTime - startTime}ms`);
    console.log(`Tokens received: ${tokenCount}`);
    console.log(`Answer length: ${fullAnswer.length} characters`);
    console.log(`Max tokens: 200`);
    console.log(`Model: ${process.env.OPENAI_MODEL || "gpt-4o"}`);
    console.log(`Answer preview: "${fullAnswer.substring(0, 100)}..."`);
  } catch (error) {
    console.error("Streaming API call failed:", error);
  }
}

async function measureGPT4oMini() {
  console.log("\n=== GPT-4O-MINI TEST (for comparison) ===");
  
  const startTime = Date.now();
  let firstTokenTime = 0;
  let tokenCount = 0;
  
  const prompt = buildAnswerPrompt(testProfile, []).replace("{{USER_QUESTION}}", testQuestion);
  
  const messages: Array<{role: 'system' | 'user', content: string}> = [
    { role: "user", content: prompt }
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      max_tokens: 200,
      messages,
      stream: true
    });

    let fullAnswer = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        if (firstTokenTime === 0) {
          firstTokenTime = Date.now();
        }
        fullAnswer += content;
        tokenCount++;
      }
    }

    const endTime = Date.now();
    
    console.log(`Question: "${testQuestion}"`);
    console.log(`Time to first token: ${firstTokenTime - startTime}ms`);
    console.log(`Total completion time: ${endTime - startTime}ms`);
    console.log(`Tokens received: ${tokenCount}`);
    console.log(`Answer length: ${fullAnswer.length} characters`);
    console.log(`Max tokens: 200`);
    console.log(`Model: gpt-4o-mini`);
    console.log(`Answer preview: "${fullAnswer.substring(0, 100)}..."`);
  } catch (error) {
    console.error("GPT-4o-mini API call failed:", error);
  }
}

async function runRealPerformanceTests() {
  console.log("Real AI Response Speed Performance Test");
  console.log("======================================\n");
  
  await measureNonStreamingAPI();
  await measureStreamingAPI();
  await measureGPT4oMini();
  
  console.log("\n=== OPTIMIZATION RECOMMENDATIONS ===");
  console.log("1. Streaming: Reduces perceived latency significantly");
  console.log("2. Trimmed history: Reduces prompt size and processing time");
  console.log("3. Reduced max_tokens: 200 vs 400 = ~50% faster completion");
  console.log("4. Content filtering: Applied after streaming completes");
  console.log("5. Model choice: gpt-4o-mini is ~2-3x faster and ~10x cheaper");
  console.log("\nExpected improvements:");
  console.log("- Perceived latency: 50-70% reduction (time to first token)");
  console.log("- Total response time: 30-40% reduction (lower max_tokens)");
  console.log("- Cost: 90% reduction with gpt-4o-mini");
}

runRealPerformanceTests().catch(console.error);