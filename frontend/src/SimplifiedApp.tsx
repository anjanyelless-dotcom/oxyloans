import { useState, useRef, useEffect } from 'react';
import { apiClient } from './api/client';

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
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  questionId?: string; // For regenerate functionality
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

function SimplifiedApp() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [profileResendSuccess, setProfileResendSuccess] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTranscriptRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to manually resend profile to backend
  const resendProfileToBackend = async () => {
    if (!profile) return;
    
    try {
      await apiClient.post('/interviews/profile', profile);
      setProfileResendSuccess(true);
      console.log('✅ Profile manually re-sent to backend successfully');
      setTimeout(() => setProfileResendSuccess(false), 3000);
    } catch (err) {
      console.error('❌ Failed to manually re-send profile to backend:', err);
      setError('Failed to reconnect to backend. Please refresh the page.');
    }
  };

  // Load profile and messages from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('interviewProfile');
    const savedMessages = localStorage.getItem('chatHistory');
    const savedConversationHistory = localStorage.getItem('conversationHistory');
    if (savedProfile) {
      const parsedProfile = JSON.parse(savedProfile);
      setProfile(parsedProfile);
      setShowSetup(false);
      
      // Re-send profile to backend to handle server restarts
      apiClient.post('/interviews/profile', parsedProfile)
        .then(() => console.log('✅ Profile re-sent to backend successfully'))
        .catch(err => {
          console.error('❌ Failed to re-send profile to backend:', err);
          // If re-sending fails, clear the profile from state to force user to re-enter it
          setProfile(null);
          setShowSetup(true);
          localStorage.removeItem('interviewProfile');
        });
    }
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      // Convert timestamp strings back to Date objects
      const messagesWithDates = parsedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      setMessages(messagesWithDates);
    }
    if (savedConversationHistory) {
      setConversationHistory(JSON.parse(savedConversationHistory));
    }
  }, []);

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    if (profile) {
      localStorage.setItem('interviewProfile', JSON.stringify(profile));
    }
  }, [profile]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
  }, [messages]);

  // Save conversation history to localStorage whenever it changes
  useEffect(() => {
    if (conversationHistory.length > 0) {
      localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
    }
  }, [conversationHistory]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isManuallyStoppedRef.current = true;
      accumulatedTranscriptRef.current = '';
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleSetProfile = async (formData: any) => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('Form data received:', formData);
      
      // Transform form data to match backend expectations
      const profileData = {
        candidateName: formData.candidateName,
        experienceYears: formData.experienceYears,
        currentCompany: formData.currentCompany || '',
        currentRole: formData.currentRole || formData.targetRole || '',
        previousCompany: formData.previousCompany || '',
        previousRole: formData.previousRole || '',
        targetCompany: formData.targetCompany || '',
        jobTitle: formData.jobTitle || '',
        interviewRound: formData.interviewRound || 'Technical Round 1',
        resumeText: formData.resumeText || '',
        jobDescriptionText: formData.jobDescriptionText || ''
      };
      
      console.log('Profile data to send:', profileData);
      
      await apiClient.setProfile(profileData);
      setProfile(profileData);
      setShowSetup(false);
    } catch (err: any) {
      console.error('Error setting profile:', err);
      setError(err.message || 'Failed to set profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim()) return;

    try {
      setIsLoading(true);
      setError('');

      // Generate a unique ID for this question
      const questionId = Date.now().toString();

      // Add user message
      const userMessage: Message = {
        role: 'user',
        content: currentQuestion,
        timestamp: new Date(),
        questionId
      };
      setMessages(prev => [...prev, userMessage]);

      // Call API with conversation history
      const response: any = await apiClient.ask(currentQuestion, conversationHistory);

      // Update conversation history
      const newHistory: ConversationMessage[] = [
        ...conversationHistory,
        { role: 'user', content: currentQuestion },
        { role: 'assistant', content: response.answer }
      ];
      setConversationHistory(newHistory);

      // Add AI response
      const aiMessage: Message = {
        role: 'ai',
        content: response.answer,
        timestamp: new Date(),
        questionId // Link to the question
      };
      setMessages(prev => [...prev, aiMessage]);

      setCurrentQuestion('');
      accumulatedTranscriptRef.current = '';
      setInterimTranscript('');
    } catch (err: any) {
      setError(err.message || 'Failed to get answer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAnswer = (answer: string) => {
    navigator.clipboard.writeText(answer);
    // You could add a toast notification here
  };

  const handleRegenerateAnswer = async (originalQuestion: string, questionId: string) => {
    try {
      setIsLoading(true);
      setError('');

      // Remove the previous AI response and any subsequent messages
      const messageIndex = messages.findIndex(m => m.questionId === questionId);
      if (messageIndex !== -1) {
        setMessages(prev => prev.slice(0, messageIndex + 1));
        
        // Also remove from conversation history
        const historyIndex = conversationHistory.findIndex(h => h.content === originalQuestion && h.role === 'user');
        if (historyIndex !== -1) {
          setConversationHistory(prev => prev.slice(0, historyIndex));
        }
      }

      // Call API again with the same question and updated conversation history
      const response: any = await apiClient.ask(originalQuestion, conversationHistory);

      // Update conversation history
      const newHistory: ConversationMessage[] = [
        ...conversationHistory,
        { role: 'user', content: originalQuestion },
        { role: 'assistant', content: response.answer }
      ];
      setConversationHistory(newHistory);

      // Add new AI response with same questionId
      const aiMessage: Message = {
        role: 'ai',
        content: response.answer,
        timestamp: new Date(),
        questionId // Keep same questionId for regeneration tracking
      };
      setMessages(prev => [...prev, aiMessage]);

      setCurrentQuestion('');
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate answer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await apiClient.resetProfile();
      setProfile(null);
      setMessages([]);
      setCurrentQuestion('');
      setShowSetup(true);
      setError('');
      setConversationHistory([]);
      localStorage.removeItem('interviewProfile');
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('conversationHistory');
    } catch (err: any) {
      setError(err.message || 'Failed to reset profile');
    }
  };

  const startRecording = () => {
    try {
      setTranscriptionError(''); 
      setInterimTranscript('');
      accumulatedTranscriptRef.current = '';
      isManuallyStoppedRef.current = false;
      
      // Check if Web Speech API is supported
      if (!('webkitSpeechRecognition' in window)) {
        setTranscriptionError('Speech recognition is not supported in this browser. Please use Chrome.');
        return;
      }
      
      // Clear previous text when starting new recording
      setCurrentQuestion('');
      accumulatedTranscriptRef.current = '';
      
      // Create speech recognition instance
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = true; // Keep listening until manually stopped
      recognition.interimResults = true; // Show interim results for live feedback
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsRecording(true);
        console.log('Speech recognition started');
      };
      
      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';
        
        // Process all results from this event
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalText += transcript + ' ';
          } else {
            interimText += transcript;
          }
        }
        
        // Update accumulated transcript with final results
        accumulatedTranscriptRef.current += finalText;
        
        // Update interim transcript
        setInterimTranscript(interimText);
        
        // Update the input field with combined text
        const combinedText = accumulatedTranscriptRef.current + interimText;
        setCurrentQuestion(combinedText.trim());
        
        // Reset silence timer on speech detection
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        
        // Set new silence timer (3-4 seconds)
        silenceTimerRef.current = setTimeout(() => {
          if (!isManuallyStoppedRef.current) {
            console.log('Silence detected, stopping recording');
            stopRecording();
          }
        }, 3500); // 3.5 seconds of silence
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setTranscriptionError('Microphone access denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          setTranscriptionError('No speech detected. Please try again.');
        } else {
          setTranscriptionError(`Speech recognition error: ${event.error}`);
        }
        stopRecording();
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        
        // Auto-restart if not manually stopped and still supposed to be recording
        if (!isManuallyStoppedRef.current && isRecording) {
          console.log('Auto-restarting speech recognition');
          try {
            recognition.start();
          } catch (error) {
            console.error('Failed to auto-restart:', error);
            setIsRecording(false);
          }
        } else {
          setIsRecording(false);
          // Clear interim text on final stop
          setInterimTranscript('');
        }
      };
      
      recognition.start();
      
    } catch (error: any) {
      setTranscriptionError('Failed to start speech recognition: ' + error.message);
    }
  };

  const stopRecording = () => {
    isManuallyStoppedRef.current = true;
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setIsRecording(false);
    setInterimTranscript('');
    
    // Final cleanup - set the complete accumulated text
    setCurrentQuestion(accumulatedTranscriptRef.current.trim());
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (showSetup) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 flex items-center justify-center font-sans">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <h1 className="text-2xl font-bold mb-6 text-slate-800">AI Interview Answer Coach</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const profile: Profile = {
              candidateName: formData.get('candidateName') as string,
              experienceYears: parseInt(formData.get('experienceYears') as string),
              currentCompany: formData.get('currentCompany') as string,
              currentRole: formData.get('currentRole') as string,
              previousCompany: formData.get('previousCompany') as string,
              previousRole: formData.get('previousRole') as string,
              targetCompany: formData.get('targetCompany') as string,
              jobTitle: formData.get('jobTitle') as string,
              interviewRound: formData.get('interviewRound') as string,
              resumeText: formData.get('resumeText') as string,
              jobDescriptionText: formData.get('jobDescriptionText') as string,
            };
            handleSetProfile(profile);
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Candidate Name *</label>
              <input
                name="candidateName"
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Experience Years *</label>
              <input
                name="experienceYears"
                type="number"
                required
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Years of experience"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Company</label>
                <input
                  name="currentCompany"
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Current company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Role</label>
                <input
                  name="currentRole"
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Current role"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Previous Company</label>
                <input
                  name="previousCompany"
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Previous company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Previous Role</label>
                <input
                  name="previousRole"
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Previous role"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Company *</label>
                <input
                  name="targetCompany"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company you're interviewing for"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
                <input
                  name="jobTitle"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Position you're applying for"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Round</label>
              <select
                name="interviewRound"
                defaultValue="Technical Round 1"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Technical Round 1">Technical Round 1</option>
                <option value="Technical Round 2">Technical Round 2</option>
                <option value="Technical Round 3">Technical Round 3</option>
                <option value="HR Round">HR Round</option>
                <option value="Managerial Round">Managerial Round</option>
                <option value="System Design Round">System Design Round</option>
                <option value="Data Science Round">Data Science Round</option>
                <option value="DevOps Round">DevOps Round</option>
                <option value="QA Round">QA Round</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Resume Text *</label>
              <textarea
                name="resumeText"
                required
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste your full resume text here (projects, technologies, experience)..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Description *</label>
              <textarea
                name="jobDescriptionText"
                required
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste the job description here..."
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Setting Profile...' : 'Start Interview'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex items-center justify-center font-sans">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header with Profile Dropdown */}
        <div className="bg-slate-800 text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold">AI Interview Answer Coach</h1>
                {profile && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="text-sm text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      {profile.candidateName} • {profile.experienceYears} years exp • {profile.targetCompany} • {profile.interviewRound}
                      <span className="text-xs">▼</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSetup(true)}
                className="bg-slate-600 hover:bg-slate-700 px-3 py-2 rounded text-sm transition-colors"
              >
                Edit Profile
              </button>
              <button
                onClick={handleReset}
                className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
          
          {/* Profile Dropdown */}
          {showProfileDropdown && profile && (
            <div className="mt-4 p-3 bg-slate-700 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div><span className="text-slate-400">Name:</span> {profile.candidateName}</div>
                <div><span className="text-slate-400">Experience:</span> {profile.experienceYears} years</div>
                <div><span className="text-slate-400">Current:</span> {profile.currentCompany} ({profile.currentRole})</div>
                <div><span className="text-slate-400">Previous:</span> {profile.previousCompany} ({profile.previousRole})</div>
                <div><span className="text-slate-400">Target:</span> {profile.targetCompany} ({profile.jobTitle})</div>
                <div><span className="text-slate-400">Round:</span> {profile.interviewRound}</div>
              </div>
              <div className="border-t border-slate-600 pt-2">
                <button
                  onClick={resendProfileToBackend}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-xs"
                >
                  🔄 Reconnect Profile to Backend
                </button>
                {profileResendSuccess && (
                  <p className="text-green-400 text-xs mt-1 text-center">✅ Profile reconnected successfully!</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
          {messages.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              <p className="text-lg mb-2">👋 Welcome to your interview practice!</p>
              <p>Ask me any interview question and I'll answer as if I'm the candidate.</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                <div className="text-sm font-medium mb-1 flex justify-between items-center">
                  <span>{message.role === 'user' ? 'You' : 'AI Candidate'}</span>
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Action buttons for AI responses */}
                {message.role === 'ai' && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-slate-300">
                    <button
                      onClick={() => handleCopyAnswer(message.content)}
                      className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded transition-colors"
                      title="Copy answer"
                    >
                      📋 Copy
                    </button>
                    {message.questionId && (() => {
                      const userMessage = messages.find(m => m.questionId === message.questionId && m.role === 'user');
                      return userMessage ? (
                        <button
                          onClick={() => handleRegenerateAnswer(userMessage.content, message.questionId!)}
                          disabled={isLoading}
                          className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
                          title="Regenerate answer"
                        >
                          🔄 Regenerate
                        </button>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-lg p-4 max-w-[80%] border border-slate-200">
                <div className="text-sm font-medium mb-1">AI Candidate</div>
                <div className="text-slate-500 italic">thinking...</div>
              </div>
            </div>
          )}
          
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 rounded">
            {error}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleAsk} className="p-4 border-t border-slate-200">
          {transcriptionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 mb-3 rounded text-sm">
              {transcriptionError}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isLoading || isRecording}
              className={`p-3 rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              🎤
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder={isRecording ? "Listening... (click mic to stop)" : "Type your interview question here..."}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              {interimTranscript && isRecording && (
                <div className="absolute top-full left-0 right-0 mt-1 px-4 py-2 bg-slate-100 text-slate-500 rounded text-sm italic">
                  {interimTranscript}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !currentQuestion.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              Ask
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SimplifiedApp;