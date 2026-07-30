/**
 * Test natural speech elements in updated prompt
 * Tests the three question types that were coming out too clean
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
  "explain REST principles",
  "what is hoisting", 
  "backend pagination or frontend pagination"
];

async function testNaturalSpeechElements() {
  console.log("=== NATURAL SPEECH ELEMENTS TEST ===");
  console.log("Testing updated prompt for natural speech elements and casual phrasing\n");
  
  for (const question of testQuestions) {
    console.log(`\n🔍 Testing: "${question}"`);
    console.log("-".repeat(50));
    
    const prompt = buildAnswerPrompt(testProfile, []).replace("{{USER_QUESTION}}", question);
    
    const messages: Array<{role: 'system' | 'user', content: string}> = [
      { role: "user", content: prompt }
    ];

    try {
      const stream = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        temperature: 0.65,
        max_tokens: 200,
        messages,
        stream: true
      });

      let fullAnswer = '';
      let firstTokenTime = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          if (firstTokenTime === 0) {
            firstTokenTime = Date.now();
          }
          fullAnswer += content;
        }
      }

      console.log(`Answer: "${fullAnswer}"`);
      
      // Check for natural speech elements
      const naturalElements = {
        fillerWords: /\b(umm|haa|actually)\b/i.test(fullAnswer),
        indianEnglishParticles: /\b(only|na|that way|no\?|see)\b/i.test(fullAnswer),
        thinkingBreaks: /\b(let me think|give me a second|wait|that's right|yeah that's the one)\b/i.test(fullAnswer),
        soundInterjections: /\b(Hmm|Aah|Ohh)\b/i.test(fullAnswer),
        contractions: /\b(I'm|we're|it's|didn't|wasn't|doesn't|can't)\b/i.test(fullAnswer),
        casualStarters: /^(And|So|But)\b/i.test(fullAnswer)
      };

      console.log("\n📊 Natural Speech Elements Found:");
      Object.entries(naturalElements).forEach(([element, found]) => {
        console.log(`  ${found ? '✅' : '❌'} ${element}`);
      });

      const hasNaturalElements = Object.values(naturalElements).some(Boolean);
      console.log(`\n${hasNaturalElements ? '✅' : '❌'} Has at least one natural speech element`);
      
    } catch (error) {
      console.error("Test failed:", error);
    }
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("Test complete. Check above for natural speech elements.");
}

testNaturalSpeechElements().catch(console.error);