/**
 * Speed optimization test for AI response improvements
 * Tests the impact of various optimizations on response time
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

const testQuestions = [
  "What was the most challenging feature you developed?",
  "How do you optimize a slow Spring Boot application?",
  "Explain the difference between ClusterIP, NodePort, and LoadBalancer services",
  "How do you secure a React application?",
  "What is your experience with microservices architecture?"
];

async function testModelComparison() {
  console.log("=== MODEL COMPARISON TEST ===");
  console.log("Testing gpt-4o vs gpt-4o-mini for speed and quality\n");
  
  const models = ["gpt-4o", "gpt-4o-mini"];
  
  for (const model of models) {
    console.log(`\n🔍 Testing model: ${model}`);
    console.log("-".repeat(50));
    
    const question = testQuestions[0]; // Test with first question
    const prompt = buildAnswerPrompt(testProfile, []).replace("{{USER_QUESTION}}", question);
    
    const messages: Array<{role: 'system' | 'user', content: string}> = [
      { role: "user", content: prompt }
    ];

    try {
      const startTime = Date.now();
      let firstTokenTime = 0;
      let tokenCount = 0;
      
      const stream = await openai.chat.completions.create({
        model,
        temperature: 0.65,
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
      const totalTime = endTime - startTime;
      const timeToFirstToken = firstTokenTime - startTime;
      
      console.log(`Question: "${question}"`);
      console.log(`Time to first token: ${timeToFirstToken}ms`);
      console.log(`Total completion time: ${totalTime}ms`);
      console.log(`Tokens received: ${tokenCount}`);
      console.log(`Answer length: ${fullAnswer.length} characters`);
      console.log(`Answer preview: "${fullAnswer.substring(0, 100)}..."`);
      
      // Quality checks
      const hasNaturalElements = /\b(umm|haa|actually|only|na|that way|no\?|see|Hmm|Aah|Ohh)\b/i.test(fullAnswer);
      const hasContractions = /\b(I'm|we're|it's|didn't|wasn't)\b/i.test(fullAnswer);
      const hasProjectMention = /DATA PIPELINE|REAL-TIME ANALYTICS|MACHINE LEARNING/i.test(fullAnswer);
      
      console.log(`Quality checks:`);
      console.log(`  Natural speech elements: ${hasNaturalElements ? '✅' : '❌'}`);
      console.log(`  Contractions: ${hasContractions ? '✅' : '❌'}`);
      console.log(`  Project mention: ${hasProjectMention ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`Test failed for ${model}:`, error);
    }
  }
}

async function testHistoryTrimming() {
  console.log("\n\n=== HISTORY TRIMMING TEST ===");
  console.log("Testing impact of conversation history size on response time\n");
  
  const question = testQuestions[1];
  const conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [
    { role: 'user', content: 'What is your experience with React?' },
    { role: 'assistant', content: 'I have 4 years of React experience...' },
    { role: 'user', content: 'How do you handle state management?' },
    { role: 'assistant', content: 'We use Redux for complex state...' },
    { role: 'user', content: 'What about performance optimization?' },
    { role: 'assistant', content: 'We implemented code splitting...' }
  ];
  
  const historySizes = [0, 2, 4, 6]; // Test different history sizes
  
  for (const size of historySizes) {
    const trimmedHistory = conversationHistory.slice(-size);
    const prompt = buildAnswerPrompt(testProfile, trimmedHistory).replace("{{USER_QUESTION}}", question);
    
    const messages: Array<{role: 'system' | 'user', content: string}> = [
      { role: "user", content: prompt }
    ];

    try {
      const startTime = Date.now();
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.65,
        max_tokens: 200,
        messages
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const answer = response.choices[0].message.content;
      
      console.log(`History size: ${size} messages`);
      console.log(`Response time: ${responseTime}ms`);
      console.log(`Answer length: ${answer?.length || 0} characters`);
      console.log(`Prompt length: ${prompt.length} characters`);
      console.log("---");
      
    } catch (error) {
      console.error(`Test failed for history size ${size}:`, error);
    }
  }
}

async function testMaxTokensImpact() {
  console.log("\n\n=== MAX TOKENS IMPACT TEST ===");
  console.log("Testing impact of max_tokens setting on response time\n");
  
  const question = testQuestions[2];
  const prompt = buildAnswerPrompt(testProfile, []).replace("{{USER_QUESTION}}", question);
  
  const messages: Array<{role: 'system' | 'user', content: string}> = [
    { role: "user", content: prompt }
  ];

  const maxTokensSettings = [100, 200, 400];
  
  for (const maxTokens of maxTokensSettings) {
    try {
      const startTime = Date.now();
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.65,
        max_tokens: maxTokens,
        messages
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const answer = response.choices[0].message.content;
      
      console.log(`Max tokens: ${maxTokens}`);
      console.log(`Response time: ${responseTime}ms`);
      console.log(`Answer length: ${answer?.length || 0} characters`);
      console.log(`Tokens used: ${response.usage?.total_tokens || 'N/A'}`);
      console.log("---");
      
    } catch (error) {
      console.error(`Test failed for max_tokens ${maxTokens}:`, error);
    }
  }
}

async function runSpeedOptimizationTests() {
  console.log("AI Response Speed Optimization Test");
  console.log("====================================\n");
  
  await testModelComparison();
  await testHistoryTrimming();
  await testMaxTokensImpact();
  
  console.log("\n=== OPTIMIZATION SUMMARY ===");
  console.log("1. Streaming: Reduces perceived latency by showing tokens as they arrive");
  console.log("2. Trimmed history: Last 4 messages instead of 6 reduces input tokens");
  console.log("3. Reduced max_tokens: 200 vs 400 = ~50% faster completion");
  console.log("4. Model choice: gpt-4o-mini is ~2-3x faster and ~10x cheaper");
  console.log("5. Improved loading indicator: Animated dots make wait feel shorter");
}

runSpeedOptimizationTests().catch(console.error);