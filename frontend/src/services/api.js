// API service for interacting with FastAPI backend

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const token = localStorage.getItem('loomi_token');
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('text/csv') || contentType.includes('application/octet-stream') || contentType.includes('application/pdf'))) {
    return response.blob();
  }

  return response.json();
}


export const api = {
  // Authentication (Trainer)
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updatePassword: (data) => request('/auth/update-password', { method: 'POST', body: JSON.stringify(data) }),

  // Quizzes (Trainer)
  getQuizzes: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/quizzes${q ? `?${q}` : ''}`);
  },
  getQuiz: (id) => request(`/quizzes/${id}`),
  createQuiz: (data) => request('/quizzes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuiz: (id, data) => request(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuiz: (id) => request(`/quizzes/${id}`, { method: 'DELETE' }),
  duplicateQuiz: (id) => request(`/quizzes/${id}/duplicate`, { method: 'POST' }),
  addQuestionToQuiz: (quizId, data) => request(`/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  addBatchQuestionsToQuiz: (quizId, questions) => request(`/quizzes/${quizId}/questions/batch`, { method: 'POST', body: JSON.stringify(questions) }),
  updateQuizQuestion: (quizId, questionId, data) => request(`/quizzes/${quizId}/questions/${questionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuizQuestion: (quizId, questionId) => request(`/quizzes/${quizId}/questions/${questionId}`, { method: 'DELETE' }),
  exportQuizPDF: async (quizId, includeAnswers = false, filename = null) => {
    const blob = await request(`/quizzes/${quizId}/export-pdf?include_answers=${includeAnswers}`);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || (includeAnswers ? `loomi_quiz_${quizId}_answer_key.pdf` : `loomi_quiz_${quizId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Question Bank
  getQuestions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/questions${q ? `?${q}` : ''}`);
  },
  getQuestionCategories: () => request('/questions/categories'),
  getQuestion: (id) => request(`/questions/${id}`),
  createQuestion: (data) => request('/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id, data) => request(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),

  // Live Sessions (Host & Participant)
  getLiveActivity: () => request('/sessions/live-activity'),
  getSessions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/sessions${q ? `?${q}` : ''}`);
  },
  createSession: (quizId, settingsOverride = null) =>
    request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ quiz_id: quizId, settings_override: settingsOverride })
    }),
  getSession: (id) => request(`/sessions/${id}`),
  getSessionByCode: (code) => request(`/sessions/code/${code}`),
  validateSessionCode: (code) => request(`/sessions/code/${code}/validate`),
  startSession: (id) => request(`/sessions/${id}/start`, { method: 'POST' }),
  reviewQuestion: (id) => request(`/sessions/${id}/review-question`, { method: 'POST' }),
  showLeaderboard: (id) => request(`/sessions/${id}/show-leaderboard`, { method: 'POST' }),
  nextQuestion: (id) => request(`/sessions/${id}/next-question`, { method: 'POST' }),
  endSession: (id) => request(`/sessions/${id}/end`, { method: 'POST' }),

  // Participant Actions
  joinSession: (sessionCode, displayName) =>
    request('/participants/join', {
      method: 'POST',
      body: JSON.stringify({
        session_code: sessionCode,
        display_name: displayName
      })
    }),
  submitAnswer: (sessionId, participantId, questionId, selectedAnswer, responseTimeSeconds = 0.0) =>
    request('/participants/answer', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        participant_id: participantId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        response_time_seconds: responseTimeSeconds
      })
    }),
  getSessionParticipants: (sessionId) => request(`/participants/session/${sessionId}`),
  getParticipantState: (participantId) => request(`/participants/${participantId}/state`),

  // Reports & Analytics
  getDashboardData: () => request('/reports/dashboard'),
  getSessionReport: (sessionId) => request(`/reports/sessions/${sessionId}`),
  downloadReportCSV: async (sessionId, filename = 'report.csv') => {
    const blob = await request(`/reports/sessions/${sessionId}/csv`);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // AI Question Generation (Ollama)
  getAIHealth: () => request('/ai/health'),
  generateQuizAI: (data) => request('/ai/generate-quiz', { method: 'POST', body: JSON.stringify(data) }),
  improveQuestionAI: (data) => request('/ai/improve-question', { method: 'POST', body: JSON.stringify(data) }),
  suggestTopicsAI: (topicOrContext) =>
    request('/ai/suggest-topics', { method: 'POST', body: JSON.stringify({ topic_or_context: topicOrContext }) }),
  analyzePerformanceAI: (sessionId) =>
    request('/ai/analyze-performance', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),

  // Learning Material (PDF, PPT, PPTX) & AI Chat
  uploadMaterial: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/ai/upload-material', {
      method: 'POST',
      body: formData
    });
  },
  generateQuestionsFromFile: (materialId, numQuestions = 5, difficulty = 'medium') =>
    request('/ai/generate-from-file', {
      method: 'POST',
      body: JSON.stringify({ material_id: materialId, num_questions: numQuestions, difficulty })
    }),
  chatWithMaterial: (materialId, message, history = []) =>
    request('/ai/chat-with-material', {
      method: 'POST',
      body: JSON.stringify({ material_id: materialId, message, history })
    }),
  clearMaterial: (materialId) =>
    request(`/ai/material/${materialId}`, {
      method: 'DELETE'
    }),
  getMaterialStatus: (materialId) =>
    request(`/ai/material/${materialId}`),

  // Expanded AI Features
  regenerateQuestionAI: (data) =>
    request('/ai/regenerate-question', { method: 'POST', body: JSON.stringify(data) }),
  checkQuizQualityAI: (data) =>
    request('/ai/check-quiz-quality', { method: 'POST', body: JSON.stringify(data) }),
  generateStudyGuide: (materialId) =>
    request('/ai/study-guide', { method: 'POST', body: JSON.stringify({ material_id: materialId }) }),
  summarizeMaterial: (materialId, mode = 'short') =>
    request('/ai/summarize-material', { method: 'POST', body: JSON.stringify({ material_id: materialId, mode }) }),
  getAIQuizInsights: (sessionId) =>
    request('/ai/quiz-insights', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) })
};

export default api;
