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

// Known project names from resume for tracking (no placeholders)
const KNOWN_PROJECTS = [
  "Employee Management",
  "E-Commerce", 
  "Loan Management"
];

/**
 * Cleanup function to replace banned words with simpler alternatives
 * Uses word boundaries (\b) and case-insensitive matching to avoid breaking words
 */
function cleanupBannedWords(answer: string): string {
  const bannedWordMap: {[key: string]: string} = {
    "crucial": "important",
    "essentially": "basically", 
    "significantly": "a lot",
    "leverage": "use",
    "utilize": "use",
    "seamless": "easy",
    "seamlessly": "easily",
    "robust": "solid",
    "streamline": "simplify",
    "streamlined": "simplified",
    "facilitate": "help",
    "facilitated": "helped",
    "comprehensive": "complete",
    "delve into": "look at"
  };

  let cleanedAnswer = answer;
  
  // Apply each replacement with word boundary matching (case-insensitive)
  for (const [bannedWord, replacement] of Object.entries(bannedWordMap)) {
    const regex = new RegExp(`\\b${bannedWord}\\b`, 'gi');
    cleanedAnswer = cleanedAnswer.replace(regex, replacement);
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

      // Update server conversation history
      conversationHistory.push({ role: 'user', content: question });
      conversationHistory.push({ role: 'assistant', content: cleanedAnswer });

      // Keep only last 12 messages (6 question-answer pairs) to manage memory
      if (conversationHistory.length > 12) {
        conversationHistory = conversationHistory.slice(-12);
      }

      // Extract and update recent projects used
      const foundProjects = extractProjectNames(cleanedAnswer, KNOWN_PROJECTS);
      foundProjects.forEach(project => {
        if (currentProfile && !currentProfile.recentProjectsUsed.includes(project)) {
          currentProfile.recentProjectsUsed.push(project);
          // Keep only last 2 projects
          currentProfile.recentProjectsUsed = currentProfile.recentProjectsUsed.slice(-2);
        }
      });

      res.status(200).json({
        status: 'success',
        answer: cleanedAnswer,
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