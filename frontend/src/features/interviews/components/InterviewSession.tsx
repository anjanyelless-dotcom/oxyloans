import React, { useState, useRef, useEffect } from 'react';
import type { InterviewContext } from '../../../types';

interface InterviewSessionProps {
  context: InterviewContext;
  isSubmitting: boolean;
  error: string | null;
  submitAnswer: (answer: string) => void;
  resetInterview: () => void;
}

export function InterviewSession({
  context,
  isSubmitting,
  error,
  submitAnswer,
  resetInterview,
}: InterviewSessionProps) {
  const [answer, setAnswer] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new history turns
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [context.history, isSubmitting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    submitAnswer(answer);
    setAnswer('');
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-2rem)] border border-slate-200 bg-white rounded-lg shadow-sm">
      {/* Session Metadata Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {context.target.role} Mock Interview
          </h2>
          <p className="text-xs text-slate-500">
            Company: <span className="font-semibold">{context.target.company}</span> | Round: <span className="font-semibold">{context.target.round}</span> | Candidate: <span className="font-semibold">{context.candidate.name}</span>
          </p>
        </div>
        <button
          onClick={resetInterview}
          className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-600 cursor-pointer"
        >
          Exit Interview
        </button>
      </div>

      {/* Conversation Thread Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
        {context.history.map((turn, index) => {
          const isInterviewer = turn.role === 'interviewer';
          
          if (isInterviewer) {
            return (
              <div key={turn.id || index} className="flex flex-col items-start max-w-3xl">
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-lg p-4 text-sm shadow-2xs">
                  <div className="font-semibold text-xs text-indigo-500 mb-1">INTERVIEWER QUESTION</div>
                  <p className="whitespace-pre-line leading-relaxed font-sans">{turn.content}</p>
                </div>
              </div>
            );
          } else {
            return (
              <div key={turn.id || index} className="flex flex-col items-end space-y-3">
                {/* Candidate Answer Bubble */}
                <div className="flex flex-col items-end max-w-3xl">
                  <div className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-4 text-sm">
                    <div className="font-semibold text-xs text-slate-400 mb-1 text-right">YOUR ANSWER</div>
                    <p className="whitespace-pre-line leading-relaxed">{turn.content}</p>
                  </div>
                </div>

                {/* Coaching Feedback Bubble */}
                {turn.feedback && (
                  <div className="w-full flex flex-col items-stretch max-w-3xl self-center bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-lg p-5 text-sm">
                    <div className="font-bold text-xs text-emerald-600 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      ✨ AI Coaching Coach Feedback
                    </div>
                    <div className="prose prose-emerald max-w-none text-xs leading-relaxed whitespace-pre-line">
                      {turn.feedback}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        })}

        {/* Loading Spinner for AI evaluation response */}
        {isSubmitting && (
          <div className="flex items-center space-x-2 text-slate-500 text-sm">
            <div className="animate-pulse w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>
            <div className="animate-pulse w-2.5 h-2.5 bg-indigo-600 rounded-full delay-150"></div>
            <div className="animate-pulse w-2.5 h-2.5 bg-indigo-600 rounded-full delay-300"></div>
            <span>Evaluating answer and formulating next question...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded text-sm font-medium">
            {error}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Answer Submission Input Bar */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
          <label htmlFor="answerInput" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Your Response
          </label>
          <div className="flex gap-3 items-end">
            <textarea
              id="answerInput"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isSubmitting}
              required
              rows={3}
              placeholder="Formulate and type your answer here..."
              className="flex-1 border border-slate-300 rounded p-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-800"
            />
            <button
              type="submit"
              disabled={isSubmitting || !answer.trim()}
              className="px-6 py-4 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 disabled:bg-indigo-400 h-full flex items-center justify-center transition-colors cursor-pointer text-sm"
            >
              Submit Answer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default InterviewSession;
