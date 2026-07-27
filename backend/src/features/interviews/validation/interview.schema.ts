import { z } from 'zod';

export const startInterviewSchema = z.object({
  candidateName: z.string().trim().min(1, 'Candidate name is required.').max(255),
  experienceYears: z.coerce.number().int().nonnegative('Years of experience must be a positive integer.'),
  currentCompany: z.string().trim().max(255).optional().or(z.literal('')),
  previousCompany: z.string().trim().max(255).optional().or(z.literal('')),
  interviewCompany: z.string().trim().min(1, 'Interviewing company is required.').max(255),
  targetRole: z.string().trim().min(1, 'Target role is required.').max(255),
  interviewRound: z.string().trim().min(1, 'Interview round description is required.').max(255),
  language: z.string().trim().min(1).max(50).default('English'),
  resumeText: z.string().trim().min(10, 'Resume text must be at least 10 characters.'),
  jobDescription: z.string().trim().min(10, 'Job description must be at least 10 characters.'),
});

export const submitAnswerSchema = z.object({
  answer: z.string().trim().min(1, 'Answer content cannot be empty.').max(10000, 'Answer exceeds maximum character limit (10000 characters).'),
});
