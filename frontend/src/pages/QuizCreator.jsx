import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Save,
  Play,
  PlusCircle,
  Database,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  Flame,
  Zap,
  Sparkles,
  HelpCircle,
  CheckSquare,
  FileQuestion,
  UploadCloud,
  FileText,
  FileCheck,
  MessageSquare,
  Send,
  RotateCcw,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Bot,
  User,
  X,
  FileDown,
  Download,
  RefreshCw,
  BookOpen,
  Check,
  Copy,
  AlertTriangle,
  ShieldCheck,
  ListFilter
} from 'lucide-react';
import Modal from '../components/Modal';
import AIGenerateModal from '../components/AIGenerateModal';
import { api } from '../services/api';

export default function QuizCreator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Employee Training');
  const [instructions, setInstructions] = useState('');

  // Settings
  const [timeLimit, setTimeLimit] = useState(30);
  const [timebombEnabled, setTimebombEnabled] = useState(true);
  const [speedBonus, setSpeedBonus] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showAnswersMode, setShowAnswersMode] = useState('immediate');

  // Selected Questions list
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Active Creation Mode Tab: 'manual' | 'topic' | 'material'
  const [activeTab, setActiveTab] = useState('manual');

  // ---------------- LEARNING MATERIAL STATE (Option 3) ----------------
  const [material, setMaterial] = useState(null); // { material_id, filename, character_count, word_count, preview, unit_count, unit_label }
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [materialError, setMaterialError] = useState('');
  const [fileQuestionCount, setFileQuestionCount] = useState(5);
  const [fileDifficulty, setFileDifficulty] = useState('medium');
  const [customFileCount, setCustomFileCount] = useState('');
  const [isCustomFileCount, setIsCustomFileCount] = useState(false);
  const [generatingFromFile, setGeneratingFromFile] = useState(false);
  const [fileGenStatus, setFileGenStatus] = useState('');
  const [fileGenError, setFileGenError] = useState('');
  const fileInputRef = useRef(null);

  // ---------------- FLOATING AI CHAT STATE ----------------
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatBottomRef = useRef(null);
  const chatInputRef = useRef(null);

  // ---------------- PDF EXPORT MODAL STATE ----------------
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState('');

  // ---------------- GENERATE FROM TOPIC STATE (Option 2) ----------------
  const [topicPrompt, setTopicPrompt] = useState('');
  const [topicCount, setTopicCount] = useState(5);
  const [customTopicCount, setCustomTopicCount] = useState('');
  const [isCustomTopicCount, setIsCustomTopicCount] = useState(false);
  const [topicDifficulty, setTopicDifficulty] = useState('medium');
  const [generatingFromTopic, setGeneratingFromTopic] = useState(false);
  const [topicGenStatus, setTopicGenStatus] = useState('');
  const [topicGenError, setTopicGenError] = useState('');
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // ---------------- QUESTION BANK STATE ----------------
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);

  // ---------------- INLINE NEW QUESTION STATE (Option 1) ----------------
  const [inlineModalOpen, setInlineModalOpen] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState('multiple_choice');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState([
    { id: 'opt_1', text: '', is_correct: true },
    { id: 'opt_2', text: '', is_correct: false },
    { id: 'opt_3', text: '', is_correct: false },
    { id: 'opt_4', text: '', is_correct: false }
  ]);
  const [newShortAnswer, setNewShortAnswer] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('medium');

  // ---------------- EDIT EXISTING QUESTION STATE ----------------
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editQuestionType, setEditQuestionType] = useState('multiple_choice');
  const [editText, setEditText] = useState('');
  const [editOptions, setEditOptions] = useState([]);
  const [editShortAnswer, setEditShortAnswer] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('medium');
  const [editTimeLimit, setEditTimeLimit] = useState(30);

  // ---------------- AI QUESTION IMPROVER STATE ----------------
  const [improveModalOpen, setImproveModalOpen] = useState(false);
  const [improvingIndex, setImprovingIndex] = useState(null);
  const [improveLoading, setImproveLoading] = useState(false);
  const [improvedResult, setImprovedResult] = useState(null);
  const [improveError, setImproveError] = useState('');

  // ---------------- REGENERATE QUESTION STATE ----------------
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [regeneratedResult, setRegeneratedResult] = useState(null);
  const [regenerateError, setRegenerateError] = useState('');

  // ---------------- QUIZ QUALITY CHECK STATE ----------------
  const [qualityModalOpen, setQualityModalOpen] = useState(false);
  const [qualityCheckLoading, setQualityCheckLoading] = useState(false);
  const [qualityReport, setQualityReport] = useState(null);
  const [qualityError, setQualityError] = useState('');

  // ---------------- STUDY GUIDE STATE ----------------
  const [studyGuideModalOpen, setStudyGuideModalOpen] = useState(false);
  const [studyGuideLoading, setStudyGuideLoading] = useState(false);
  const [studyGuideData, setStudyGuideData] = useState(null);
  const [studyGuideError, setStudyGuideError] = useState('');
  const [copiedStudyGuide, setCopiedStudyGuide] = useState(false);

  // ---------------- MATERIAL SUMMARY STATE ----------------
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryMode, setSummaryMode] = useState('short');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);


  useEffect(() => {
    if (editId) {
      loadQuizForEdit(editId);
    }
  }, [editId]);

  useEffect(() => {
    if (chatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading, chatOpen]);

  useEffect(() => {
    if (chatOpen && chatInputRef.current) {
      setTimeout(() => chatInputRef.current?.focus(), 150);
    }
  }, [chatOpen]);

  const loadQuizForEdit = async (id) => {
    try {
      setLoading(true);
      const quiz = await api.getQuiz(id);
      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setCategory(quiz.category || 'Employee Training');
      setInstructions(quiz.instructions || '');

      const s = quiz.settings || {};
      setTimeLimit(s.time_limit || 30);
      setTimebombEnabled(s.timebomb_enabled !== false);
      setSpeedBonus(s.speed_bonus !== false);
      setShuffleQuestions(Boolean(s.shuffle_questions));
      setShowAnswersMode(s.show_answers_mode || 'immediate');

      if (quiz.quiz_questions) {
        const qs = quiz.quiz_questions
          .sort((a, b) => a.question_order - b.question_order)
          .map((qq) => qq.question)
          .filter(Boolean);
        setSelectedQuestions(qs);
      }
    } catch (err) {
      alert(`Failed to load quiz: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- MATERIAL UPLOAD & RESET ----------------
  const handleFileUpload = async (file) => {
    if (!file) return;
    const allowed = ['.pdf', '.ppt', '.pptx', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setMaterialError('Unsupported file type. Please upload a PDF, PPT, or PPTX presentation.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setMaterialError('File exceeds 20MB limit. Please upload a smaller document.');
      return;
    }

    try {
      setUploadingMaterial(true);
      setMaterialError('');
      setFileGenStatus('');
      setFileGenError('');

      const res = await api.uploadMaterial(file);
      setMaterial(res);
      const unitText = res.unit_count ? `${res.unit_count} ${res.unit_label || 'pages'}, ` : '';
      setChatMessages([
        {
          sender: 'assistant',
          text: `Document **"${res.filename}"** processed successfully (${unitText}${res.word_count.toLocaleString()} words). Ask me any question about this material to verify key concepts, or generate questions for your quiz.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Material upload error:', err);
      setMaterialError(err.message || 'Failed to process document. Please ensure file contains readable text.');
    } finally {
      setUploadingMaterial(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearMaterial = async () => {
    if (material?.material_id) {
      try {
        await api.clearMaterial(material.material_id);
      } catch (err) {
        console.warn('Clear material request warning:', err);
      }
    }
    setMaterial(null);
    setChatMessages([]);
    setChatInput('');
    setChatError('');
    setFileGenStatus('');
    setFileGenError('');
    setMaterialError('');
  };

  // ---------------- GENERATE FROM FILE ----------------
  const handleGenerateFromFile = async () => {
    if (!material?.material_id) {
      setFileGenError('Please upload a document first.');
      return;
    }

    const count = isCustomFileCount ? (parseInt(customFileCount, 10) || 5) : fileQuestionCount;
    if (count < 1 || count > 50) {
      setFileGenError('Please select between 1 and 50 questions.');
      return;
    }

    try {
      setGeneratingFromFile(true);
      setFileGenError('');
      setFileGenStatus(`Reading material and crafting ${count} questions using local AI...`);

      const res = await api.generateQuestionsFromFile(material.material_id, count, fileDifficulty);
      const list = res.questions || [];

      if (list.length === 0) {
        throw new Error('Could not extract questions from this material. Please try asking AI in the chat box or uploading a richer document.');
      }

      const formatted = list.map((q, idx) => ({
        id: `gen_file_${Date.now()}_${idx}`,
        question_type: 'multiple_choice',
        question_text: q.question_text || '',
        options: (q.options || []).map((opt, optIdx) => ({
          id: opt.id || `opt_${optIdx + 1}`,
          text: opt.text || opt,
          is_correct: opt.is_correct || false
        })),
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || '',
        category: category || 'General',
        difficulty: q.difficulty || fileDifficulty || 'medium',
        default_time_limit: timeLimit,
        default_points: 100
      }));

      // Ensure at least one correct option
      formatted.forEach((q) => {
        if (q.options.length > 0 && !q.options.some((o) => o.is_correct)) {
          q.options[0].is_correct = true;
          q.correct_answer = q.options[0].text;
        }
      });

      setSelectedQuestions((prev) => [...prev, ...formatted]);
      setFileGenStatus(`✅ Generated ${formatted.length} questions from "${material.filename}"! You can review, edit, and reorder them in the list below.`);
    } catch (err) {
      console.error('File generation error:', err);
      setFileGenError(err.message || 'Failed to generate questions. Ensure Ollama is running.');
    } finally {
      setGeneratingFromFile(false);
    }
  };

  // ---------------- FLOATING AI CHAT HANDLER ----------------
  const handleSendChatMessage = async (presetText = null) => {
    const textToSend = (presetText || chatInput).trim();
    if (!textToSend) {
      setChatError('Please enter a question.');
      return;
    }

    if (!material?.material_id) {
      setChatError('Please upload and process learning material first.');
      return;
    }

    if (chatLoading) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatError('');

    try {
      setChatLoading(true);
      const history = chatMessages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await api.chatWithMaterial(material.material_id, textToSend, history);
      const replyText = res.reply || res.response || 'I could not find that information in the uploaded material. You can try asking about a topic covered in the document.';
      const aiMsg = {
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Material chat error:', err);
      let errMsg = 'Unable to get an AI response. Please try again.';
      if (err.message && err.message.toLowerCase().includes('ollama')) {
        errMsg = 'AI chat is currently unavailable. Please make sure Ollama is running.';
      }
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `⚠️ ${errMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setChatError(errMsg);
    } finally {
      setChatLoading(false);
    }
  };

  // ---------------- PDF EXPORT HANDLER ----------------
  const handleTriggerExport = (includeAnswers = false) => {
    if (!editId) {
      alert('Please save the quiz before exporting it as a PDF.');
      return;
    }
    setPdfModalOpen(true);
    setExportError('');
  };

  const handleExecuteExportPdf = async (includeAnswers = false) => {
    if (!editId) {
      alert('Please save the quiz before exporting it as a PDF.');
      return;
    }

    try {
      setExportingPdf(true);
      setExportError('');
      const cleanTitle = (title || 'quiz').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 35);
      const filename = includeAnswers ? `loomi_${cleanTitle}_answer_key.pdf` : `loomi_${cleanTitle}_quiz.pdf`;
      await api.exportQuizPDF(editId, includeAnswers, filename);
      setPdfModalOpen(false);
    } catch (err) {
      console.error('Export PDF error:', err);
      setExportError(err.message || 'Failed to export PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  // ---------------- GENERATE FROM TOPIC (Option 2) ----------------
  const handleGenerateFromTopic = async () => {
    if (!topicPrompt.trim()) {
      setTopicGenError('Please enter a topic or learning objective.');
      return;
    }

    const count = isCustomTopicCount ? (parseInt(customTopicCount, 10) || 5) : topicCount;
    if (count < 1 || count > 50) {
      setTopicGenError('Please select between 1 and 50 questions.');
      return;
    }

    try {
      setGeneratingFromTopic(true);
      setTopicGenError('');
      setTopicGenStatus(`Generating ${count} questions with local Ollama AI...`);

      const response = await api.generateQuizAI({
        topic: topicPrompt.trim(),
        num_questions: count,
        difficulty: topicDifficulty,
        question_type: 'multiple_choice'
      });

      const list = (response?.questions || []).map((q, idx) => ({
        id: `gen_topic_${Date.now()}_${idx}`,
        question_type: 'multiple_choice',
        question_text: q.question_text || '',
        options: (q.options || []).map((opt, optIdx) => ({
          id: opt.id || `opt_${optIdx + 1}`,
          text: opt.text || opt,
          is_correct: opt.is_correct || false
        })),
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || '',
        category: category || 'General',
        difficulty: topicDifficulty,
        default_time_limit: timeLimit,
        default_points: 100
      }));

      list.forEach((q) => {
        if (q.options.length > 0 && !q.options.some((o) => o.is_correct)) {
          q.options[0].is_correct = true;
          q.correct_answer = q.options[0].text;
        }
      });

      if (list.length === 0) {
        throw new Error('No questions generated. Please try with more context.');
      }

      setSelectedQuestions((prev) => [...prev, ...list]);
      setTopicGenStatus(`✅ Generated ${list.length} questions on "${topicPrompt}"!`);
      setTopicPrompt('');
    } catch (err) {
      console.error('Topic generation error:', err);
      setTopicGenError(err.message || 'Failed to generate questions. Ensure Ollama is running.');
    } finally {
      setGeneratingFromTopic(false);
    }
  };

  // ---------------- QUESTION BANK MODAL ----------------
  const openBankModal = async () => {
    try {
      const data = await api.getQuestions();
      setBankQuestions(data);
      setBankModalOpen(true);
    } catch (err) {
      alert(`Could not load question bank: ${err.message}`);
    }
  };

  const toggleBankQuestion = (q) => {
    const exists = selectedQuestions.some((item) => item.id === q.id);
    if (exists) {
      setSelectedQuestions(selectedQuestions.filter((item) => item.id !== q.id));
    } else {
      setSelectedQuestions([...selectedQuestions, q]);
    }
  };

  // ---------------- QUESTION REORDERING & DELETION ----------------
  const handleMove = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= selectedQuestions.length) return;
    const copy = [...selectedQuestions];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setSelectedQuestions(copy);
  };

  const handleRemoveQuestion = (index) => {
    const q = selectedQuestions[index];
    const preview = q?.question_text ? `"${q.question_text.slice(0, 45)}..."` : `Question #${index + 1}`;
    if (!window.confirm(`Are you sure you want to delete ${preview}?`)) return;
    setSelectedQuestions(selectedQuestions.filter((_, i) => i !== index));
  };

  // ---------------- QUESTION TYPE HANDLERS & HELPERS ----------------
  const handleNewQuestionTypeChange = (type) => {
    setNewQuestionType(type);
    if (type === 'true_false') {
      setNewOptions([
        { id: 'opt_true', text: 'True', is_correct: true },
        { id: 'opt_false', text: 'False', is_correct: false }
      ]);
    } else if (type === 'multiple_choice' || type === 'multiple_select') {
      if (newOptions.length < 2) {
        setNewOptions([
          { id: 'opt_1', text: '', is_correct: true },
          { id: 'opt_2', text: '', is_correct: false },
          { id: 'opt_3', text: '', is_correct: false },
          { id: 'opt_4', text: '', is_correct: false }
        ]);
      }
    } else if (type === 'short_answer') {
      setNewOptions([]);
      setNewShortAnswer('');
    }
  };

  const handleEditQuestionTypeChange = (type) => {
    setEditQuestionType(type);
    if (type === 'true_false') {
      setEditOptions([
        { id: 'opt_true', text: 'True', is_correct: true },
        { id: 'opt_false', text: 'False', is_correct: false }
      ]);
    } else if (type === 'multiple_choice' || type === 'multiple_select') {
      if (editOptions.length < 2) {
        setEditOptions([
          { id: 'opt_1', text: '', is_correct: true },
          { id: 'opt_2', text: '', is_correct: false },
          { id: 'opt_3', text: '', is_correct: false },
          { id: 'opt_4', text: '', is_correct: false }
        ]);
      }
    } else if (type === 'short_answer') {
      setEditOptions([]);
    }
  };

  const handleAddOption = (isEdit = false) => {
    if (isEdit) {
      if (editOptions.length >= 6) return;
      const nextId = `opt_${editOptions.length + 1}`;
      setEditOptions([...editOptions, { id: nextId, text: '', is_correct: false }]);
    } else {
      if (newOptions.length >= 6) return;
      const nextId = `opt_${newOptions.length + 1}`;
      setNewOptions([...newOptions, { id: nextId, text: '', is_correct: false }]);
    }
  };

  const handleRemoveOption = (idx, isEdit = false) => {
    if (isEdit) {
      if (editOptions.length <= 2) {
        alert('Multiple choice questions require at least 2 options.');
        return;
      }
      const updated = editOptions.filter((_, i) => i !== idx);
      if (!updated.some((o) => o.is_correct) && updated.length > 0) {
        updated[0].is_correct = true;
      }
      setEditOptions(updated);
    } else {
      if (newOptions.length <= 2) {
        alert('Multiple choice questions require at least 2 options.');
        return;
      }
      const updated = newOptions.filter((_, i) => i !== idx);
      if (!updated.some((o) => o.is_correct) && updated.length > 0) {
        updated[0].is_correct = true;
      }
      setNewOptions(updated);
    }
  };

  // ---------------- MANUAL INLINE QUESTION CREATION (Option 1) ----------------
  const handleCreateInlineQuestion = async () => {
    if (!newQuestionText.trim()) {
      alert('Question text cannot be empty.');
      return;
    }

    let finalOptions = [...newOptions];
    let finalCorrectAnswer = '';

    if (newQuestionType === 'true_false') {
      if (finalOptions.length !== 2) {
        finalOptions = [
          { id: 'opt_true', text: 'True', is_correct: true },
          { id: 'opt_false', text: 'False', is_correct: false }
        ];
      }
      const correctOpt = finalOptions.find((o) => o.is_correct);
      if (!correctOpt) {
        alert('Please select whether True or False is the correct answer.');
        return;
      }
      finalCorrectAnswer = correctOpt.text;
    } else if (newQuestionType === 'short_answer') {
      if (!newShortAnswer.trim()) {
        alert('Please provide the expected correct answer.');
        return;
      }
      finalCorrectAnswer = newShortAnswer.trim();
      finalOptions = [];
    } else if (newQuestionType === 'multiple_select') {
      if (finalOptions.length < 2) {
        alert('Please provide at least 2 answer options.');
        return;
      }
      for (let i = 0; i < finalOptions.length; i++) {
        if (!finalOptions[i].text || !finalOptions[i].text.trim()) {
          alert(`Option ${String.fromCharCode(65 + i)} cannot be empty.`);
          return;
        }
      }
      const correctOpts = finalOptions.filter((o) => o.is_correct);
      if (correctOpts.length === 0) {
        alert('Please select at least one correct option.');
        return;
      }
      finalCorrectAnswer = correctOpts.map((o) => o.text).join(', ');
    } else {
      // multiple_choice
      if (finalOptions.length < 2) {
        alert('Please provide at least 2 answer options.');
        return;
      }
      for (let i = 0; i < finalOptions.length; i++) {
        if (!finalOptions[i].text || !finalOptions[i].text.trim()) {
          alert(`Option ${String.fromCharCode(65 + i)} cannot be empty.`);
          return;
        }
      }
      const correctOpt = finalOptions.find((o) => o.is_correct);
      if (!correctOpt) {
        alert('Please select the single correct answer.');
        return;
      }
      finalCorrectAnswer = correctOpt.text;
    }

    const questionObj = {
      id: `manual_${Date.now()}`,
      question_type: newQuestionType,
      question_text: newQuestionText.trim(),
      options: finalOptions,
      correct_answer: finalCorrectAnswer,
      explanation: newExplanation.trim(),
      category: category,
      difficulty: newDifficulty,
      default_time_limit: timeLimit,
      default_points: 100
    };

    setSelectedQuestions([...selectedQuestions, questionObj]);
    setInlineModalOpen(false);

    // Reset inline form
    setNewQuestionText('');
    setNewExplanation('');
    setNewShortAnswer('');
    setNewQuestionType('multiple_choice');
    setNewOptions([
      { id: 'opt_1', text: '', is_correct: true },
      { id: 'opt_2', text: '', is_correct: false },
      { id: 'opt_3', text: '', is_correct: false },
      { id: 'opt_4', text: '', is_correct: false }
    ]);
  };

  // ---------------- EDIT QUESTION MODAL ----------------
  const handleOpenEditQuestion = (index) => {
    const q = selectedQuestions[index];
    if (!q) return;
    setEditingIndex(index);
    setEditText(q.question_text || '');
    const detectedType = q.question_type || (q.options?.length === 2 && q.options.some((o) => o.text === 'True') ? 'true_false' : 'multiple_choice');
    setEditQuestionType(detectedType);
    setEditOptions(
      (q.options || []).map((opt, i) => ({
        id: opt.id || `opt_${i + 1}`,
        text: opt.text || '',
        is_correct: Boolean(opt.is_correct)
      }))
    );
    setEditShortAnswer(q.correct_answer || '');
    setEditExplanation(q.explanation || '');
    setEditDifficulty(q.difficulty || 'medium');
    setEditTimeLimit(q.default_time_limit || timeLimit);
    setEditModalOpen(true);
  };

  const handleSaveEditedQuestion = () => {
    if (editingIndex === null || !editText.trim()) {
      alert('Question text cannot be empty.');
      return;
    }

    let finalOptions = [...editOptions];
    let finalCorrectAnswer = '';

    if (editQuestionType === 'true_false') {
      if (finalOptions.length !== 2) {
        finalOptions = [
          { id: 'opt_true', text: 'True', is_correct: true },
          { id: 'opt_false', text: 'False', is_correct: false }
        ];
      }
      const correctOpt = finalOptions.find((o) => o.is_correct);
      if (!correctOpt) {
        alert('Please select whether True or False is the correct answer.');
        return;
      }
      finalCorrectAnswer = correctOpt.text;
    } else if (editQuestionType === 'short_answer') {
      if (!editShortAnswer.trim()) {
        alert('Please provide the expected correct answer.');
        return;
      }
      finalCorrectAnswer = editShortAnswer.trim();
      finalOptions = [];
    } else if (editQuestionType === 'multiple_select') {
      if (finalOptions.length < 2) {
        alert('Please provide at least 2 answer options.');
        return;
      }
      for (let i = 0; i < finalOptions.length; i++) {
        if (!finalOptions[i].text || !finalOptions[i].text.trim()) {
          alert(`Option ${String.fromCharCode(65 + i)} cannot be empty.`);
          return;
        }
      }
      const correctOpts = finalOptions.filter((o) => o.is_correct);
      if (correctOpts.length === 0) {
        alert('Please select at least one correct option.');
        return;
      }
      finalCorrectAnswer = correctOpts.map((o) => o.text).join(', ');
    } else {
      // multiple_choice
      if (finalOptions.length < 2) {
        alert('Please provide at least 2 answer options.');
        return;
      }
      for (let i = 0; i < finalOptions.length; i++) {
        if (!finalOptions[i].text || !finalOptions[i].text.trim()) {
          alert(`Option ${String.fromCharCode(65 + i)} cannot be empty.`);
          return;
        }
      }
      const correctOpt = finalOptions.find((o) => o.is_correct);
      if (!correctOpt) {
        alert('Please select the single correct answer.');
        return;
      }
      finalCorrectAnswer = correctOpt.text;
    }

    const copy = [...selectedQuestions];
    copy[editingIndex] = {
      ...copy[editingIndex],
      question_type: editQuestionType,
      question_text: editText.trim(),
      options: finalOptions,
      correct_answer: finalCorrectAnswer,
      explanation: editExplanation.trim(),
      difficulty: editDifficulty,
      default_time_limit: parseInt(editTimeLimit, 10)
    };

    setSelectedQuestions(copy);
    setEditModalOpen(false);
    setEditingIndex(null);
  };

  // ---------------- AI QUESTION IMPROVER HANDLERS ----------------
  const handleOpenImproveModal = async (index) => {
    const targetQ = selectedQuestions[index];
    if (!targetQ) return;
    setImprovingIndex(index);
    setImprovedResult(null);
    setImproveError('');
    setImproveModalOpen(true);
    setImproveLoading(true);

    try {
      const correctOpt = (targetQ.options || []).find((o) => o.is_correct);
      const res = await api.improveQuestionAI({
        question_text: targetQ.question_text,
        options: (targetQ.options || []).map((o) => (typeof o === 'string' ? o : o.text || '')),
        correct_answer: targetQ.correct_answer || correctOpt?.text || '',
        goal: 'clarity'
      });
      setImprovedResult(res);
    } catch (err) {
      setImproveError(err.message || 'Failed to improve question with AI.');
    } finally {
      setImproveLoading(false);
    }
  };

  const handleAcceptImprovement = () => {
    if (improvingIndex === null || !improvedResult) return;
    const original = selectedQuestions[improvingIndex];
    const updatedQuestion = {
      ...original,
      question_text: improvedResult.improved_question || original.question_text,
      options: improvedResult.options || original.options,
      correct_answer: improvedResult.correct_answer || original.correct_answer,
      explanation: improvedResult.explanation || original.explanation
    };
    const updatedList = [...selectedQuestions];
    updatedList[improvingIndex] = updatedQuestion;
    setSelectedQuestions(updatedList);
    setImproveModalOpen(false);
    setImprovingIndex(null);
  };

  // ---------------- REGENERATE QUESTION HANDLERS ----------------
  const handleOpenRegenerateModal = async (index) => {
    const targetQ = selectedQuestions[index];
    if (!targetQ) return;
    setRegeneratingIndex(index);
    setRegeneratedResult(null);
    setRegenerateError('');
    setRegenerateModalOpen(true);
    setRegenerateLoading(true);

    try {
      const correctOpt = (targetQ.options || []).find((o) => o.is_correct);
      const res = await api.regenerateQuestionAI({
        question_text: targetQ.question_text,
        options: (targetQ.options || []).map((o) => (typeof o === 'string' ? o : o.text || '')),
        correct_answer: targetQ.correct_answer || correctOpt?.text || '',
        material_id: material?.material_id || null
      });
      setRegeneratedResult(res);
    } catch (err) {
      setRegenerateError(err.message || 'Failed to regenerate question with AI.');
    } finally {
      setRegenerateLoading(false);
    }
  };

  const handleAcceptRegeneration = () => {
    if (regeneratingIndex === null || !regeneratedResult) return;
    const original = selectedQuestions[regeneratingIndex];
    const updatedQuestion = {
      ...original,
      question_text: regeneratedResult.new_question || original.question_text,
      options: regeneratedResult.options || original.options,
      correct_answer: regeneratedResult.correct_answer || original.correct_answer,
      explanation: regeneratedResult.explanation || original.explanation
    };
    const updatedList = [...selectedQuestions];
    updatedList[regeneratingIndex] = updatedQuestion;
    setSelectedQuestions(updatedList);
    setRegenerateModalOpen(false);
    setRegeneratingIndex(null);
  };

  // ---------------- QUIZ QUALITY CHECK HANDLER ----------------
  const handleCheckQuizQuality = async () => {
    if (selectedQuestions.length === 0) return;
    setQualityModalOpen(true);
    setQualityCheckLoading(true);
    setQualityReport(null);
    setQualityError('');

    try {
      const report = await api.checkQuizQualityAI({
        questions: selectedQuestions,
        quiz_title: title || 'Untitled Quiz',
        material_id: material?.material_id || null
      });
      setQualityReport(report);
    } catch (err) {
      setQualityError(err.message || 'Failed to analyze quiz quality.');
    } finally {
      setQualityCheckLoading(false);
    }
  };

  // ---------------- STUDY GUIDE HANDLERS ----------------
  const handleGenerateStudyGuide = async () => {
    if (!material?.material_id) return;
    setStudyGuideModalOpen(true);
    setStudyGuideLoading(true);
    setStudyGuideError('');
    setCopiedStudyGuide(false);

    try {
      const data = await api.generateStudyGuide(material.material_id);
      setStudyGuideData(data);
    } catch (err) {
      setStudyGuideError(err.message || 'Failed to generate study guide from material.');
    } finally {
      setStudyGuideLoading(false);
    }
  };

  const handleCopyStudyGuide = () => {
    if (!studyGuideData) return;
    let text = `# ${studyGuideData.title || 'Study Guide'}\nSource: ${studyGuideData.source_material}\n\n`;
    text += `## Overview\n${studyGuideData.overview || ''}\n\n`;
    text += `## Key Concepts\n`;
    (studyGuideData.key_concepts || []).forEach((kc) => {
      text += `### ${kc.concept}\n- **Definition**: ${kc.definition}\n- **Importance**: ${kc.importance}\n\n`;
    });
    text += `## Key Points\n`;
    (studyGuideData.key_points || []).forEach((kp) => {
      text += `- ${kp}\n`;
    });
    text += `\n## Quick Review\n`;
    (studyGuideData.quick_review || []).forEach((qr) => {
      text += `**Q: ${qr.question}**\nA: ${qr.answer}\n\n`;
    });
    navigator.clipboard.writeText(text);
    setCopiedStudyGuide(true);
    setTimeout(() => setCopiedStudyGuide(false), 2000);
  };

  // ---------------- MATERIAL SUMMARY HANDLERS ----------------
  const handleOpenMaterialSummary = async (mode = 'short') => {
    if (!material?.material_id) return;
    setSummaryModalOpen(true);
    setSummaryMode(mode);
    setSummaryLoading(true);
    setSummaryError('');
    setCopiedSummary(false);

    try {
      const res = await api.summarizeMaterial(material.material_id, mode);
      setSummaryData(res);
    } catch (err) {
      setSummaryError(err.message || 'Failed to summarize material.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!summaryData?.summary) return;
    let text = `# Summary: ${summaryData.filename}\n\n${summaryData.summary}\n\n`;
    if (summaryData.key_takeaways?.length) {
      text += `### Key Takeaways\n`;
      summaryData.key_takeaways.forEach((t) => {
        text += `- ${t}\n`;
      });
    }
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };


  // ---------------- SAVE QUIZ & START LIVE ----------------
  const handleSave = async (startImmediately = false) => {
    if (!title.trim()) {
      alert('Please enter a quiz title before saving.');
      return;
    }
    if (selectedQuestions.length === 0) {
      alert('Please add at least one question to the quiz before saving.');
      return;
    }

    // Comprehensive validation for every question
    for (let i = 0; i < selectedQuestions.length; i++) {
      const q = selectedQuestions[i];
      const qNum = i + 1;
      if (!q.question_text || !q.question_text.trim()) {
        alert(`Question #${qNum} has empty question text. Please complete all question fields before saving.`);
        return;
      }
      const opts = q.options || [];
      if (opts.length < 4) {
        alert(`Question #${qNum} must have 4 options. Please edit Question #${qNum} before saving.`);
        return;
      }
      for (let j = 0; j < opts.length; j++) {
        const optText = typeof opts[j] === 'string' ? opts[j] : (opts[j]?.text || '');
        if (!optText.trim()) {
          alert(`Question #${qNum}, Option ${String.fromCharCode(65 + j)} is empty. Please complete all option fields before saving.`);
          return;
        }
      }
      const hasCorrect = opts.some(o => o.is_correct);
      if (!hasCorrect) {
        alert(`Question #${qNum} has no correct answer selected. Please select a correct answer before saving.`);
        return;
      }
    }

    const numericIds = selectedQuestions.filter((q) => typeof q.id === 'number').map((q) => q.id);
    const inlineList = selectedQuestions
      .filter((q) => typeof q.id !== 'number' || !q.id)
      .map((q) => ({
        question_type: q.question_type || 'multiple_choice',
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        category: q.category || category,
        difficulty: q.difficulty || 'medium',
        default_time_limit: q.default_time_limit || parseInt(timeLimit, 10),
        default_points: q.default_points || 100
      }));

    const payload = {
      title,
      description,
      category,
      instructions,
      settings: {
        time_limit: parseInt(timeLimit, 10),
        timebomb_enabled: timebombEnabled,
        speed_bonus: speedBonus,
        shuffle_questions: shuffleQuestions,
        show_answers_mode: showAnswersMode
      },
      question_ids: numericIds,
      inline_questions: inlineList
    };

    try {
      setLoading(true);
      let savedQuiz;
      if (editId) {
        savedQuiz = await api.updateQuiz(editId, payload);
      } else {
        savedQuiz = await api.createQuiz(payload);
      }

      if (startImmediately) {
        const session = await api.createSession(savedQuiz.id);
        navigate(`/live/host/${session.id}`);
      } else {
        navigate('/quizzes');
      }
    } catch (err) {
      alert(`Failed to save quiz: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid #334155'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {editId ? 'Edit Quiz' : 'Create Quiz'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Build assessment questions manually, generate from topics, or upload learning materials (PDF/PPT/PPTX).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* PDF Export Button */}
          <button
            type="button"
            onClick={() => handleTriggerExport(false)}
            className="btn btn-outline"
            style={{ padding: '8px 14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            title={editId ? "Export printable Quiz PDF or Answer Key" : "Please save quiz before exporting PDF"}
          >
            <FileDown size={17} color="var(--color-teal)" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => handleSave(false)}
            disabled={loading}
            className="btn btn-outline"
            style={{ padding: '8px 16px', fontWeight: 600 }}
          >
            <Save size={18} />
            <span>{loading ? 'Saving...' : 'Save to Library'}</span>
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={loading}
            className="btn btn-teal"
            style={{ padding: '8px 18px', fontWeight: 600 }}
          >
            <Play size={18} fill="currentColor" />
            <span>Save & Start Live</span>
          </button>
        </div>
      </div>

      <div className="quiz-creator-layout">
        
        {/* ================= LEFT COLUMN: QUIZ SETTINGS ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Card 1: Quiz Information */}
          <div className="loomi-card" style={{ padding: '20px 22px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, color: '#F8FAFC' }}>
              1. Quiz Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#E2E8F0' }}>
                  Quiz Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Cybersecurity Refresher & MFA Standards"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#E2E8F0' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
                >
                  <option value="Employee Training">Employee Training</option>
                  <option value="Information Security">Information Security</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Leadership & Strategy">Leadership & Strategy</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#E2E8F0' }}>
                  Description / Objective
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefly explain what employees will learn or be evaluated on..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#E2E8F0' }}>
                  Participant Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Answer promptly. Speed bonuses apply for accurate answers."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Interactive Game Settings */}
          <div className="loomi-card" style={{ padding: '20px 22px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, color: '#F8FAFC' }}>
              2. Interactive Game Settings
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                  <Clock size={16} color="var(--color-teal)" /> Time Limit per Question
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  style={{ color: '#F8FAFC', fontWeight: 500, backgroundColor: '#0F172A', borderColor: '#334155' }}
                >
                  <option value={10}>10 seconds (Rapid fire)</option>
                  <option value={15}>15 seconds</option>
                  <option value={20}>20 seconds</option>
                  <option value={30}>30 seconds (Standard)</option>
                  <option value={45}>45 seconds</option>
                  <option value={60}>60 seconds (Complex scenario)</option>
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, backgroundColor: '#0F172A', border: '1px solid #334155', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Flame size={18} color="var(--color-accent-dark)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#F8FAFC' }}>Time Bomb Suspense Effect</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Pulsing urgency in final 5 seconds</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={timebombEnabled}
                  onChange={(e) => setTimebombEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, backgroundColor: '#0F172A', border: '1px solid #334155', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Zap size={18} color="var(--color-teal)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#F8FAFC' }}>Speed Bonus Scoring</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Extra points for fast accurate answers</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={speedBonus}
                  onChange={(e) => setSpeedBonus(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </label>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                  Answer Reveal Timing
                </label>
                <select
                  value={showAnswersMode}
                  onChange={(e) => setShowAnswersMode(e.target.value)}
                  style={{ color: '#F8FAFC', fontWeight: 500, backgroundColor: '#0F172A', borderColor: '#334155' }}
                >
                  <option value="immediate">Immediate (Show correct answer after each question)</option>
                  <option value="end">At End (Review answers only after full quiz completes)</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN: QUESTIONS & GENERATORS ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Card 3: Creation Methods & Hub */}
          <div className="loomi-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                  3. Add Questions
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  Choose a creation method below to generate or add questions into your quiz editor.
                </p>
              </div>
              <button
                type="button"
                onClick={openBankModal}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.8rem' }}
                title="Select from reusable Question Bank"
              >
                <Database size={14} />
                <span>Question Bank</span>
              </button>
            </div>

            {/* Creation Tabs */}
            <div style={{
              display: 'flex',
              gap: 8,
              padding: 4,
              backgroundColor: '#0F172A',
              borderRadius: 10,
              border: '1px solid #334155',
              marginBottom: 20,
              overflowX: 'auto'
            }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  setInlineModalOpen(true);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 7,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'manual' ? 'var(--color-teal)' : 'transparent',
                  color: activeTab === 'manual' ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.15s'
                }}
              >
                <PlusCircle size={16} />
                <span>Option 1: Manual Creation</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('topic')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 7,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'topic' ? 'var(--color-teal)' : 'transparent',
                  color: activeTab === 'topic' ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.15s'
                }}
              >
                <Sparkles size={16} />
                <span>Option 2: Generate from Topic</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('material')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 7,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'material' ? 'var(--color-teal)' : 'transparent',
                  color: activeTab === 'material' ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.15s'
                }}
              >
                <UploadCloud size={16} />
                <span>Option 3: Learning Material (PDF/PPT)</span>
              </button>
            </div>

            {/* TAB CONTENT: OPTION 1 (MANUAL CREATION HELPER) */}
            {activeTab === 'manual' && (
              <div style={{
                backgroundColor: '#0F172A',
                border: '1px dashed #334155',
                borderRadius: 10,
                padding: '24px 18px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14
              }}>
                <PlusCircle size={36} color="var(--color-teal)" />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Manual Question Creation</h4>
                  <p style={{ fontSize: '0.82rem', color: '#94A3B8', maxWidth: 440, marginTop: 4 }}>
                    Choose your preferred format to craft tailored assessment questions manually.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleNewQuestionTypeChange('multiple_choice');
                      setInlineModalOpen(true);
                    }}
                    className="btn btn-teal btn-sm"
                    style={{ padding: '8px 16px' }}
                  >
                    <PlusCircle size={15} />
                    <span>+ Multiple Choice (MCQ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleNewQuestionTypeChange('true_false');
                      setInlineModalOpen(true);
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '8px 16px', borderColor: 'var(--color-teal)', color: '#2DD4BF' }}
                  >
                    <CheckCircle2 size={15} />
                    <span>+ True / False</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleNewQuestionTypeChange('multiple_select');
                      setInlineModalOpen(true);
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '8px 16px' }}
                  >
                    <CheckSquare size={15} />
                    <span>+ Multiple Select</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleNewQuestionTypeChange('short_answer');
                      setInlineModalOpen(true);
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '8px 16px' }}
                  >
                    <FileQuestion size={15} />
                    <span>+ Short Answer</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: OPTION 3 (LEARNING MATERIAL) */}
            {activeTab === 'material' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {!material ? (
                  /* Upload Dropzone */
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    style={{
                      border: '2px dashed #0D9488',
                      borderRadius: 12,
                      padding: '36px 20px',
                      textAlign: 'center',
                      backgroundColor: 'rgba(13, 148, 136, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      cursor: 'pointer'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.ppt,.pptx,.docx,.txt"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(20, 184, 166, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-teal)'
                    }}>
                      <UploadCloud size={28} />
                    </div>

                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
                        {uploadingMaterial ? 'Extracting & Processing Document...' : 'Upload Learning Material (PDF, PPT, DOCX, TXT)'}
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: '#94A3B8', maxWidth: 460 }}>
                        {uploadingMaterial
                          ? 'Please wait while Loomi parses the document text for question generation and Ask AI chat.'
                          : 'Drag & drop your presentation or document here, or click to browse. Max 20MB.'}
                      </p>
                    </div>

                    {uploadingMaterial ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-teal)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <div className="spinner" style={{ width: 18, height: 18, border: '2px solid rgba(20, 184, 166, 0.3)', borderTopColor: 'var(--color-teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span>Extracting document text...</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-teal btn-sm"
                        style={{ pointerEvents: 'none' }}
                      >
                        Select File
                      </button>
                    )}

                    {materialError && (
                      <div style={{
                        marginTop: 8,
                        padding: '8px 14px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #EF4444',
                        borderRadius: 6,
                        color: '#FCA5A5',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <AlertCircle size={15} />
                        <span>{materialError}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Material Processed Banner & Action Area */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Confirmation Card */}
                    <div style={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #10B981',
                      borderRadius: 10,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <FileCheck size={22} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC' }}>
                              {material.filename}
                            </span>
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Material processed successfully</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 2 }}>
                            {material.unit_count ? `${material.unit_count} ${material.unit_label || 'pages'} • ` : ''}
                            {material.word_count.toLocaleString()} words &bull; {material.character_count.toLocaleString()} characters ready for AI
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleGenerateStudyGuide}
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: '#6366F1', color: '#A5B4FC' }}
                          title="Generate structured AI Study Guide from this document"
                        >
                          <BookOpen size={14} color="#818CF8" />
                          <span>Study Guide</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenMaterialSummary('short')}
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: '#06B6D4', color: '#67E8F9' }}
                          title="Summarize document in 4 modes (Short, Detailed, Bullets, Simple)"
                        >
                          <FileText size={14} color="#22D3EE" />
                          <span>Summarize</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setChatOpen(true)}
                          className="btn btn-teal btn-sm"
                          title="Open floating Ask AI chat window"
                        >
                          <MessageSquare size={14} />
                          <span>Ask AI About Material</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleClearMaterial}
                          className="btn btn-outline btn-sm"
                          style={{ color: '#EF4444', borderColor: '#EF4444' }}
                          title="Clear material and chat context to upload a new file"
                        >
                          <RotateCcw size={14} />
                          <span>Clear / Upload New</span>
                        </button>
                      </div>
                    </div>

                    {/* Generator Controls */}
                    <div style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: 16
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F8FAFC' }}>
                          Generate Quiz Questions from this Document
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Questions:</span>
                            <select
                              value={isCustomFileCount ? 'custom' : fileQuestionCount}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setIsCustomFileCount(true);
                                } else {
                                  setIsCustomFileCount(false);
                                  setFileQuestionCount(Number(e.target.value));
                                  setCustomFileCount('');
                                }
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 6,
                                fontSize: '0.78rem',
                                backgroundColor: '#1E293B',
                                color: '#F8FAFC',
                                borderColor: '#334155'
                              }}
                            >
                              <option value={3}>3 Questions</option>
                              <option value={5}>5 Questions</option>
                              <option value={8}>8 Questions</option>
                              <option value={10}>10 Questions</option>
                              <option value={12}>12 Questions</option>
                              <option value={15}>15 Questions</option>
                              <option value={20}>20 Questions</option>
                              <option value={25}>25 Questions</option>
                              <option value={30}>30 Questions</option>
                              <option value="custom">Custom...</option>
                            </select>
                            {isCustomFileCount && (
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={customFileCount}
                                onChange={(e) => setCustomFileCount(e.target.value)}
                                placeholder="e.g. 20"
                                style={{
                                  width: '75px',
                                  padding: '4px 8px',
                                  fontSize: '0.78rem',
                                  backgroundColor: '#0F172A',
                                  borderColor: '#334155'
                                }}
                              />
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Difficulty:</span>
                            <select
                              value={fileDifficulty}
                              onChange={(e) => setFileDifficulty(e.target.value)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 6,
                                fontSize: '0.78rem',
                                backgroundColor: '#1E293B',
                                color: '#F8FAFC',
                                borderColor: '#334155'
                              }}
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateFromFile}
                        disabled={generatingFromFile}
                        className="btn btn-teal"
                        style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
                      >
                        <Sparkles size={18} />
                        <span>{generatingFromFile ? 'Generating Questions with local AI...' : 'GENERATE QUESTIONS FROM FILE'}</span>
                      </button>

                      {fileGenStatus && (
                        <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={16} />
                          <span>{fileGenStatus}</span>
                        </div>
                      )}

                      {fileGenError && (
                        <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertCircle size={16} />
                          <span>{fileGenError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: OPTION 2 (GENERATE FROM TOPIC) */}
            {activeTab === 'topic' && (
              <div style={{
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: 10,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                    Topic or Learning Objective *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Workplace Phishing Defenses, MFA Protocols, Incident Reporting"
                    value={topicPrompt}
                    onChange={(e) => setTopicPrompt(e.target.value)}
                    style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                      Number of Questions
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={isCustomTopicCount ? 'custom' : topicCount}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setIsCustomTopicCount(true);
                          } else {
                            setIsCustomTopicCount(false);
                            setTopicCount(Number(e.target.value));
                            setCustomTopicCount('');
                          }
                        }}
                        style={{ backgroundColor: '#1E293B', borderColor: '#334155', flex: 1 }}
                      >
                        <option value={3}>3 Questions</option>
                        <option value={5}>5 Questions (Quick)</option>
                        <option value={8}>8 Questions</option>
                        <option value={10}>10 Questions (Standard)</option>
                        <option value={12}>12 Questions</option>
                        <option value={15}>15 Questions</option>
                        <option value={20}>20 Questions (Comprehensive)</option>
                        <option value={25}>25 Questions</option>
                        <option value={30}>30 Questions (Full Assessment)</option>
                        <option value="custom">Custom count...</option>
                      </select>
                      {isCustomTopicCount && (
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={customTopicCount}
                          onChange={(e) => setCustomTopicCount(e.target.value)}
                          placeholder="e.g. 20"
                          style={{
                            width: '85px',
                            backgroundColor: '#0F172A',
                            borderColor: '#334155'
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                      Difficulty Level
                    </label>
                    <select
                      value={topicDifficulty}
                      onChange={(e) => setTopicDifficulty(e.target.value)}
                      style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}
                    >
                      <option value="easy">Easy (Fundamentals)</option>
                      <option value="medium">Medium (Standard)</option>
                      <option value="hard">Hard (Advanced Scenarios)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateFromTopic}
                  disabled={generatingFromTopic || !topicPrompt.trim()}
                  className="btn btn-teal"
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
                >
                  <Sparkles size={18} />
                  <span>{generatingFromTopic ? 'Generating Questions with local AI...' : 'GENERATE QUESTIONS FROM TOPIC'}</span>
                </button>

                {topicGenStatus && (
                  <div style={{ fontSize: '0.82rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} />
                    <span>{topicGenStatus}</span>
                  </div>
                )}

                {topicGenError && (
                  <div style={{ fontSize: '0.82rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={16} />
                    <span>{topicGenError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= QUESTION EDITOR & REVIEW LIST ================= */}
          <div className="loomi-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                  Questions in this Quiz ({selectedQuestions.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  Review, edit options, reorder, or delete questions before finalizing your quiz.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCheckQuizQuality}
                  disabled={selectedQuestions.length === 0 || qualityCheckLoading}
                  className="btn btn-outline btn-sm"
                  style={{
                    fontSize: '0.78rem',
                    borderColor: '#8B5CF6',
                    color: '#C4B5FD',
                    opacity: selectedQuestions.length === 0 ? 0.5 : 1,
                    cursor: selectedQuestions.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title={selectedQuestions.length === 0 ? 'Add questions first to audit quality' : 'Run AI psychometric & structural audit on quiz'}
                >
                  <Sparkles size={14} color="#A78BFA" />
                  <span>{qualityCheckLoading ? 'Auditing Quiz...' : 'Check Quiz with AI'}</span>
                </button>

                {selectedQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setInlineModalOpen(true)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <PlusCircle size={14} />
                    <span>Add Another Question</span>
                  </button>
                )}
              </div>
            </div>

            {selectedQuestions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                borderRadius: 10,
                border: '1px dashed #334155',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10
              }}>
                <FileQuestion size={40} color="#64748B" />
                <h4 style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.95rem' }}>No Questions in Quiz Yet</h4>
                <p style={{ fontSize: '0.82rem', color: '#94A3B8', maxWidth: 360 }}>
                  Upload a document (Option 3), generate from a topic (Option 2), or add manual questions (Option 1).
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {selectedQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    style={{
                      borderRadius: 10,
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      boxShadow: 'var(--shadow-xs)'
                    }}
                  >
                    {/* Question Header & Controls */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                        <span style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          backgroundColor: 'var(--color-teal)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 2
                        }}>
                          {idx + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC', lineHeight: 1.4 }}>
                            {q.question_text}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            <span className="badge badge-teal" style={{ fontSize: '0.68rem' }}>
                              {q.question_type === 'true_false' ? 'True / False' : q.question_type === 'multiple_select' ? 'Multiple Select' : q.question_type === 'short_answer' ? 'Short Answer' : 'Multiple Choice'}
                            </span>
                            <span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>{q.difficulty || 'medium'}</span>
                            <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>{q.default_time_limit || timeLimit}s</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenImproveModal(idx)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '5px 8px', fontSize: '0.78rem', borderColor: 'rgba(20, 184, 166, 0.5)', color: '#2DD4BF' }}
                          title="Improve clarity, wording, and distractors with AI while preserving the correct answer"
                        >
                          <Sparkles size={13} />
                          <span>Improve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRegenerateModal(idx)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '5px 8px', fontSize: '0.78rem', borderColor: 'rgba(99, 102, 241, 0.5)', color: '#A5B4FC' }}
                          title="Generate a brand new alternative question assessing the same concept"
                        >
                          <RefreshCw size={13} />
                          <span>Regenerate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(idx)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                          title="Edit question text and answers"
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, -1)}
                          disabled={idx === 0}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '5px 8px' }}
                          title="Move Up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 1)}
                          disabled={idx === selectedQuestions.length - 1}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '5px 8px' }}
                          title="Move Down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '5px 8px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.4)' }}
                          title="Delete question"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Question Options Preview */}
                    {q.question_type === 'short_answer' ? (
                      <div style={{ backgroundColor: '#161F30', padding: '10px 14px', borderRadius: 8, fontSize: '0.82rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={15} color="#10B981" />
                        <span><strong>Expected Answer:</strong> {q.correct_answer}</span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 8,
                        backgroundColor: '#161F30',
                        padding: 10,
                        borderRadius: 8
                      }}>
                        {(q.options || []).map((opt, optIdx) => (
                          <div
                            key={opt.id || optIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 10px',
                              borderRadius: 6,
                              backgroundColor: opt.is_correct ? 'rgba(16, 185, 129, 0.15)' : '#0F172A',
                              border: `1px solid ${opt.is_correct ? '#10B981' : '#334155'}`,
                              fontSize: '0.8rem',
                              color: opt.is_correct ? '#34D399' : '#CBD5E1'
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: '0.75rem', minWidth: 16 }}>
                              {q.question_type === 'true_false' ? (opt.text === 'True' ? '✓' : '✗') : `${String.fromCharCode(65 + optIdx)}.`}
                            </span>
                            <span style={{ flex: 1 }}>{opt.text}</span>
                            {opt.is_correct && <CheckCircle2 size={14} color="#10B981" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Explanation if available */}
                    {q.explanation && (
                      <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic', paddingLeft: 6, borderLeft: '2px solid var(--color-teal)' }}>
                        <strong>Rationale:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ================= FLOATING CHAT POP-UP & TRIGGER BUTTON ================= */}
      {/* Floating Toggle Button */}
      <button
        type="button"
        className="floating-ai-chat-btn"
        onClick={() => setChatOpen(!chatOpen)}
        title={chatOpen ? "Close Ask AI" : "Open Ask AI chat window"}
      >
        {chatOpen ? <X size={26} /> : <MessageSquare size={26} />}
        {material && !chatOpen && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: '#10B981',
              border: '2px solid #0F172A'
            }}
            title="Material ready for chat"
          />
        )}
      </button>

      {/* Floating Chat Pop-up Window */}
      {chatOpen && (
        <div
          className="floating-ai-chat-window"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#1E293B',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-teal)'
              }}>
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F8FAFC' }}>
                  Ask AI
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                  {material ? `Grounded in ${material.filename}` : 'Upload material to begin'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {chatMessages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setChatMessages([chatMessages[0]])}
                  style={{ fontSize: '0.72rem', color: '#94A3B8', textDecoration: 'underline', cursor: 'pointer', padding: '2px 6px' }}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                style={{
                  color: '#94A3B8',
                  padding: 4,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close chat window"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div style={{
            padding: '14px 16px',
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {!material ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 16px',
                color: '#94A3B8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12
              }}>
                <UploadCloud size={36} color="var(--color-teal)" />
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F8FAFC' }}>
                  No Material Uploaded
                </div>
                <p style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                  Upload and process a PDF, PPT, or PPTX file before using Ask AI.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('material');
                    fileInputRef.current?.click();
                  }}
                  className="btn btn-teal btn-sm"
                  style={{ fontSize: '0.8rem', marginTop: 4 }}
                >
                  Upload File Now
                </button>
              </div>
            ) : chatMessages.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.84rem', textAlign: 'center', padding: '24px 8px' }}>
                Your uploaded document is ready. Ask any question below to test concepts or summarize slides.
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%'
                  }}
                >
                  {msg.sender === 'assistant' && (
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(20, 184, 166, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-teal)',
                      flexShrink: 0,
                      marginTop: 2
                    }}>
                      <Bot size={13} />
                    </div>
                  )}

                  <div style={{
                    padding: '9px 13px',
                    borderRadius: 8,
                    backgroundColor: msg.sender === 'user' ? 'var(--color-teal)' : '#1E293B',
                    color: msg.sender === 'user' ? '#FFFFFF' : '#E2E8F0',
                    fontSize: '0.83rem',
                    lineHeight: 1.45,
                    boxShadow: 'var(--shadow-xs)',
                    wordBreak: 'break-word'
                  }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    <div style={{ fontSize: '0.65rem', color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: 4, textAlign: 'right' }}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.sender === 'user' && (
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0,
                      marginTop: 2
                    }}>
                      <User size={13} />
                    </div>
                  )}
                </div>
              ))
            )}

            {chatLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-teal)', fontSize: '0.8rem' }}>
                <div className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(20, 184, 166, 0.3)', borderTopColor: 'var(--color-teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span>AI is reading document & typing...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Suggestion Chips */}
          {material && (
            <div style={{
              display: 'flex',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: '#161F30',
              borderTop: '1px solid #283548',
              overflowX: 'auto'
            }}>
              {[
                'Summarize this',
                'Explain simply',
                'Give an example',
                'What should I remember?'
              ].map((promptText, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSendChatMessage(promptText)}
                  disabled={chatLoading}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 10,
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    fontSize: '0.7rem',
                    color: '#CBD5E1',
                    whiteSpace: 'nowrap',
                    cursor: chatLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {promptText}
                </button>
              ))}
            </div>
          )}

          {/* Error Notice if any */}
          {chatError && (
            <div style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderTop: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <AlertCircle size={13} />
              <span>{chatError}</span>
            </div>
          )}

          {/* Interactive Chat Input */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#0F172A',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8
          }}>
            <textarea
              ref={chatInputRef}
              rows={2}
              placeholder={material ? "Type your question... (Enter to send, Shift+Enter for new line)" : "Upload a file before asking AI..."}
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                if (chatError) setChatError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
              disabled={chatLoading || !material?.material_id}
              style={{
                flex: 1,
                resize: 'none',
                backgroundColor: '#1E293B',
                borderColor: '#334155',
                color: '#F8FAFC',
                fontSize: '0.85rem',
                padding: '8px 12px',
                borderRadius: 8,
                outline: 'none',
                boxShadow: 'none'
              }}
            />

            <button
              type="button"
              onClick={() => handleSendChatMessage()}
              disabled={chatLoading || !chatInput.trim() || !material?.material_id}
              className="btn btn-teal btn-sm"
              style={{ padding: '8px 12px', height: 38 }}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXPORT PDF ================= */}
      <Modal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        title="Export Quiz as PDF"
        maxWidth={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
            Choose the format you would like to download for <strong>"{title}"</strong>:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {/* Option A: Participant Quiz PDF */}
            <div
              onClick={() => !exportingPdf && handleExecuteExportPdf(false)}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: exportingPdf ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-teal)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F8FAFC' }}>
                  1. Participant Quiz PDF (No Answers)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 3 }}>
                  Clean printable version for employees/students. Correct answers are hidden.
                </div>
              </div>
              <button
                type="button"
                disabled={exportingPdf}
                className="btn btn-teal btn-sm"
                style={{ pointerEvents: 'none' }}
              >
                <Download size={14} />
                <span>Download</span>
              </button>
            </div>

            {/* Option B: Answer Key PDF */}
            <div
              onClick={() => !exportingPdf && handleExecuteExportPdf(true)}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: exportingPdf ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-teal)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F8FAFC' }}>
                  2. Official Answer Key PDF (With Answers & Explanations)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 3 }}>
                  Trainer reference copy with correct answers highlighted and rationales included.
                </div>
              </div>
              <button
                type="button"
                disabled={exportingPdf}
                className="btn btn-outline btn-sm"
                style={{ pointerEvents: 'none' }}
              >
                <Download size={14} />
                <span>Download</span>
              </button>
            </div>
          </div>

          {exportError && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #EF4444',
              borderRadius: 6,
              color: '#FCA5A5',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <AlertCircle size={15} />
              <span>{exportError}</span>
            </div>
          )}

          {exportingPdf && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-teal)', fontSize: '0.85rem' }}>
              <div className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(20, 184, 166, 0.3)', borderTopColor: 'var(--color-teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span>Generating printable PDF...</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setPdfModalOpen(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: EDIT QUESTION ================= */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit ${editQuestionType === 'true_false' ? 'True / False' : editQuestionType === 'multiple_select' ? 'Multiple-Select' : editQuestionType === 'short_answer' ? 'Short-Answer' : 'Multiple-Choice'} Question`}
        maxWidth={680}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Format & Difficulty Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                Question Format *
              </label>
              <select
                value={editQuestionType}
                onChange={(e) => handleEditQuestionTypeChange(e.target.value)}
                style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
              >
                <option value="multiple_choice">Multiple Choice (MCQ)</option>
                <option value="true_false">True / False</option>
                <option value="multiple_select">Multiple Select (Check all that apply)</option>
                <option value="short_answer">Short Answer / Direct Recall</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                Difficulty Level
              </label>
              <select
                value={editDifficulty}
                onChange={(e) => setEditDifficulty(e.target.value)}
                style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
              Question Text *
            </label>
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
            />
          </div>

          {/* DYNAMIC OPTIONS BY FORMAT */}
          {editQuestionType === 'true_false' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#F8FAFC' }}>
                Correct Answer (Click to select True or False) *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div
                  onClick={() => {
                    setEditOptions([
                      { id: 'opt_true', text: 'True', is_correct: true },
                      { id: 'opt_false', text: 'False', is_correct: false }
                    ]);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: 10,
                    border: `2px solid ${editOptions.find((o) => o.text === 'True')?.is_correct ? '#10B981' : '#334155'}`,
                    backgroundColor: editOptions.find((o) => o.text === 'True')?.is_correct ? 'rgba(16, 185, 129, 0.15)' : '#0F172A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34D399' }}>✓</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>True</span>
                  </div>
                  {editOptions.find((o) => o.text === 'True')?.is_correct && (
                    <span className="badge badge-success">Correct Answer</span>
                  )}
                </div>

                <div
                  onClick={() => {
                    setEditOptions([
                      { id: 'opt_true', text: 'True', is_correct: false },
                      { id: 'opt_false', text: 'False', is_correct: true }
                    ]);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: 10,
                    border: `2px solid ${editOptions.find((o) => o.text === 'False')?.is_correct ? '#EF4444' : '#334155'}`,
                    backgroundColor: editOptions.find((o) => o.text === 'False')?.is_correct ? 'rgba(239, 68, 68, 0.15)' : '#0F172A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F87171' }}>✗</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>False</span>
                  </div>
                  {editOptions.find((o) => o.text === 'False')?.is_correct && (
                    <span className="badge badge-error">Correct Answer</span>
                  )}
                </div>
              </div>
            </div>
          ) : editQuestionType === 'short_answer' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                Expected Answer / Keyword *
              </label>
              <input
                type="text"
                placeholder="Type the exact expected answer..."
                value={editShortAnswer}
                onChange={(e) => setEditShortAnswer(e.target.value)}
                style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4, display: 'block' }}>
                Participant answers will be compared case-insensitively against this answer.
              </span>
            </div>
          ) : (
            /* multiple_choice or multiple_select */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                  Answer Options ({editQuestionType === 'multiple_select' ? 'Check all correct answers' : 'Select single correct answer'})
                </label>
                {editOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={() => handleAddOption(true)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {editOptions.map((opt, idx) => (
                  <div key={opt.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {editQuestionType === 'multiple_select' ? (
                      <input
                        type="checkbox"
                        checked={opt.is_correct}
                        onChange={() => {
                          const updated = [...editOptions];
                          updated[idx] = { ...opt, is_correct: !opt.is_correct };
                          setEditOptions(updated);
                        }}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                        title="Mark as correct answer"
                      />
                    ) : (
                      <input
                        type="radio"
                        name="edit_correct_option"
                        checked={opt.is_correct}
                        onChange={() => {
                          const updated = editOptions.map((o, i) => ({
                            ...o,
                            is_correct: i === idx
                          }));
                          setEditOptions(updated);
                        }}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                        title="Mark as single correct answer"
                      />
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: 20, color: '#94A3B8' }}>
                      {String.fromCharCode(65 + idx)}:
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const updated = [...editOptions];
                        updated[idx].text = e.target.value;
                        setEditOptions(updated);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                      style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
                    />
                    {editOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx, true)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#EF4444', borderColor: '#EF4444', padding: '4px 8px' }}
                        title="Remove this option"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                Time Limit (seconds)
              </label>
              <select
                value={editTimeLimit}
                onChange={(e) => setEditTimeLimit(Number(e.target.value))}
                style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
              >
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={20}>20s</option>
                <option value={30}>30s</option>
                <option value={45}>45s</option>
                <option value={60}>60s</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
              Explanation / Rationale
            </label>
            <textarea
              rows={2}
              value={editExplanation}
              onChange={(e) => setEditExplanation(e.target.value)}
              placeholder="Explains why this answer is correct..."
              style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEditedQuestion}
              className="btn btn-teal"
            >
              Update Question
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: SELECT FROM QUESTION BANK ================= */}
      <Modal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        title="Select Questions from Permanent Bank"
        maxWidth={760}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Select any questions below to include in this quiz. Questions can be reused indefinitely across multiple quizzes.
          </p>

          <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bankQuestions.map((q) => {
              const isSelected = selectedQuestions.some((item) => item.id === q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => toggleBankQuestion(q)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? 'var(--color-teal)' : 'var(--border-subtle)'}`,
                    backgroundColor: isSelected ? 'rgba(20, 184, 166, 0.15)' : '#0F172A',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      {q.question_text}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span className="badge badge-teal" style={{ fontSize: '0.65rem' }}>{q.category}</span>
                      <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{q.question_type?.replace('_', ' ')}</span>
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{q.difficulty}</span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={() => setBankModalOpen(false)} className="btn btn-teal">
              Confirm Selection ({selectedQuestions.length})
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: CREATE MANUAL INLINE QUESTION ================= */}
      <Modal
        isOpen={inlineModalOpen}
        onClose={() => setInlineModalOpen(false)}
        title={
          newQuestionType === 'true_false'
            ? 'Add Manual True / False Question'
            : newQuestionType === 'multiple_select'
            ? 'Add Manual Multiple Select Question'
            : newQuestionType === 'short_answer'
            ? 'Add Manual Short Answer Question'
            : 'Add Manual Multiple-Choice Question'
        }
        maxWidth={680}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                Question Format *
              </label>
              <select
                value={newQuestionType}
                onChange={(e) => handleNewQuestionTypeChange(e.target.value)}
                style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
              >
                <option value="multiple_choice">Multiple Choice (MCQ)</option>
                <option value="true_false">True / False</option>
                <option value="multiple_select">Multiple Select (Check all that apply)</option>
                <option value="short_answer">Short Answer / Direct Recall</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                Difficulty Level
              </label>
              <select
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value)}
                style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
              Question Prompt *
            </label>
            <textarea
              rows={2}
              placeholder="Type your question prompt clearly..."
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
            />
          </div>

          {/* DYNAMIC OPTIONS BY FORMAT */}
          {newQuestionType === 'true_false' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#F8FAFC' }}>
                Correct Answer (Click to select True or False) *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div
                  onClick={() => {
                    setNewOptions([
                      { id: 'opt_true', text: 'True', is_correct: true },
                      { id: 'opt_false', text: 'False', is_correct: false }
                    ]);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: 10,
                    border: `2px solid ${newOptions.find((o) => o.text === 'True')?.is_correct ? '#10B981' : '#334155'}`,
                    backgroundColor: newOptions.find((o) => o.text === 'True')?.is_correct ? 'rgba(16, 185, 129, 0.15)' : '#0F172A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34D399' }}>✓</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>True</span>
                  </div>
                  {newOptions.find((o) => o.text === 'True')?.is_correct && (
                    <span className="badge badge-success">Correct Answer</span>
                  )}
                </div>

                <div
                  onClick={() => {
                    setNewOptions([
                      { id: 'opt_true', text: 'True', is_correct: false },
                      { id: 'opt_false', text: 'False', is_correct: true }
                    ]);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: 10,
                    border: `2px solid ${newOptions.find((o) => o.text === 'False')?.is_correct ? '#EF4444' : '#334155'}`,
                    backgroundColor: newOptions.find((o) => o.text === 'False')?.is_correct ? 'rgba(239, 68, 68, 0.15)' : '#0F172A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F87171' }}>✗</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>False</span>
                  </div>
                  {newOptions.find((o) => o.text === 'False')?.is_correct && (
                    <span className="badge badge-error">Correct Answer</span>
                  )}
                </div>
              </div>
            </div>
          ) : newQuestionType === 'short_answer' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
                Expected Answer / Keyword *
              </label>
              <input
                type="text"
                placeholder="Type the exact expected answer..."
                value={newShortAnswer}
                onChange={(e) => setNewShortAnswer(e.target.value)}
                style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4, display: 'block' }}>
                Participant answers will be compared case-insensitively against this answer.
              </span>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                  Answer Options ({newQuestionType === 'multiple_select' ? 'Check all correct answers' : 'Select single correct answer'})
                </label>
                {newOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={() => handleAddOption(false)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {newOptions.map((opt, idx) => (
                  <div key={opt.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {newQuestionType === 'multiple_select' ? (
                      <input
                        type="checkbox"
                        checked={opt.is_correct}
                        onChange={() => {
                          const updated = [...newOptions];
                          updated[idx] = { ...opt, is_correct: !opt.is_correct };
                          setNewOptions(updated);
                        }}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                        title="Mark as correct answer"
                      />
                    ) : (
                      <input
                        type="radio"
                        name="manual_correct_option"
                        checked={opt.is_correct}
                        onChange={() => {
                          const updated = newOptions.map((o, i) => ({
                            ...o,
                            is_correct: i === idx
                          }));
                          setNewOptions(updated);
                        }}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                        title="Mark as single correct answer"
                      />
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: 20, color: '#94A3B8' }}>
                      {String.fromCharCode(65 + idx)}:
                    </span>
                    <input
                      type="text"
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      value={opt.text}
                      onChange={(e) => {
                        const updated = [...newOptions];
                        updated[idx].text = e.target.value;
                        setNewOptions(updated);
                      }}
                      style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
                    />
                    {newOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx, false)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#EF4444', borderColor: '#EF4444', padding: '4px 8px' }}
                        title="Remove this option"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#F8FAFC' }}>
              Explanation / Rationale
            </label>
            <textarea
              rows={2}
              placeholder="Explains why the correct answer is right after participants respond..."
              value={newExplanation}
              onChange={(e) => setNewExplanation(e.target.value)}
              style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button onClick={() => setInlineModalOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button onClick={handleCreateInlineQuestion} className="btn btn-teal">
              Add Question
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: AI QUESTION IMPROVER ================= */}
      <Modal
        isOpen={improveModalOpen}
        onClose={() => setImproveModalOpen(false)}
        title="✨ Improve Question with AI"
        maxWidth={780}
      >
        {improveLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div className="spinner" style={{ width: 36, height: 36, border: '3px solid rgba(20, 184, 166, 0.3)', borderTopColor: 'var(--color-teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Refining Question with Local AI...</h4>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', maxWidth: 440 }}>
              Optimizing question clarity, grammar, and distractor plausibility while strictly preserving your learning concept and intended correct answer.
            </p>
          </div>
        ) : improveError ? (
          <div style={{ padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: 8, color: '#FCA5A5', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <AlertCircle size={18} />
              <span>Improvement Error</span>
            </div>
            <p style={{ fontSize: '0.85rem' }}>{improveError}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button type="button" onClick={() => setImproveModalOpen(false)} className="btn btn-outline btn-sm">Close</button>
            </div>
          </div>
        ) : improvedResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Enhancement Highlights Note */}
            {improvedResult.improvement_notes && (
              <div style={{
                backgroundColor: 'rgba(20, 184, 166, 0.1)',
                border: '1px solid #14B8A6',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: '0.85rem',
                color: '#2DD4BF',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10
              }}>
                <Sparkles size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>AI Refinement Notes:</strong> {improvedResult.improvement_notes}
                </div>
              </div>
            )}

            {/* Comparison Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 14 }}>
              {/* Original */}
              <div style={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: 14 }}>
                <span className="badge badge-gray" style={{ fontSize: '0.7rem', marginBottom: 8 }}>Original Version</span>
                <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#CBD5E1', marginBottom: 12 }}>
                  {improvedResult.original_question}
                </p>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                  <strong>Intended Correct Answer:</strong>
                  <div style={{ color: '#34D399', fontWeight: 600, marginTop: 2 }}>
                    {improvedResult.correct_answer}
                  </div>
                </div>
              </div>

              {/* Improved */}
              <div style={{ backgroundColor: '#0F172A', border: '1px solid #10B981', borderRadius: 10, padding: 14 }}>
                <span className="badge badge-success" style={{ fontSize: '0.7rem', marginBottom: 8 }}>AI Enhanced Version</span>
                <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#F8FAFC', marginBottom: 12 }}>
                  {improvedResult.improved_question}
                </p>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                  <strong>Explanation / Rationale:</strong>
                  <div style={{ color: '#E2E8F0', fontStyle: 'italic', marginTop: 2 }}>
                    {improvedResult.explanation}
                  </div>
                </div>
              </div>
            </div>

            {/* Options Preview */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#F8FAFC' }}>
                Refined Options Preview
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(improvedResult.options || []).map((opt, i) => (
                  <div
                    key={opt.id || i}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      backgroundColor: opt.is_correct ? 'rgba(16, 185, 129, 0.15)' : '#0F172A',
                      border: `1px solid ${opt.is_correct ? '#10B981' : '#334155'}`,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: opt.is_correct ? '#34D399' : '#CBD5E1'
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{String.fromCharCode(65 + i)}.</span>
                    <span style={{ flex: 1 }}>{opt.text}</span>
                    {opt.is_correct && <CheckCircle2 size={15} color="#10B981" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, borderTop: '1px solid #334155', paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => setImproveModalOpen(false)}
                className="btn btn-outline"
              >
                Cancel / Keep Original
              </button>
              <button
                type="button"
                onClick={handleAcceptImprovement}
                className="btn btn-teal"
                style={{ fontWeight: 700 }}
              >
                <Check size={16} />
                <span>Accept & Update Question</span>
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ================= MODAL: REGENERATE QUESTION ================= */}
      <Modal
        isOpen={regenerateModalOpen}
        onClose={() => setRegenerateModalOpen(false)}
        title="🔄 Regenerate Alternative Question"
        maxWidth={780}
      >
        {regenerateLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div className="spinner" style={{ width: 36, height: 36, border: '3px solid rgba(99, 102, 241, 0.3)', borderTopColor: '#818CF8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Generating Fresh Scenario...</h4>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', maxWidth: 440 }}>
              Creating a distinct new question stem, application scenario, and four fresh distractors assessing the same underlying concept.
            </p>
          </div>
        ) : regenerateError ? (
          <div style={{ padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: 8, color: '#FCA5A5', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <AlertCircle size={18} />
              <span>Regeneration Error</span>
            </div>
            <p style={{ fontSize: '0.85rem' }}>{regenerateError}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button type="button" onClick={() => setRegenerateModalOpen(false)} className="btn btn-outline btn-sm">Close</button>
            </div>
          </div>
        ) : regeneratedResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Regeneration Notes */}
            {regeneratedResult.regeneration_notes && (
              <div style={{
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid #6366F1',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: '0.85rem',
                color: '#A5B4FC',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10
              }}>
                <RefreshCw size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>New Assessment Angle:</strong> {regeneratedResult.regeneration_notes}
                </div>
              </div>
            )}

            {/* Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 14 }}>
              {/* Original */}
              <div style={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: 14 }}>
                <span className="badge badge-gray" style={{ fontSize: '0.7rem', marginBottom: 8 }}>Original Concept Source</span>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#94A3B8' }}>
                  {regeneratedResult.original_question}
                </p>
              </div>

              {/* Regenerated */}
              <div style={{ backgroundColor: '#0F172A', border: '1px solid #818CF8', borderRadius: 10, padding: 14 }}>
                <span className="badge badge-teal" style={{ fontSize: '0.7rem', marginBottom: 8, backgroundColor: '#4F46E5', color: '#FFFFFF' }}>
                  Brand New Alternative
                </span>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F8FAFC' }}>
                  {regeneratedResult.new_question}
                </p>
              </div>
            </div>

            {/* New Options Preview */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#F8FAFC' }}>
                New Options & Answer Key
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(regeneratedResult.options || []).map((opt, i) => (
                  <div
                    key={opt.id || i}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      backgroundColor: opt.is_correct ? 'rgba(16, 185, 129, 0.15)' : '#0F172A',
                      border: `1px solid ${opt.is_correct ? '#10B981' : '#334155'}`,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: opt.is_correct ? '#34D399' : '#CBD5E1'
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{String.fromCharCode(65 + i)}.</span>
                    <span style={{ flex: 1 }}>{opt.text}</span>
                    {opt.is_correct && <CheckCircle2 size={15} color="#10B981" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            {regeneratedResult.explanation && (
              <div style={{ fontSize: '0.82rem', color: '#94A3B8', backgroundColor: '#0F172A', padding: '10px 14px', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#E2E8F0' }}>Rationale:</strong> {regeneratedResult.explanation}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, borderTop: '1px solid #334155', paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => setRegenerateModalOpen(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptRegeneration}
                className="btn btn-primary"
                style={{ fontWeight: 700, backgroundColor: '#6366F1', borderColor: '#4F46E5' }}
              >
                <RefreshCw size={16} />
                <span>Replace with New Question</span>
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ================= MODAL: QUIZ QUALITY CHECK ================= */}
      <Modal
        isOpen={qualityModalOpen}
        onClose={() => setQualityModalOpen(false)}
        title="🔍 Quiz Quality & Psychometric Audit"
        maxWidth={840}
      >
        {qualityCheckLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div className="spinner" style={{ width: 36, height: 36, border: '3px solid rgba(139, 92, 246, 0.3)', borderTopColor: '#A78BFA', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Auditing Quiz Quality...</h4>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', maxWidth: 460 }}>
              Checking structural completeness, detecting duplicate questions, identifying answer ambiguity, and rating distractor viability.
            </p>
          </div>
        ) : qualityError ? (
          <div style={{ padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: 8, color: '#FCA5A5' }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>Quality Audit Error</p>
            <p style={{ fontSize: '0.85rem' }}>{qualityError}</p>
          </div>
        ) : qualityReport ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Overall Score Banner */}
            <div style={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  backgroundColor: qualityReport.quality_score >= 85 ? 'rgba(16, 185, 129, 0.15)' : qualityReport.quality_score >= 60 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `2px solid ${qualityReport.quality_score >= 85 ? '#10B981' : qualityReport.quality_score >= 60 ? '#F59E0B' : '#EF4444'}`,
                  color: qualityReport.quality_score >= 85 ? '#34D399' : qualityReport.quality_score >= 60 ? '#FBBF24' : '#F87171'
                }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>{qualityReport.quality_score}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' }}>/ 100</span>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC' }}>
                      Overall Status: {qualityReport.status}
                    </h4>
                    <span className={`badge ${qualityReport.quality_score >= 85 ? 'badge-success' : qualityReport.quality_score >= 60 ? 'badge-gold' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                      {qualityReport.issues_count} Issue(s)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginTop: 4, maxWidth: 480 }}>
                    {qualityReport.summary}
                  </p>
                </div>
              </div>

              {/* Difficulty Distribution Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Difficulty Balance</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>{qualityReport.difficulty_distribution?.easy || 0} Easy</span>
                  <span className="badge badge-teal" style={{ fontSize: '0.72rem' }}>{qualityReport.difficulty_distribution?.medium || 0} Med</span>
                  <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>{qualityReport.difficulty_distribution?.hard || 0} Hard</span>
                </div>
              </div>
            </div>

            {/* Passed Checks */}
            {qualityReport.passed_checks?.length > 0 && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 10, padding: '12px 16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Checks Passed
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {qualityReport.passed_checks.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#E2E8F0' }}>
                      <CheckCircle2 size={14} color="#10B981" />
                      <span>{msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flagged Issues List */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Flagged Recommendations & Issues ({qualityReport.issues?.length || 0})
                </span>
              </div>

              {(!qualityReport.issues || qualityReport.issues.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#0F172A', borderRadius: 10, border: '1px solid #334155', color: '#34D399' }}>
                  <CheckCircle2 size={28} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 700, fontSize: '0.92rem' }}>All quality standards met!</p>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No structural defects, ambiguous wording, or weak distractors found.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                  {qualityReport.issues.map((item, idx) => {
                    const isCritical = item.severity === 'critical';
                    const isWarning = item.severity === 'warning';
                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#0F172A',
                          border: `1px solid ${isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#334155'}`,
                          borderRadius: 8,
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              className={`badge ${isCritical ? 'badge-danger' : isWarning ? 'badge-gold' : 'badge-gray'}`}
                              style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}
                            >
                              {item.severity || 'suggestion'}
                            </span>
                            <span className="badge badge-teal" style={{ fontSize: '0.68rem' }}>
                              {item.category || 'quality'}
                            </span>
                            {item.question_index >= 0 && (
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC' }}>
                                Question #{item.question_index + 1}
                              </span>
                            )}
                          </div>

                          {item.question_index >= 0 && item.question_index < selectedQuestions.length && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setQualityModalOpen(false);
                                  handleOpenEditQuestion(item.question_index);
                                }}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                              >
                                Review Question
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setQualityModalOpen(false);
                                  handleOpenImproveModal(item.question_index);
                                }}
                                className="btn btn-teal btn-sm"
                                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                              >
                                Improve with AI
                              </button>
                            </div>
                          )}
                        </div>

                        {item.question_text && (
                          <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic' }}>
                            "{item.question_text.slice(0, 110)}{item.question_text.length > 110 ? '...' : ''}"
                          </div>
                        )}

                        <div style={{ fontSize: '0.84rem', color: '#F8FAFC' }}>
                          <strong>Issue:</strong> {item.issue}
                        </div>

                        {item.recommendation && (
                          <div style={{ fontSize: '0.8rem', color: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.08)', padding: '6px 10px', borderRadius: 6 }}>
                            <strong>Recommendation:</strong> {item.recommendation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, borderTop: '1px solid #334155', paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => setQualityModalOpen(false)}
                className="btn btn-teal"
              >
                Done / Return to Editor
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ================= MODAL: AI STUDY GUIDE ================= */}
      <Modal
        isOpen={studyGuideModalOpen}
        onClose={() => setStudyGuideModalOpen(false)}
        title="📚 AI Study Guide"
        maxWidth={860}
      >
        {studyGuideLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div className="spinner" style={{ width: 36, height: 36, border: '3px solid rgba(99, 102, 241, 0.3)', borderTopColor: '#818CF8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Synthesizing Comprehensive Study Guide...</h4>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', maxWidth: 440 }}>
              Extracting key concepts, foundational definitions, procedural highlights, and rapid recall questions strictly from {material?.filename || 'your document'}.
            </p>
          </div>
        ) : studyGuideError ? (
          <div style={{ padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: 8, color: '#FCA5A5' }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>Study Guide Generation Error</p>
            <p style={{ fontSize: '0.85rem' }}>{studyGuideError}</p>
          </div>
        ) : studyGuideData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 }}>
            {/* Header / Source Banner */}
            <div style={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC' }}>
                  {studyGuideData.title}
                </h3>
                <span className="badge badge-teal" style={{ fontSize: '0.72rem' }}>
                  Source: {studyGuideData.source_material}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5 }}>
                {studyGuideData.overview}
              </p>
            </div>

            {/* Key Concepts */}
            {studyGuideData.key_concepts?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F8FAFC', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.04em' }}>
                  Key Concepts & Definitions
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 10 }}>
                  {studyGuideData.key_concepts.map((kc, i) => (
                    <div key={i} style={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#38BDF8', marginBottom: 4 }}>
                        {kc.concept}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#E2E8F0', marginBottom: 6, lineHeight: 1.4 }}>
                        {kc.definition}
                      </div>
                      {kc.importance && (
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', borderTop: '1px solid #1E293B', paddingTop: 4 }}>
                          <strong>Significance:</strong> {kc.importance}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Points */}
            {studyGuideData.key_points?.length > 0 && (
              <div style={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: 16 }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F8FAFC', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.04em' }}>
                  Core Principles & Takeaways
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {studyGuideData.key_points.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.84rem', color: '#E2E8F0', lineHeight: 1.4 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(20, 184, 166, 0.15)', color: 'var(--color-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>
                        {i + 1}
                      </span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Review Recall Flashcards */}
            {studyGuideData.quick_review?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F8FAFC', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.04em' }}>
                  Rapid Recall & Self-Review
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 10 }}>
                  {studyGuideData.quick_review.map((qr, i) => (
                    <div key={i} style={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#F8FAFC', marginBottom: 6 }}>
                        Q: {qr.question}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#34D399', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '6px 10px', borderRadius: 6 }}>
                        A: {qr.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Assessment Questions */}
            {studyGuideData.possible_quiz_questions?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F8FAFC', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.04em' }}>
                  Sample Assessment Questions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {studyGuideData.possible_quiz_questions.map((sampleQ, i) => (
                    <div key={i} style={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#F8FAFC', marginBottom: 6 }}>
                        {i + 1}. {sampleQ.question}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#34D399', fontWeight: 600, marginBottom: 4 }}>
                        Correct Answer: {sampleQ.correct_answer}
                      </div>
                      {sampleQ.explanation && (
                        <div style={{ fontSize: '0.76rem', color: '#94A3B8', fontStyle: 'italic' }}>
                          Rationale: {sampleQ.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: 14, marginTop: 10 }}>
              <button
                type="button"
                onClick={handleGenerateStudyGuide}
                className="btn btn-outline btn-sm"
                title="Regenerate guide with fresh layout and questions"
              >
                <RefreshCw size={14} />
                <span>Regenerate</span>
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleCopyStudyGuide}
                  className="btn btn-outline btn-sm"
                >
                  {copiedStudyGuide ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copiedStudyGuide ? 'Copied Guide!' : 'Copy to Clipboard'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudyGuideModalOpen(false)}
                  className="btn btn-teal btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ================= MODAL: AI MATERIAL SUMMARY ================= */}
      <Modal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        title="📝 AI Material Summary"
        maxWidth={800}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary Mode Tabs */}
          <div style={{
            display: 'flex',
            gap: 6,
            padding: 4,
            backgroundColor: '#0F172A',
            borderRadius: 8,
            border: '1px solid #334155',
            overflowX: 'auto'
          }}>
            {[
              { mode: 'short', label: 'Short Summary' },
              { mode: 'detailed', label: 'Detailed Breakdown' },
              { mode: 'bullet_points', label: 'Bullet Points' },
              { mode: 'simple_explanation', label: 'Simple / ELI5' }
            ].map((tab) => (
              <button
                key={tab.mode}
                type="button"
                onClick={() => handleOpenMaterialSummary(tab.mode)}
                disabled={summaryLoading}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: summaryMode === tab.mode ? 'var(--color-teal)' : 'transparent',
                  color: summaryMode === tab.mode ? '#FFFFFF' : '#94A3B8',
                  border: 'none',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {summaryLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div className="spinner" style={{ width: 36, height: 36, border: '3px solid rgba(6, 182, 212, 0.3)', borderTopColor: '#06B6D4', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Generating {summaryMode.replace('_', ' ')}...</h4>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                Analyzing document text and summarizing key instructional principles.
              </p>
            </div>
          ) : summaryError ? (
            <div style={{ padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: 8, color: '#FCA5A5' }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Summary Error</p>
              <p style={{ fontSize: '0.85rem' }}>{summaryError}</p>
            </div>
          ) : summaryData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '68vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94A3B8' }}>
                <span>File: <strong>{summaryData.filename}</strong></span>
                <span>{summaryData.word_count} words</span>
              </div>

              {/* Main Summary Body */}
              <div style={{
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: 10,
                padding: '16px 18px',
                fontSize: '0.88rem',
                color: '#E2E8F0',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}>
                {summaryData.summary}
              </div>

              {/* Key Takeaways */}
              {summaryData.key_takeaways?.length > 0 && (
                <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 8, padding: 14 }}>
                  <h5 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#22D3EE', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                    Key Takeaways
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {summaryData.key_takeaways.map((takeaway, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem', color: '#E2E8F0' }}>
                        <span style={{ color: '#06B6D4', fontWeight: 800 }}>&bull;</span>
                        <span>{takeaway}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #334155', paddingTop: 14 }}>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="btn btn-outline btn-sm"
                >
                  {copiedSummary ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copiedSummary ? 'Copied!' : 'Copy Summary'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryModalOpen(false)}
                  className="btn btn-teal btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

    </div>
  );
}
