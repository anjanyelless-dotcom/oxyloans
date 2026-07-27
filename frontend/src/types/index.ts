export interface CandidateInfo {
  name: string;
  experienceYears: number;
  currentCompany: string | null;
  previousCompany: string | null;
}

export interface TargetInfo {
  company: string;
  role: string;
  round: string;
}

export interface SessionSettings {
  language: string;
}

export interface HistoryTurn {
  id: string;
  role: 'interviewer' | 'candidate';
  content: string;
  feedback: string | null;
  openaiResponseId: string | null;
  timestamp: string;
}

export interface InterviewContext {
  sessionId: string;
  candidate: CandidateInfo;
  target: TargetInfo;
  resume: string;
  jobDescription: string;
  history: HistoryTurn[];
  summary: string | null;
  settings: SessionSettings;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface StartInterviewRequest {
  candidateName: string;
  experienceYears: number;
  currentCompany?: string;
  previousCompany?: string;
  interviewCompany: string;
  targetRole: string;
  interviewRound: string;
  language?: string;
  resumeText: string;
  jobDescription: string;
}

export interface SubmitAnswerRequest {
  answer: string;
}

export interface InterviewResponsePayload {
  context: InterviewContext;
  firstQuestion: string;
}

export interface SubmitAnswerResponsePayload {
  feedback: string;
  nextQuestion: string;
  context: InterviewContext;
}

export interface APIErrorResponse {
  status: 'error';
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}
