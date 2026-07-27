import { openai, OPENAI_MODEL } from '../../../config/openai';
import { InterviewContext } from '../types/interview.types';

export class OpenAIService {
  /**
   * Generates the first interview question based on setup data.
   * Utilizes the stateful OpenAI Responses API to begin a new conversation tree.
   */
  static async generateFirstQuestion(context: {
    candidateName: string;
    experienceYears: number;
    currentCompany?: string;
    previousCompany?: string;
    interviewCompany: string;
    targetRole: string;
    interviewRound: string;
    language: string;
    resumeText: string;
    jobDescription: string;
  }): Promise<{ question: string; openaiResponseId: string }> {
    const instructions = `You are an elite executive and technical interviewer. 
Your goal is to conduct a highly realistic, challenging mock interview for the role of "${context.targetRole}" at "${context.interviewCompany}" for the "${context.interviewRound}" round.

Candidate Profile:
- Candidate Name: ${context.candidateName}
- Years of Experience: ${context.experienceYears}
- Current Company: ${context.currentCompany || 'Not Provided'}
- Previous Company: ${context.previousCompany || 'Not Provided'}
- Resume Text: ${context.resumeText}

Target Job Details:
- Job Description: ${context.jobDescription}

Conduct the interview in the requested language: ${context.language}.

Instructions:
1. Introduce yourself briefly (max 2 sentences) in a professional manner.
2. Ask the very first interview question. Make it highly contextual and tailored to the job description and the candidate's background.
3. Do NOT include formatting delimiters like "===" or meta-commentary. Return only the interviewer introduction and the first question.`;

    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      instructions,
      input: "Start the interview.",
      store: true, // Enable server-side state tracking
    } as any);

    const question = (response.output_text || '').trim();
    if (!question) {
      throw new Error('OpenAI Responses API returned an empty initial question.');
    }

    return {
      question,
      openaiResponseId: response.id,
    };
  }

  /**
   * Evaluates the candidate's last answer, generates coaching feedback, and poses the next question.
   * Leverages the `previous_response_id` of the stateful Responses API to continue the context chain.
   */
  static async generateFeedbackAndNextQuestion(
    previousResponseId: string,
    candidateAnswer: string,
    context: InterviewContext
  ): Promise<{ feedback: string; nextQuestion: string; openaiResponseId: string }> {
    const candidateName = context.candidate.name;
    const exp = context.candidate.experienceYears;
    const currentCompany = context.candidate.currentCompany || 'Not Provided';
    const previousCompany = context.candidate.previousCompany || 'Not Provided';
    const company = context.target.company;
    const role = context.target.role;
    const round = context.target.round;
    const language = context.settings.language;
    const resumeText = context.resume;
    const jdText = context.jobDescription;

    // Get current question from history
    const interviewerTurns = context.history.filter(t => t.role === 'interviewer');
    const currentQuestion = interviewerTurns.length > 0 ? interviewerTurns[interviewerTurns.length - 1].content : 'No active question.';

    // Construct conversation history text
    const conversationHistory = context.history.map((turn, idx) => {
      const turnLabel = turn.role === 'interviewer' ? 'Interviewer' : 'Candidate';
      const feedbackLabel = turn.feedback ? `\nFeedback: ${turn.feedback}` : '';
      return `Turn ${idx + 1} - ${turnLabel}:\nContent: "${turn.content}"${feedbackLabel}`;
    }).join('\n\n');

    const instructions = `You are a Senior Technical Interviewer and coaching assistant. 
Conduct all evaluations and responses in the requested language: ${language}.

Your goal is to evaluate the candidate's response to the active question, provide highly realistic, personalized constructive coaching feedback, and ask the next interview question.

System Instructions:
1. Acting Role: You are a Senior Technical Interviewer conducting a realistic mock interview for the role of "${role}" at "${company}" for the "${round}" round.
2. Experience Level Evaluation: Assess the answer appropriately based on the candidate's level of experience (${exp} years).
3. Context Grounding: Compare the candidate's answer against their resume and the target Job Description. Detect any bluffing, inconsistent claims, or gaps where the candidate's answer contradicts their stated resume skills/projects or target JD.
4. Constructive Evaluation & Scoring:
   - Provide a score (0 to 10) evaluating the quality and accuracy of the candidate's answer.
   - Outline the specific strengths and weaknesses of the response.
   - Suggest actionable recommendations on what and how the candidate should improve.
5. Interview Progression:
   - Generate the next interview question naturally based on the conversation flow.
   - Avoid repeating questions that have already been discussed.
   - Keep the tone and progression conversational, structured, and realistic, like a real professional interviewer.

You must return a valid JSON response adhering exactly to the schema.
The response must contain:
1. "feedback": A markdown formatted string containing the evaluation score (0-10), candidate strengths, weaknesses, bluff/inconsistency analysis, and constructive steps for improvement.
2. "nextQuestion": The next interview question in the sequence.`;

    const input = `CANDIDATE INFORMATION:
- Name: ${candidateName}
- Years of Experience: ${exp} years
- Current Company: ${currentCompany}
- Previous Company: ${previousCompany}

CANDIDATE RESUME:
${resumeText || 'Not Provided'}

JOB DESCRIPTION:
${jdText || 'Not Provided'}

INTERVIEW CONTEXT:
- Target Company: ${company}
- Target Role: ${role}
- Interview Round: ${round}
- Interview Language: ${language}

PREVIOUS CONVERSATION:
${conversationHistory || 'No history recorded.'}

CURRENT QUESTION ASKED BY INTERVIEWER:
"${currentQuestion}"

LATEST CANDIDATE ANSWER SUBMITTED:
"${candidateAnswer}"`;

    try {
      const response = await openai.responses.create({
        model: OPENAI_MODEL,
        instructions,
        input,
        previous_response_id: previousResponseId,
        store: true,
        text: {
          format: {
            type: 'json_schema',
            name: 'interview_coaching',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                feedback: {
                  type: 'string',
                  description: 'Constructive markdown feedback evaluating the candidate\'s answer with score, strengths, weaknesses, and improvement steps.'
                },
                nextQuestion: {
                  type: 'string',
                  description: 'The next interview question in the sequence.'
                }
              },
              required: ['feedback', 'nextQuestion'],
              additionalProperties: false
            }
          }
        }
      } as any);

      const rawText = (response.output_text || '').trim();
      if (!rawText) {
        throw new Error('OpenAI Responses API returned an empty output text.');
      }

      const parsed = JSON.parse(rawText);

      return {
        feedback: parsed.feedback || 'Good attempt. Keep refining your explanations for maximum impact.',
        nextQuestion: parsed.nextQuestion || 'Could you elaborate on a challenging design decision you made recently?',
        openaiResponseId: response.id,
      };
    } catch (error) {
      console.error('Failed to parse structured output from Responses API, performing safe fallback:', error);
      
      // Fallback in case JSON parsing or response fails to keep session active
      return {
        feedback: 'Thank you for your answer. Let\'s keep moving forward with the interview questions.',
        nextQuestion: 'Could you share an example of a technical conflict you resolved in your team and the outcome?',
        openaiResponseId: previousResponseId, // Maintain same response ID node so we don't break the chain
      };
    }
  }
}
