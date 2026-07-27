import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { StartInterviewRequest } from '../../../types';

interface SessionSetupFormProps {
  onSubmit: (data: StartInterviewRequest) => void;
  isLoading: boolean;
  validationErrors: Record<string, string>;
  error: string | null;
}

export function SessionSetupForm({
  onSubmit,
  isLoading,
  validationErrors,
  error,
}: SessionSetupFormProps) {
  const [formData, setFormData] = useState<StartInterviewRequest>({
    candidateName: '',
    experienceYears: 0,
    currentCompany: '',
    previousCompany: '',
    interviewCompany: '',
    targetRole: '',
    interviewRound: '',
    language: 'English',
    resumeText: '',
    jobDescription: '',
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'experienceYears' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white border border-slate-200 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">AI Interview Coach</h2>
      <p className="text-slate-500 mb-6">Enter your profile information and target job details to start a mock interview session.</p>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidate Information Group */}
        <div className="border-b border-slate-100 pb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Candidate Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="candidateName" className="block text-sm font-medium text-slate-700 mb-1">Candidate Name *</label>
              <input
                type="text"
                id="candidateName"
                name="candidateName"
                value={formData.candidateName}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-800"
              />
              {validationErrors.candidateName && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.candidateName}</p>
              )}
            </div>

            <div>
              <label htmlFor="experienceYears" className="block text-sm font-medium text-slate-700 mb-1">Years of Experience *</label>
              <input
                type="number"
                id="experienceYears"
                name="experienceYears"
                value={formData.experienceYears}
                onChange={handleChange}
                required
                min="0"
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-800"
              />
              {validationErrors.experienceYears && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.experienceYears}</p>
              )}
            </div>

            <div>
              <label htmlFor="currentCompany" className="block text-sm font-medium text-slate-700 mb-1">Current Company</label>
              <input
                type="text"
                id="currentCompany"
                name="currentCompany"
                value={formData.currentCompany}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-800"
              />
              {validationErrors.currentCompany && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.currentCompany}</p>
              )}
            </div>

            <div>
              <label htmlFor="previousCompany" className="block text-sm font-medium text-slate-700 mb-1">Previous Company</label>
              <input
                type="text"
                id="previousCompany"
                name="previousCompany"
                value={formData.previousCompany}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-800"
              />
              {validationErrors.previousCompany && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.previousCompany}</p>
              )}
            </div>
          </div>
        </div>

        {/* Target Interview details */}
        <div className="border-b border-slate-100 pb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Target Interview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="interviewCompany" className="block text-sm font-medium text-slate-700 mb-1">Interview Company *</label>
              <input
                type="text"
                id="interviewCompany"
                name="interviewCompany"
                value={formData.interviewCompany}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-800"
              />
              {validationErrors.interviewCompany && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.interviewCompany}</p>
              )}
            </div>

            <div>
              <label htmlFor="targetRole" className="block text-sm font-medium text-slate-700 mb-1">Target Role *</label>
              <input
                type="text"
                id="targetRole"
                name="targetRole"
                value={formData.targetRole}
                onChange={handleChange}
                required
                placeholder="e.g. Staff Software Engineer"
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-800"
              />
              {validationErrors.targetRole && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.targetRole}</p>
              )}
            </div>

            <div>
              <label htmlFor="interviewRound" className="block text-sm font-medium text-slate-700 mb-1">Interview Round *</label>
              <input
                type="text"
                id="interviewRound"
                name="interviewRound"
                value={formData.interviewRound}
                onChange={handleChange}
                required
                placeholder="e.g. System Design, Coding, Behavioral"
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-800"
              />
              {validationErrors.interviewRound && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.interviewRound}</p>
              )}
            </div>

            <div className="md:col-span-3">
              <label htmlFor="language" className="block text-sm font-medium text-slate-700 mb-1">Interview Language *</label>
              <select
                id="language"
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 bg-white"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Japanese">Japanese</option>
                <option value="Hindi">Hindi</option>
              </select>
              {validationErrors.language && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.language}</p>
              )}
            </div>
          </div>
        </div>

        {/* Text Area inputs */}
        <div className="space-y-4">
          <div>
            <label htmlFor="resumeText" className="block text-sm font-medium text-slate-700 mb-1">Resume Text *</label>
            <textarea
              id="resumeText"
              name="resumeText"
              value={formData.resumeText}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Paste the raw text of your resume here..."
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-800"
            />
            {validationErrors.resumeText && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.resumeText}</p>
            )}
          </div>

          <div>
            <label htmlFor="jobDescription" className="block text-sm font-medium text-slate-700 mb-1">Job Description *</label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Paste the target job description details here..."
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-800"
            />
            {validationErrors.jobDescription && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.jobDescription}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors cursor-pointer"
          >
            {isLoading ? 'Setting up Interview Session...' : 'Start Interview'}
          </button>
        </div>
      </form>
    </div>
  );
}
export default SessionSetupForm;
