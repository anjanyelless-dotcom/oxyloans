import { Request, Response, NextFunction } from 'express';
import { openai } from '../../../config/openai';
import { buildAnswerPrompt, extractProjectNames } from '../../../services/simple-prompt.service';
import { APIError } from '../../../middleware/error.middleware';

interface AskRequest {
  question: string;
  conversationHistory?: Array<{role: 'user' | 'assistant', content: string}>;
}

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

// In-memory profile storage (in production, this would come from database/session)
let currentProfile: Profile | null = null;

// In-memory conversation history for context
let conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];

/**
 * Cleanup function to replace banned words with simpler alternatives
 * Uses word stem matching to catch word families (e.g., robust/robustness/robustly)
 */
function cleanupBannedWords(answer: string): string {
  const bannedWordStems: [RegExp, string][] = [
    [/\brobust\w*/gi, "solid"],
    [/\bsignificant\w*/gi, "big"],
    [/\bcomprehensiv\w*/gi, "complete"],
    [/\bfacilit\w*/gi, "help"],
    [/\bcrucial\w*/gi, "important"],
    [/\bessential\w*/gi, "basically"],
    [/\bleverage\w*/gi, "use"],
    [/\butilize\w*/gi, "use"],
    [/\bseamless\w*/gi, "easy"],
    [/\bstreamline\w*/gi, "simplify"],
    [/\borchestrat\w*/gi, "manage"],
    [/\bencapsulat\w*/gi, "wrap"],
    [/\bholistic\w*/gi, "complete"],
    [/\bparadigm\w*/gi, "approach"],
    [/\bsynergy\w*/gi, "combination"],
    [/\boptimal\w*/gi, "best"],
    [/\bintricate\w*/gi, "complex"],
    [/\bdelve\w*/gi, "look at"],
    [/\bdive into\w*/gi, "explore"],
  ];

  let cleanedAnswer = answer;
  let patternsCaught = 0;
  
  // Apply each stem-based replacement
  for (const [pattern, replacement] of bannedWordStems) {
    const matches = cleanedAnswer.match(pattern);
    if (matches && matches.length > 0) {
      patternsCaught += matches.length;
      cleanedAnswer = cleanedAnswer.replace(pattern, replacement);
    }
  }
  
  // Log warning if any patterns were caught
  if (patternsCaught > 0) {
    console.warn(`⚠️ Caught and fixed ${patternsCaught} banned word family leak(s) in AI response`);
  }
  
  return cleanedAnswer;
}

/**
 * Cleanup function to simplify idiom-heavy/essay-style phrases
 * Replaces polished written phrases with simpler spoken alternatives
 */
function cleanupEssayPhrases(answer: string): string {
  const essayPhraseFixes: [RegExp, string][] = [
    [/\ba real eye-opener\b/gi, "taught me a lesson"],
    [/\bunderestimated the complexity involved\b/gi, "thought it would be simple but it wasn't"],
    [/\ba significant improvement\b/gi, "made a big difference"],
    [/\ba steep learning curve\b/gi, "took some time to learn"],
    [/\bit was quite a journey\b/gi, "it was quite an experience"],
    [/\bplanning for scalability and robustness\b/gi, "planning for scale and reliability"],
    [/\bplanning for scalability\b/gi, "planning for scale"],
    [/\bplanning for robustness\b/gi, "planning for reliability"],
    [/\bunderestimated the complexity\b/gi, "thought it would be simpler"],
    [/\bquite a journey\b/gi, "quite an experience"],
    [/\breal eye-opener\b/gi, "taught me a lesson"],
    [/\beye-opener\b/gi, "taught me something"],
    [/\bquite challenging\b/gi, "pretty challenging"],
    [/\bquite difficult\b/gi, "pretty difficult"],
    [/\bquite complex\b/gi, "pretty complex"],
  ];

  let cleanedAnswer = answer;
  let patternsCaught = 0;

  // Apply each replacement
  for (const [pattern, replacement] of essayPhraseFixes) {
    const matches = cleanedAnswer.match(pattern);
    if (matches && matches.length > 0) {
      patternsCaught += matches.length;
      cleanedAnswer = cleanedAnswer.replace(pattern, replacement);
    }
  }

  // Log warning if any patterns were caught
  if (patternsCaught > 0) {
    console.warn(`⚠️ Caught and fixed ${patternsCaught} essay-style phrase(s) in AI response`);
  }

  return cleanedAnswer;
}

/**
 * Cleanup function to fix 'you' POV mistakes that slip through
 * Uses regex patterns to catch common 'you' leak patterns and auto-correct them
 * These are generic grammar patterns, not tied to specific tech domains
 */
function cleanupYouPOVMistakes(answer: string): string {
  const youFixes: [RegExp, string][] = [
    // Generic possessive patterns (domain-agnostic)
    [/\byour service\b/gi, "the service"],
    [/\byour system\b/gi, "the system"],
    [/\byour application\b/gi, "the application"],
    [/\byour app\b/gi, "the app"],
    [/\byour project\b/gi, "the project"],
    [/\byour code\b/gi, "the code"],
    [/\byour data\b/gi, "the data"],
    [/\byour database\b/gi, "the database"],
    [/\byour server\b/gi, "the server"],
    [/\byour machine\b/gi, "the machine"],
    [/\byour environment\b/gi, "the environment"],
    [/\byour setup\b/gi, "the setup"],
    [/\byour configuration\b/gi, "the configuration"],
    [/\byour infrastructure\b/gi, "the infrastructure"],
    [/\byour pipeline\b/gi, "the pipeline"],
    [/\byour workflow\b/gi, "the workflow"],
    [/\byour team\b/gi, "the team"],
    [/\byour organization\b/gi, "the organization"],
    [/\byour company\b/gi, "the company"],
    
    // Generic verb patterns (domain-agnostic)
    [/\byou'd\b/gi, "we'd"],
    [/\byou can set up\b/gi, "we can set up"],
    [/\byou can specify\b/gi, "we can specify"],
    [/\byou can access\b/gi, "we can access"],
    [/\bwe can access\b/gi, "the service can be accessed"],
    [/\byou can\b/gi, "we can"],
    [/\bhow you connect\b/gi, "how we connect"],
    [/\bthat's how you\b/gi, "that's how we"],
    [/\byou would use\b/gi, "we would use"],
    [/\byou need to\b/gi, "we need to"],
    [/\byou need\b/gi, "we need"],
    [/\byou're\b/gi, "we're"],
    [/\byou have\b/gi, "we have"],
    [/\byou get\b/gi, "we get"],
    [/\byou use\b/gi, "we use"],
    [/\byou gotta\b/gi, "we gotta"],
    [/\byou generate\b/gi, "we generate"],
    [/\byou generated\b/gi, "we generated"],
    [/\bfirst you need\b/gi, "first we need"],
    [/\bfirst you\b/gi, "first we"],
    [/\bwhen you want\b/gi, "when we want"],
    [/\bwhen you need\b/gi, "when we need"],
    [/\bwhat you're trying\b/gi, "what we're trying"],
    [/\bwalk you through\b/gi, "walk through"],
    [/\bhelp you understand\b/gi, "help understand"],
    [/\bshow you\b/gi, "show"],
    [/\btell you\b/gi, "tell"],
    // Catch patterns where 'you' is used as subject in explanations
    [/\byou want to\b/gi, "we want to"],
    [/\byou want\b/gi, "we want"],
    [/\byou don't\b/gi, "we don't"],
    [/\byou do\b/gi, "we do"],
    [/\byou should\b/gi, "we should"],
    [/\byou must\b/gi, "we must"],
    [/\byou will\b/gi, "we will"],
    [/\byou'll\b/gi, "we'll"],
    // Catch additional patterns
    [/\bonce you've got\b/gi, "once we've got"],
    [/\bonce you\b/gi, "once we"],
    [/\bwhere you specify\b/gi, "where we specify"],
    [/\bwhere you put\b/gi, "where we put"],
    [/\byou put in\b/gi, "we put in"],
    [/\byou assigned\b/gi, "we assigned"],
    [/\bmeans we can access\b/gi, "means the service can be accessed"],
    [/\bensure you've got\b/gi, "ensure we've got"],
    [/\bin your terminal\b/gi, "in the terminal"],
    [/\bwhich is your private key\b/gi, "which is the private key"],
    [/\bwhen you launched\b/gi, "when we launched"],
    [/\byou launched\b/gi, "we launched"],
  ];

  let cleanedAnswer = answer;
  let patternsCaught = 0;

  // Apply each replacement
  for (const [pattern, replacement] of youFixes) {
    const matches = cleanedAnswer.match(pattern);
    if (matches && matches.length > 0) {
      patternsCaught += matches.length;
      cleanedAnswer = cleanedAnswer.replace(pattern, replacement);
    }
  }

  // Log warning if any patterns were caught
  if (patternsCaught > 0) {
    console.warn(`⚠️ Caught and fixed ${patternsCaught} 'you' POV mistake(s) in AI response`);
  }

  return cleanedAnswer;
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

      res.status(200).json({
        status: 'success',
        message: 'Profile set successfully',
        profile: currentProfile
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
        throw new APIError(404, 'NO_PROFILE', 'No profile has been set. Call POST /api/interviews/profile first.');
      }

      res.status(200).json({
        status: 'success',
        profile: currentProfile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ask a question and get AI-generated answer
   */
  static async ask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { question, conversationHistory: clientHistory } = req.body as AskRequest;

      if (!question || question.trim() === '') {
        throw new APIError(400, 'INVALID_QUESTION', 'Question is required');
      }

      if (!currentProfile) {
        throw new APIError(400, 'NO_PROFILE', 'No profile has been set. Call POST /api/interviews/profile first.');
      }

      // Use client conversation history if provided, otherwise use server history
      const historyToUse = clientHistory || conversationHistory;

      // Build the prompt with conversation history
      const prompt = buildAnswerPrompt(currentProfile, historyToUse).replace("{{USER_QUESTION}}", question);

      // Build messages array for OpenAI with conversation context
      const messages: Array<{role: 'system' | 'user', content: string}> = [
        { role: "user", content: prompt }
      ];

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        temperature: 0.85, // important: keeps it natural, not robotic
        max_tokens: 400,
        messages
      });

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

      // Update server conversation history
      conversationHistory.push({ role: 'user', content: question });
      conversationHistory.push({ role: 'assistant', content: finalAnswer });

      // Keep only last 12 messages (6 question-answer pairs) to manage memory
      if (conversationHistory.length > 12) {
        conversationHistory = conversationHistory.slice(-12);
      }

      // Extract and update recent projects used
      const foundProjects = extractProjectNames(finalAnswer, currentProfile.resumeText);
      foundProjects.forEach(project => {
        if (currentProfile && !currentProfile.recentProjectsUsed.includes(project)) {
          currentProfile.recentProjectsUsed.push(project);
          // Keep only last 2 projects
          currentProfile.recentProjectsUsed = currentProfile.recentProjectsUsed.slice(-2);
        }
      });

      res.status(200).json({
        status: 'success',
        answer: finalAnswer,
        recentProjectsUsed: currentProfile.recentProjectsUsed,
        conversationHistory: conversationHistory
      });
    } catch (error) {
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
      res.status(200).json({
        status: 'success',
        message: 'Profile reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}