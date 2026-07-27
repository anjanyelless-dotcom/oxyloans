import { useState } from 'react';
import { apiClient, APIError } from '../api/client';
import type { 
  StartInterviewRequest, 
  InterviewResponsePayload, 
  SubmitAnswerResponsePayload,
  InterviewContext
} from '../types';

export function useInterview() {
  const [context, setContext] = useState<InterviewContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [latestFeedback, setLatestFeedback] = useState<string | null>(null);

  /**
   * Dispatches request to launch the mock interview session.
   */
  const startInterview = async (data: StartInterviewRequest) => {
    setIsLoading(true);
    setError(null);
    setValidationErrors({});
    
    try {
      const result = await apiClient.post<InterviewResponsePayload, StartInterviewRequest>(
        '/interviews',
        data
      );
      setContext(result.context);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.code === 'VALIDATION_ERROR' && err.details) {
          const fieldMap: Record<string, string> = {};
          err.details.forEach((item) => {
            fieldMap[item.field] = item.message;
          });
          setValidationErrors(fieldMap);
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred while setting up the interview.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Dispatches the candidate's response to the current question.
   */
  const submitAnswer = async (answer: string) => {
    if (!context) return;
    setIsSubmitting(true);
    setError(null);
    setValidationErrors({});

    try {
      const result = await apiClient.post<SubmitAnswerResponsePayload, { answer: string }>(
        `/interviews/${context.sessionId}/respond`,
        { answer }
      );
      
      setLatestFeedback(result.feedback);
      setContext(result.context);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.code === 'VALIDATION_ERROR' && err.details) {
          const fieldMap: Record<string, string> = {};
          err.details.forEach((item) => {
            fieldMap[item.field] = item.message;
          });
          setValidationErrors(fieldMap);
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred while processing your answer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resets active hooks state back to setup mode.
   */
  const resetInterview = () => {
    setContext(null);
    setLatestFeedback(null);
    setError(null);
    setValidationErrors({});
  };

  return {
    context,
    isLoading,
    isSubmitting,
    error,
    validationErrors,
    latestFeedback,
    startInterview,
    submitAnswer,
    resetInterview,
  };
}
export default useInterview;
