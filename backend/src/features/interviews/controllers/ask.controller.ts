import { Request, Response, NextFunction } from 'express';
import { openai } from '../../../config/openai';
import { 
  buildAnswerPrompt, 
  extractProjectNames
} from '../../../services/simple-prompt.service';
import { APIError } from '../../../middleware/error.middleware';

interface Profile {
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

let currentProfile: Profile | null = null;

// In-memory conversation history for context
let conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];

// Track recent opening words used to prevent repetition
let recentOpenersUsed: string[] = [];

/**
 * Extract opening word from an answer to track variety
 */
function extractOpeningWord(answer: string): string {
  const openingWords = ['Yeah', 'So', 'Right', 'Okay', 'Sure', 'Actually', 'Basically', 'Well', 'Hmm', 'Let me'];
  const words = answer.trim().split(/\s+/);
  const firstWord = words[0]?.replace(/[.,!?]/g, ''); // Remove punctuation
  
  // Check if the first word matches any known opener
  for (const opener of openingWords) {
    if (firstWord.toLowerCase() === opener.toLowerCase()) {
      return opener;
    }
  }
  
  return firstWord || '';
}

/**
 * Cleanup function to replace banned words with simpler alternatives
 * Uses word stem matching to catch word families (e.g., robust/robustness/robustly)
 * NOTE: Only includes safe 1-to-1 word swaps. Words requiring phrase-level rewriting
 * (like "significantly") are handled by prompt instructions only, not regex.
 */
function cleanupBannedWords(answer: string): string {
  const bannedWordStems: [RegExp, string][] = [
    // Safe 1-to-1 replacements that don't break grammar
    [/\brobust\w*/gi, "solid"],
    [/\bcomprehensiv\w*/gi, "complete"],
    [/\bfacilit\w*/gi, "help"],
    [/\bcrucial\w*/gi, "important"],
    [/\bessential\w*/gi, "basically"],
    [/\bleverage\w*/gi, "use"],
    [/\butili[z][e]*\w*/gi, "use"],
    [/\bseamless\w*/gi, "smooth"],
    [/\bstreamlin\w*/gi, "simplify"],
    [/\borchestrat\w*/gi, "manage"],
    [/\bencapsulat\w*/gi, "wrap"],
    [/\bholistic\w*/gi, "complete"],
    [/\bparadigm\w*/gi, "approach"],
    [/\bsynergy\w*/gi, "collaboration"],
    [/\boptimal\w*/gi, "best"],
    [/\bintricate\w*/gi, "complex"],
    [/\bdelve\w*/gi, "look at"],
    [/\bdive\w*into\w*/gi, "explore"],
  ];

  let cleanedAnswer = answer;
  for (const [pattern, replacement] of bannedWordStems) {
    cleanedAnswer = cleanedAnswer.replace(pattern, replacement);
  }

  return cleanedAnswer;
}

/**
 * Cleanup essay-style phrases that sound too formal/AI-written
 */
function cleanupEssayPhrases(answer: string): string {
  const essayPhrases: [RegExp, string][] = [
    [/\ba real eye-opener\b/gi, "really informative"],
    [/\bunderestimated the complexity\b/gi, "didn't realize how complex it was"],
    [/\ba significant improvement\b/gi, "a big improvement"],
    [/\bplanning for scalability and robustness\b/gi, "planning for scale and reliability"],
  ];

  let cleanedAnswer = answer;
  for (const [pattern, replacement] of essayPhrases) {
    cleanedAnswer = cleanedAnswer.replace(pattern, replacement);
  }

  return cleanedAnswer;
}

/**
 * Cleanup 'you' POV mistakes as safety net
 */
function cleanupYouPOVMistakes(answer: string): string {
  const youPatterns: [RegExp, string][] = [
    [/\byou configure\b/gi, "we configure"],
    [/\byou can\b/gi, "we can"],
    [/\byou would\b/gi, "we would"],
    [/\byou need to\b/gi, "we need to"],
    [/\byour service\b/gi, "our service"],
    [/\byour system\b/gi, "our system"],
  ];

  let cleanedAnswer = answer;
  for (const [pattern, replacement] of youPatterns) {
    cleanedAnswer = cleanedAnswer.replace(pattern, replacement);
  }

  return cleanedAnswer;
}

/**
 * Lightweight self-check to verify answer quality
 * Logs any issues with length or content filtering misses
 */
function selfCheckAnswer(answer: string, question: string): void {
  const wordCount = answer.split(/\s+/).length;
  const charCount = answer.length;
  
  // Check length constraints
  if (wordCount < 150) {
    console.warn(`⚠️ Answer too short: ${wordCount} words (target: 180-280 words) for question: "${question.substring(0, 50)}..."`);
  } else if (wordCount > 300) {
    console.warn(`⚠️ Answer too long: ${wordCount} words (target: 180-280 words) for question: "${question.substring(0, 50)}..."`);
  }
  
  // Check for common content filter misses
  const disallowedPhrases = [
    'significantly',
    'crucial',
    'essentially',
    'leverage',
    'utilize',
    'seamless',
    'robust',
    'facilitate',
    'comprehensive',
    'delve into',
    'a real eye-opener',
    'underestimated the complexity',
    'a significant improvement'
  ];
  
  const foundPhrases = disallowedPhrases.filter(phrase => 
    answer.toLowerCase().includes(phrase.toLowerCase())
  );
  
  if (foundPhrases.length > 0) {
    console.warn(`⚠️ Content filter miss - found disallowed phrases: ${foundPhrases.join(', ')} in answer to: "${question.substring(0, 50)}..."`);
  }
  
  // Check for 'you' POV mistakes
  const youPatterns = [
    /\byou configure\b/gi,
    /\byou can\b/gi,
    /\byou would\b/gi,
    /\byou need to\b/gi,
    /\byour service\b/gi,
    /\byour system\b/gi
  ];
  
  const foundYouPatterns = youPatterns.filter(pattern => pattern.test(answer));
  if (foundYouPatterns.length > 0) {
    console.warn(`⚠️ POV filter miss - found 'you' patterns in answer to: "${question.substring(0, 50)}..."`);
  }
  
  console.log(`✅ Answer self-check: ${wordCount} words, ${charCount} characters for question: "${question.substring(0, 50)}..."`);
}

export class AskController {
  /**
   * Set or update the candidate profile
   */
  static async setProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = req.body;
      
      // Validate required fields
      if (!profile.candidateName || !profile.experienceYears || !profile.resumeText || !profile.jobDescriptionText) {
        throw new APIError(400, 'INVALID_PROFILE', 'Missing required profile fields');
      }

      currentProfile = {
        candidateName: profile.candidateName,
        experienceYears: profile.experienceYears,
        currentCompany: profile.currentCompany || '',
        currentRole: profile.currentRole || '',
        previousCompany: profile.previousCompany || '',
        previousRole: profile.previousRole || '',
        targetCompany: profile.targetCompany || '',
        jobTitle: profile.jobTitle || '',
        interviewRound: profile.interviewRound || 'Technical Round 1',
        resumeText: profile.resumeText,
        jobDescriptionText: profile.jobDescriptionText,
        recentProjectsUsed: []
      };

      conversationHistory = [];
      recentOpenersUsed = [];

      res.status(200).json({
        status: 'success',
        data: currentProfile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!currentProfile) {
        throw new APIError(404, 'NO_PROFILE', 'No profile has been set');
      }

      res.status(200).json({
        status: 'success',
        data: currentProfile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ask a question and get AI-generated answer (non-streaming)
   */
  static async ask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { question, conversationHistory: clientHistory } = req.body as { question: string; conversationHistory?: Array<{role: 'user' | 'assistant', content: string}> };

      if (!currentProfile) {
        throw new APIError(400, 'NO_PROFILE', 'No profile has been set. Call POST /api/interviews/profile first.');
      }

      if (!question || question.trim() === '') {
        throw new APIError(400, 'INVALID_QUESTION', 'Question cannot be empty');
      }

      // Use provided history or server history
      const historyToUse = clientHistory || conversationHistory;

      // Build the prompt with conversation history and recent openers
      const prompt = buildAnswerPrompt(currentProfile, historyToUse, recentOpenersUsed).replace("{{USER_QUESTION}}", question);

      // Build messages array for OpenAI with conversation context
      const messages: Array<{role: 'system' | 'user', content: string}> = [
        { role: "user", content: prompt }
      ];

      // Call OpenAI API
      console.time('OpenAI API call');
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        temperature: 0.65, // Reduced from 0.85 for more consistent answers
        max_tokens: 600, // Increased from 200 to 600 to prevent mid-sentence cutoffs with natural phrases
        messages
      });
      console.timeEnd('OpenAI API call');

      const answer = response.choices[0].message.content;

      if (!answer) {
        throw new APIError(500, 'AI_GENERATION_FAILED', 'Failed to generate answer from AI service');
      }

      // Apply banned words cleanup before sending to frontend
      const cleanedAnswer = cleanupBannedWords(answer);

      // Apply essay-style phrase cleanup
      const essayCleanedAnswer = cleanupEssayPhrases(cleanedAnswer);

      // Apply 'you' POV cleanup as safety net
      const finalAnswer = cleanupYouPOVMistakes(essayCleanedAnswer);

      // Extract and track opening word for variety
      const openingWord = extractOpeningWord(finalAnswer);
      if (openingWord) {
        recentOpenersUsed.push(openingWord);
        // Keep only last 3 opening words
        if (recentOpenersUsed.length > 3) {
          recentOpenersUsed = recentOpenersUsed.slice(-3);
        }
      }

      // Update server conversation history
      conversationHistory.push({ role: 'user', content: question });
      conversationHistory.push({ role: 'assistant', content: finalAnswer });

      // Keep only last 8 messages (4 question-answer pairs) to manage memory
      if (conversationHistory.length > 8) {
        conversationHistory = conversationHistory.slice(-8);
      }

      // Extract and update recent projects used
      const foundProjects = extractProjectNames(finalAnswer, currentProfile.resumeText);
      foundProjects.forEach(project => {
        if (currentProfile && !currentProfile.recentProjectsUsed.includes(project)) {
          currentProfile.recentProjectsUsed.push(project);
          // Keep only last 2 projects
          if (currentProfile.recentProjectsUsed.length > 2) {
            currentProfile.recentProjectsUsed = currentProfile.recentProjectsUsed.slice(-2);
          }
        }
      });

      // Run lightweight self-check for quality assurance
      selfCheckAnswer(finalAnswer, question);

      res.status(200).json({
        status: 'success',
        data: {
          answer: finalAnswer,
          conversationHistory: conversationHistory
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ask a question and get AI-generated answer (streaming)
   */
  static async askStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { question, conversationHistory: clientHistory } = req.body as { question: string; conversationHistory?: Array<{role: 'user' | 'assistant', content: string}> };

      if (!currentProfile) {
        throw new APIError(400, 'NO_PROFILE', 'No profile has been set. Call POST /api/interviews/profile first.');
      }

      if (!question || question.trim() === '') {
        throw new APIError(400, 'INVALID_QUESTION', 'Question cannot be empty');
      }

      // Use provided history or server history
      const historyToUse = clientHistory || conversationHistory;

      // Trim to last 4 messages (2 exchanges) for performance
      const trimmedHistory = historyToUse.slice(-4);

      // Build the prompt with trimmed conversation history and recent openers
      const prompt = buildAnswerPrompt(currentProfile, trimmedHistory, recentOpenersUsed).replace("{{USER_QUESTION}}", question);

      // Build messages array for OpenAI with conversation context
      const messages: Array<{role: 'system' | 'user', content: string}> = [
        { role: "user", content: prompt }
      ];

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Call OpenAI API with streaming
      console.time('OpenAI Streaming API call');
      const stream = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        temperature: 0.65, // Reduced from 0.85 for more consistent answers
        max_tokens: 600, // Increased from 200 to 600 to prevent mid-sentence cutoffs with natural phrases
        messages,
        stream: true
      });
      console.timeEnd('OpenAI Streaming API call');

      let fullAnswer = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullAnswer += content;
          // Send each chunk to frontend
          res.write(`data: ${JSON.stringify({ type: 'token', content })}\n\n`);
        }
      }

      // Apply content filtering to final answer only
      const cleanedAnswer = cleanupBannedWords(fullAnswer);
      const essayCleanedAnswer = cleanupEssayPhrases(cleanedAnswer);
      const finalAnswer = cleanupYouPOVMistakes(essayCleanedAnswer);

      // Extract and track opening word for variety
      const openingWord = extractOpeningWord(finalAnswer);
      if (openingWord) {
        recentOpenersUsed.push(openingWord);
        // Keep only last 3 opening words
        if (recentOpenersUsed.length > 3) {
          recentOpenersUsed = recentOpenersUsed.slice(-3);
        }
      }

      // Run lightweight self-check for quality assurance
      selfCheckAnswer(finalAnswer, question);

      // Update server conversation history
      conversationHistory.push({ role: 'user', content: question });
      conversationHistory.push({ role: 'assistant', content: finalAnswer });

      // Keep only last 8 messages (4 question-answer pairs) to manage memory
      if (conversationHistory.length > 8) {
        conversationHistory = conversationHistory.slice(-8);
      }

      // Extract and update recent projects used
      const foundProjects = extractProjectNames(finalAnswer, currentProfile.resumeText);
      foundProjects.forEach(project => {
        if (currentProfile && !currentProfile.recentProjectsUsed.includes(project)) {
          currentProfile.recentProjectsUsed.push(project);
          // Keep only last 2 projects
          if (currentProfile.recentProjectsUsed.length > 2) {
            currentProfile.recentProjectsUsed = currentProfile.recentProjectsUsed.slice(-2);
          }
        }
      });

      // Send final message
      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        answer: finalAnswer,
        conversationHistory: conversationHistory
      })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      })}\n\n`);
      res.end();
      next(error);
    }
  }

  /**
   * Reset current profile
   */
  static async resetProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      currentProfile = null;
      conversationHistory = [];
      recentOpenersUsed = [];
      res.status(200).json({
        status: 'success',
        message: 'Profile reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}