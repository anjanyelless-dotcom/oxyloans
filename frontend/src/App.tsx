import { ErrorBoundary } from './features/interviews/components/ErrorBoundary';
import { SessionSetupForm } from './features/interviews/components/SessionSetupForm';
import { InterviewSession } from './features/interviews/components/InterviewSession';
import { useInterview } from './hooks/useInterview';

function App() {
  const {
    context,
    isLoading,
    isSubmitting,
    error,
    validationErrors,
    startInterview,
    submitAnswer,
    resetInterview,
  } = useInterview();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 py-8 px-4 flex items-center justify-center font-sans">
        {!context ? (
          <SessionSetupForm
            onSubmit={startInterview}
            isLoading={isLoading}
            validationErrors={validationErrors}
            error={error}
          />
        ) : (
          <InterviewSession
            context={context}
            isSubmitting={isSubmitting}
            error={error}
            submitAnswer={submitAnswer}
            resetInterview={resetInterview}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
