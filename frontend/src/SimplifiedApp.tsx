import { useState, useRef, useEffect } from 'react';
import { apiClient } from './api/client';
import { ProfileSchema, type Profile, type ProfileInput, type Message, type ConversationMessage } from './validation/schemas';
import { z } from 'zod';

export default function SimplifiedApp() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcriptionError, setTranscriptionError] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');

  // Refs for voice recording
  const isRecordingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef('');
  const shouldBeListeningRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const isManuallyEditingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load profile and messages from localStorage on mount
  useEffect(() => {
    const loadProfileAndResend = async () => {
      const savedProfile = localStorage.getItem('interviewProfile');
      const savedMessages = localStorage.getItem('chatHistory');
      const savedConversationHistory = localStorage.getItem('conversationHistory');
      
      console.log('Loading saved data...', { 
        hasProfile: !!savedProfile, 
        hasMessages: !!savedMessages, 
        hasHistory: !!savedConversationHistory 
      });
      
      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile);
          console.log('Parsed profile from localStorage:', parsedProfile);
          
          // Validate the loaded profile with Zod schema
          const validatedProfile = ProfileSchema.parse(parsedProfile);
          setProfile(validatedProfile);
          setShowSetup(false);
          console.log('Profile validated and set successfully');
          
          // Re-send profile to backend to handle server restarts
          try {
            await apiClient.setProfile(validatedProfile);
            console.log('Profile re-sent to backend successfully');
          } catch (err) {
            console.error('Failed to re-send profile to backend:', err);
            // Don't clear profile or show error - backend reconnection failure shouldn't break the app
            // The profile is still valid locally, just backend needs it again
          }
        } catch (err) {
          console.error('Failed to validate saved profile:', err);
          if (err instanceof z.ZodError) {
            const errorMessages = err.issues.map((issue: any) => issue.message).join(', ');
            console.error('Validation errors:', errorMessages);
            setError('Invalid saved profile data: ' + errorMessages);
          } else {
            setError('Failed to validate saved profile');
          }
          // Only clear profile if validation actually fails
          setProfile(null);
          setShowSetup(true);
          localStorage.removeItem('interviewProfile');
          return;
        }
      } else {
        console.log('No saved profile found, showing setup');
        setShowSetup(true);
      }
      
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
          console.log('Loaded', messagesWithDates.length, 'messages from localStorage');
        } catch (err) {
          console.error('Failed to load saved messages:', err);
          // Don't block the app if messages fail to load
        }
      }
      
      if (savedConversationHistory) {
        try {
          setConversationHistory(JSON.parse(savedConversationHistory));
          console.log('Loaded conversation history from localStorage');
        } catch (err) {
          console.error('Failed to load conversation history:', err);
          // Don't block the app if history fails to load
        }
      }
    };
    
    loadProfileAndResend();
  }, []);

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    if (profile) {
      try {
        localStorage.setItem('interviewProfile', JSON.stringify(profile));
        console.log('Profile saved to localStorage');
      } catch (err) {
        console.error('Failed to save profile to localStorage:', err);
      }
    } else {
      // Only remove if explicitly set to null (not during initial load)
      console.log('Profile is null, not saving to localStorage');
    }
  }, [profile]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
        console.log('Messages saved to localStorage');
      } catch (err) {
        console.error('Failed to save messages to localStorage:', err);
      }
    }
  }, [messages]);

  // Save conversation history to localStorage whenever they change
  useEffect(() => {
    if (conversationHistory.length > 0) {
      try {
        localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
        console.log('Conversation history saved to localStorage');
      } catch (err) {
        console.error('Failed to save conversation history to localStorage:', err);
      }
    }
  }, [conversationHistory]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      fullTranscriptRef.current = '';
      isManuallyEditingRef.current = false;
      
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
      const profileData: ProfileInput = {
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
      
      // Validate profile data with Zod schema before sending
      const validatedProfile = ProfileSchema.parse(profileData);
      console.log('Validated profile:', validatedProfile);
      
      await apiClient.setProfile(validatedProfile);
      setProfile(validatedProfile);
      setShowSetup(false);
      console.log('Profile set successfully, localStorage will be updated by useEffect');
    } catch (err: any) {
      console.error('Error setting profile:', err);
      if (err instanceof z.ZodError) {
        const errorMessages = err.issues.map((issue: any) => issue.message).join(', ');
        setError('Invalid profile data: ' + errorMessages);
      } else {
        setError(err.message || 'Failed to set profile');
      }
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

      // Add empty AI message that will be filled with streaming content
      const aiMessage: Message = {
        role: 'ai',
        content: '',
        timestamp: new Date(),
        questionId
      };
      setMessages(prev => [...prev, aiMessage]);

      // Call streaming API with conversation history
      const response: any = await apiClient.askStream(
        currentQuestion, 
        conversationHistory,
        (token: string) => {
          // Update the AI message content as tokens arrive
          setMessages(prev => prev.map(msg => 
            msg.questionId === questionId && msg.role === 'ai'
              ? { ...msg, content: msg.content + token }
              : msg
          ));
        }
      );

      // Update conversation history
      const newHistory: ConversationMessage[] = [
        ...conversationHistory,
        { role: 'user', content: currentQuestion },
        { role: 'assistant', content: response.answer }
      ];
      setConversationHistory(newHistory);
      console.log('Conversation history updated:', newHistory);

      // Update the AI message with the final cleaned answer
      setMessages(prev => prev.map(msg => 
        msg.questionId === questionId && msg.role === 'ai'
          ? { ...msg, content: response.answer }
          : msg
      ));

      setCurrentQuestion('');
      fullTranscriptRef.current = '';
      setInterimTranscript('');
      isManuallyEditingRef.current = false;
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

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all saved data? This will remove your profile and conversation history.')) {
      localStorage.removeItem('interviewProfile');
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('conversationHistory');
      setProfile(null);
      setMessages([]);
      setConversationHistory([]);
      setShowSetup(true);
      isManuallyEditingRef.current = false;
      console.log('All data cleared from localStorage');
    }
  };

  const handleDebugLocalStorage = () => {
    const profile = localStorage.getItem('interviewProfile');
    const messages = localStorage.getItem('chatHistory');
    const history = localStorage.getItem('conversationHistory');
    
    console.log('=== LOCALSTORAGE DEBUG ===');
    console.log('Profile exists:', !!profile);
    console.log('Profile data:', profile ? JSON.parse(profile) : null);
    console.log('Messages exist:', !!messages);
    console.log('Messages count:', messages ? JSON.parse(messages).length : 0);
    console.log('History exists:', !!history);
    console.log('History count:', history ? JSON.parse(history).length : 0);
    console.log('========================');
    
    alert(`LocalStorage Debug:\n- Profile: ${profile ? 'EXISTS' : 'MISSING'}\n- Messages: ${messages ? JSON.parse(messages).length + ' messages' : 'MISSING'}\n- History: ${history ? JSON.parse(history).length + ' entries' : 'MISSING'}\n\nCheck console for detailed data.`);
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

      // Call streaming API again with the same question and updated conversation history
      const response: any = await apiClient.askStream(
        originalQuestion, 
        conversationHistory,
        (token: string) => {
          // Update the AI message content as tokens arrive
          setMessages(prev => prev.map(msg => 
            msg.questionId === questionId && msg.role === 'ai'
              ? { ...msg, content: msg.content + token }
              : msg
          ));
        }
      );

      // Update conversation history
      const newHistory: ConversationMessage[] = [
        ...conversationHistory,
        { role: 'user', content: originalQuestion },
        { role: 'assistant', content: response.answer }
      ];
      setConversationHistory(newHistory);
      console.log('Conversation history updated after regeneration:', newHistory);

      // Update the AI message with the final cleaned answer
      setMessages(prev => prev.map(msg => 
        msg.questionId === questionId && msg.role === 'ai'
          ? { ...msg, content: response.answer }
          : msg
      ));

      setCurrentQuestion('');
      fullTranscriptRef.current = '';
      isManuallyEditingRef.current = false;
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
      isManuallyEditingRef.current = false;
    } catch (err: any) {
      setError(err.message || 'Failed to reset profile');
    }
  };

  const createRecognition = (onTranscriptUpdate: (full: string, interim: string) => void) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setTranscriptionError('Speech recognition is not supported in this browser.');
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      restartAttemptsRef.current = 0;
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          fullTranscriptRef.current += text + ' ';
        } else {
          interim += text;
        }
      }
      
      // Only update the raw transcript box if user is not manually editing
      if (!isManuallyEditingRef.current) {
        onTranscriptUpdate(fullTranscriptRef.current, interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (['network', 'no-speech', 'aborted'].includes(event.error)) {
        console.log('Recoverable error, not stopping');
        return;
      }
      if (event.error === 'not-allowed') {
        shouldBeListeningRef.current = false;
        setTranscriptionError('Microphone permission denied. Please allow microphone access.');
      } else {
        setTranscriptionError('Speech recognition error: ' + event.error);
        shouldBeListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      isRecordingRef.current = false;
      
      // Only auto-restart if we're supposed to be listening and it wasn't a manual stop
      if (shouldBeListeningRef.current && restartAttemptsRef.current < 3) {
        restartAttemptsRef.current++;
        const delay = Math.min(1000 * restartAttemptsRef.current, 3000);
        console.log(`Auto-restarting in ${delay}ms (attempt ${restartAttemptsRef.current})`);
        setTimeout(() => {
          if (shouldBeListeningRef.current && !isRecordingRef.current) {
            const newRecognition = createRecognition(onTranscriptUpdate);
            if (newRecognition) {
              recognitionRef.current = newRecognition;
              try {
                newRecognition.start();
                isRecordingRef.current = true;
              } catch (error) {
                console.error('Failed to restart speech recognition:', error);
                shouldBeListeningRef.current = false;
              }
            }
          }
        }, delay);
      } else {
        console.log('Not auto-restarting (manual stop or max attempts reached)');
        shouldBeListeningRef.current = false;
      }
    };

    return recognition;
  };

  const startListening = () => {
    // Stop any existing recognition first
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    shouldBeListeningRef.current = true;
    restartAttemptsRef.current = 0;
    fullTranscriptRef.current = '';
    isManuallyEditingRef.current = false;
    
    const recognition = createRecognition((full: string, interim: string) => {
      setRawTranscript(full + interim);
      setInterimTranscript(interim);
    });
    
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
        isRecordingRef.current = true;
        setTranscriptionError('');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setTranscriptionError('Failed to start speech recognition');
        isRecordingRef.current = false;
      }
    }
  };

  const stopListening = () => {
    shouldBeListeningRef.current = false;
    isManuallyEditingRef.current = false;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    isRecordingRef.current = false;
    // Keep the transcript in the top box
  };

  const moveToQuestion = () => {
    setCurrentQuestion(rawTranscript.trim());
    setRawTranscript('');
    fullTranscriptRef.current = '';
    setInterimTranscript('');
    isManuallyEditingRef.current = false;
  };

  const clearRawTranscript = () => {
    setRawTranscript('');
    fullTranscriptRef.current = '';
    setInterimTranscript('');
    isManuallyEditingRef.current = false;
  };

  const clearCurrentQuestion = () => {
    setCurrentQuestion('');
  };

  const handleRawTranscriptFocus = () => {
    if (isRecordingRef.current) {
      isManuallyEditingRef.current = true;
    }
  };

  const handleRawTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawTranscript(e.target.value);
    if (isRecordingRef.current) {
      isManuallyEditingRef.current = true;
    }
  };

  const toggleRecording = () => {
    if (isRecordingRef.current) {
      stopListening();
    } else {
      // Clear previous transcript when starting fresh
      fullTranscriptRef.current = '';
      setRawTranscript('');
      setInterimTranscript('');
      isManuallyEditingRef.current = false;
      startListening();
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
            const profile: ProfileInput = {
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Company *</label>
              <input
                name="currentCompany"
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Current company"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Role *</label>
              <input
                name="currentRole"
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Current role"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Previous Company</label>
              <input
                name="previousCompany"
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Previous company (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Previous Role</label>
              <input
                name="previousRole"
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Previous role (optional)"
              />
            </div>

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
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Role *</label>
              <input
                name="jobTitle"
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Role you're interviewing for"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Round *</label>
              <input
                name="interviewRound"
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Technical Round 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Resume Text *</label>
              <textarea
                name="resumeText"
                required
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste your resume here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Description Text *</label>
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
                onClick={handleReset}
                className="bg-slate-600 hover:bg-slate-700 px-3 py-2 rounded text-sm transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
          
          {/* Profile Dropdown */}
          {showProfileDropdown && profile && (
            <div className="mt-4 p-3 bg-slate-700 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-400">Name:</span> {profile.candidateName}</div>
                <div><span className="text-slate-400">Experience:</span> {profile.experienceYears} years</div>
                <div><span className="text-slate-400">Current:</span> {profile.currentCompany} ({profile.currentRole})</div>
                <div><span className="text-slate-400">Previous:</span> {profile.previousCompany} ({profile.previousRole})</div>
                <div><span className="text-slate-400">Target:</span> {profile.targetCompany} ({profile.jobTitle})</div>
                <div><span className="text-slate-400">Round:</span> {profile.interviewRound}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-600">
                <button
                  onClick={async () => {
                    try {
                      await apiClient.setProfile(profile);
                      console.log('Profile manually re-sent to backend');
                      // Optional: show success feedback
                    } catch (err) {
                      console.error('Failed to manually re-send profile:', err);
                      setError('Failed to reconnect profile to backend');
                    }
                  }}
                  className="w-full bg-slate-600 hover:bg-slate-500 px-3 py-2 rounded text-xs transition-colors mb-2"
                >
                  Reconnect Profile to Backend
                </button>
                <button
                  onClick={handleDebugLocalStorage}
                  className="w-full bg-slate-600 hover:bg-slate-500 px-3 py-2 rounded text-xs transition-colors mb-2"
                >
                  Debug LocalStorage
                </button>
                <button
                  onClick={handleClearData}
                  className="w-full bg-red-600 hover:bg-red-500 px-3 py-2 rounded text-xs transition-colors"
                >
                  Clear All Data
                </button>
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
              <div className={`${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              } rounded-lg p-4 max-w-[80%]`}
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
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm italic">thinking...</span>
                </div>
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
          
          {/* Top Box - Raw Transcript (editable workspace) */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-500 font-medium">Raw Transcript (editable workspace)</label>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  value={rawTranscript}
                  onChange={handleRawTranscriptChange}
                  onFocus={handleRawTranscriptFocus}
                  placeholder="Click mic and start speaking... edit here to clean up your text"
                  className="w-full px-3 py-2 pr-20 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={isLoading}
                    className={`text-sm px-2 py-1 rounded transition-colors ${
                      isRecordingRef.current 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isRecordingRef.current ? 'Stop recording' : 'Start voice input'}
                  >
                    {isRecordingRef.current ? '🎤' : '🎤'}
                  </button>
                  {rawTranscript && (
                    <button
                      type="button"
                      onClick={clearRawTranscript}
                      className="text-sm text-slate-400 hover:text-slate-600 transition-colors px-1"
                      title="Clear transcript"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
            {interimTranscript && !isManuallyEditingRef.current && (
              <div className="text-xs text-slate-400 mt-1 italic">
                Hearing: {interimTranscript}
              </div>
            )}
          </div>

          {/* Move to Question Button */}
          <div className="flex justify-center my-2">
            <button
              type="button"
              onClick={moveToQuestion}
              disabled={!rawTranscript.trim()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              title="Move transcript to question box"
            >
              <span>↑</span>
              <span>Move to Question</span>
            </button>
          </div>

          {/* Bottom Box - Your Question (final) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-500 font-medium">Your Question (final, gets sent)</label>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  placeholder="Your final question will appear here..."
                  disabled={isLoading}
                  className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                {currentQuestion && (
                  <button
                    type="button"
                    onClick={clearCurrentQuestion}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Clear question"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || !currentQuestion.trim()}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}