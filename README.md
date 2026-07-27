# AI Interview Answer Coach

A simplified AI-powered mock interview coach that generates realistic candidate answers using your proven prompt engineering approach. The system simulates how a real job candidate would answer interview questions based on their resume, experience, and target job description.

## Features

- 🎯 **Realistic AI Answers**: Uses your exact prompt engineering for natural, human-like responses
- 👤 **Profile Management**: Set up candidate profile with experience, companies, resume, and job description
- 💬 **Interactive Chat**: Simple chat interface for asking interview questions
- 📋 **Copy Answers**: One-click copy to clipboard for easy reference
- 🔄 **Regenerate Answers**: Get different versions of answers if you're not satisfied
- 💾 **Local Storage**: Profile and chat history persist across browser refreshes
- 🎨 **Clean UI**: Modern chat interface with clear message styling
- 🚀 **Lightweight**: No database required, runs entirely in-memory

## Technology Stack

**Backend:**
- Node.js with TypeScript
- Express.js framework
- OpenAI GPT-4o API
- Zod validation

**Frontend:**
- React 19 with TypeScript
- Vite build tool
- Tailwind CSS v4

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   PORT=5001
   OPENAI_API_KEY=your-openai-api-key-here
   OPENAI_MODEL=gpt-4o
   ```

4. **Start the backend server:**
   ```bash
   npm run dev
   ```
   
   The server will start on `http://localhost:5001`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables (optional):**
   ```bash
   # Create .env file if you want to customize API URL
   echo "VITE_API_URL=http://localhost:5001/api" > .env
   ```

4. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   
   The frontend will start on `http://localhost:5173` (or next available port)

## Usage

### 1. Set Up Your Profile
- Fill in your personal information (name, experience, companies)
- Select your interview round (Technical, HR, Managerial, etc.)
- Paste your resume text
- Paste the job description you're interviewing for
- Click "Start Interview"

### 2. Ask Interview Questions
- Type your interview question in the input box
- Press Enter or click "Ask"
- The AI will generate a realistic candidate answer based on your profile
- Answers will include natural transitions, project references, and concrete details

### 3. Use Action Buttons
- **📋 Copy**: Copy the AI answer to clipboard
- **🔄 Regenerate**: Get a different version of the answer for the same question

### 4. Manage Your Session
- **Edit Profile**: Click to modify your profile without losing chat history
- **Reset**: Clear everything and start fresh
- Your profile and chat history are saved automatically in localStorage

## API Endpoints

### POST /api/interviews/profile
Set the candidate profile.

**Request:**
```json
{
  "candidateName": "John Doe",
  "experienceYears": 5,
  "currentCompany": "Tech Corp",
  "currentRole": "Senior Developer",
  "previousCompany": "Startup Inc",
  "previousRole": "Developer",
  "targetCompany": "Big Tech",
  "jobTitle": "Full Stack Engineer",
  "interviewRound": "Technical Round 1",
  "resumeText": "Your resume text...",
  "jobDescriptionText": "Job description..."
}
```

### GET /api/interviews/profile
Get the current profile.

### DELETE /api/interviews/profile
Reset the current profile.

### POST /api/interviews/ask
Ask an interview question and get AI-generated answer.

**Request:**
```json
{
  "question": "Tell me about a challenging project you worked on."
}
```

**Response:**
```json
{
  "status": "success",
  "answer": "Sure, a challenging project I worked on...",
  "recentProjectsUsed": ["Project Name"]
}
```

## Features in Detail

### Realistic Answer Generation
- Uses your exact prompt with 10 specific rules
- Natural transitions and filler words
- Project rotation to avoid repetition
- Concrete details (metrics, code snippets, tool names)
- Depth matching to experience level and interview round

### Local Storage Persistence
- Profile information saved automatically
- Chat history preserved across refreshes
- No database setup required
- Data stored locally in your browser

### Chat Interface
- Clear visual distinction between user and AI messages
- User messages: Blue background, right-aligned
- AI messages: Gray background, left-aligned
- Auto-scroll to latest messages
- Loading indicator ("thinking...")

### Profile Management
- Comprehensive profile setup form
- Dropdown for interview rounds
- Edit profile without losing chat history
- Profile summary in header with expandable details

## Environment Variables

### Backend (.env)
- `PORT`: Server port (default: 5001)
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `OPENAI_MODEL`: OpenAI model to use (default: gpt-4o)

### Frontend (.env)
- `VITE_API_URL`: Backend API URL (default: http://localhost:5001/api)

## Project Structure

```
ai-interview-coach/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── openai.ts           # OpenAI client configuration
│   │   ├── features/
│   │   │   └── interviews/
│   │   │       ├── controllers/
│   │   │       │   └── ask.controller.ts
│   │   │       ├── routes/
│   │   │       │   └── ask.routes.ts
│   │   │       ├── services/
│   │   │       │   └── openai.service.ts
│   │   │       ├── types/
│   │   │       │   └── interview.types.ts
│   │   │       └── validation/
│   │   │           └── interview.schema.ts
│   │   ├── middleware/
│   │   │   ├── error.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── services/
│   │   │   └── simple-prompt.service.ts  # Your exact prompt
│   │   └── index.ts
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── SimplifiedApp.tsx       # Main chat interface
│   │   ├── main.tsx
│   │   └── index.css
│   └── package.json
└── README.md
```

## Development

### Backend Commands
```bash
npm run dev    # Start development server
npm run build  # Build for production
npm start      # Run production build
npm test       # Run tests
```

### Frontend Commands
```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run lint   # Run linter
```

## Troubleshooting

### Backend won't start
- Check if port 5001 is already in use
- Verify your OpenAI API key is correct
- Ensure all dependencies are installed

### Frontend can't connect to backend
- Make sure backend is running on port 5001
- Check VITE_API_URL environment variable
- Check browser console for CORS errors

### Answers seem robotic
- Verify OPENAI_MODEL is set to "gpt-4o"
- Check that the prompt service is using your exact prompt
- Temperature should be 0.85 for natural responses

## License

This project is for personal use and interview preparation.

## Support

For issues or questions, please check the troubleshooting section or review the code comments.