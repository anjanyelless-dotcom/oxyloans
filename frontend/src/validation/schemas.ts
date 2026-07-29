import { z } from 'zod';

export const ProfileSchema = z.object({
  candidateName: z.string().min(1, "Candidate name is required"),
  experienceYears: z.number().min(0, "Experience years must be non-negative"),
  currentCompany: z.string().min(1, "Current company is required"),
  currentRole: z.string().min(1, "Current role is required"),
  previousCompany: z.string().min(1, "Previous company is required"),
  previousRole: z.string().min(1, "Previous role is required"),
  targetCompany: z.string().min(1, "Target company is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  interviewRound: z.string().min(1, "Interview round is required"),
  resumeText: z.string().min(1, "Resume text is required"),
  jobDescriptionText: z.string().min(1, "Job description is required"),
  recentProjectsUsed: z.array(z.string()).default([])
});

// Pre-parse type (for object literals before validation)
export type ProfileInput = z.input<typeof ProfileSchema>;

// Post-parse type (for data after validation, guaranteed shape)
export type Profile = z.infer<typeof ProfileSchema>;

export const MessageSchema = z.object({
  role: z.enum(['user', 'ai']),
  content: z.string().min(1, "Message content is required"),
  timestamp: z.date(),
  questionId: z.string().optional()
});

export type Message = z.infer<typeof MessageSchema>;

export const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, "Conversation message content is required")
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

// Export ZodError for error handling
export { z };