import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaBrain, FaArrowRight, FaLightbulb, FaCheck, FaClock } from 'react-icons/fa';

const AdaptiveQuiz = ({ lessonId, onComplete, onWrongAnswer, onCorrectAnswer, onReady, onTimeUp }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [askedTexts, setAskedTexts] = useState([]); 
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentDifficulty, setCurrentDifficulty] = useState(1); 
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  
  const [answerState, setAnswerState] = useState(null); 
  const [shuffledMatchOptions, setShuffledMatchOptions] = useState([]);
  
  const [isWrong, setIsWrong] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);

  const [topicTracker, setTopicTracker] = useState({});
  
  // ✅ NEW: Timer State
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/quizzes/${lessonId}`);
        const fetchedQuestions = res.data.questions || []; 
        setQuestions(fetchedQuestions);
        setLoading(false);
        
        if (onReady && fetchedQuestions.length > 0) {
          onReady(fetchedQuestions.length);
        }

        // ✅ SET TIMER: Instructor limit OR auto-calculate (45s per question)
        const initialTime = res.data.timeLimit || (fetchedQuestions.length * 45);
        setTimeLeft(initialTime);

        const initialTracker = {};
        fetchedQuestions.forEach(q => {
          const tag = q.topicTag || 'General';
          if (!initialTracker[tag]) {
            initialTracker[tag] = { correct: 0, total: 0 };
          }
        });
        setTopicTracker(initialTracker);

      } catch (err) {
        console.error("Failed to load adaptive quiz", err);
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [lessonId]);

  // ✅ NEW: Timer Countdown Hook
  useEffect(() => {
    // Stop ticking if no time is set, if time ran out, or if they are reading the explanation
    if (timeLeft === null || timeLeft <= 0 || showExplanation) return;
    
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          if (onTimeUp) onTimeUp(); // Tell parent component time is up!
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, showExplanation, onTimeUp]);

  useEffect(() => {
    if (questions.length > 0 && !currentQuestion) pickNextQuestion();
  }, [questions, currentQuestion]);

  const pickNextQuestion = () => {
    let available = questions.filter(q => q.difficulty === currentDifficulty && !askedTexts.includes(q.text));
    if (available.length === 0) available = questions.filter(q => !askedTexts.includes(q.text));

    if (available.length === 0) {
      onComplete({ score, total: askedTexts.length, topicTracker });
      return;
    }

    const nextQ = available[Math.floor(Math.random() * available.length)];
    setCurrentQuestion(nextQ);
    setAskedTexts([...askedTexts, nextQ.text]);
    
    if (nextQ.type === 'match') {
      setAnswerState({});
      setShuffledMatchOptions(nextQ.options.map(o => o.matchRight).sort(() => Math.random() - 0.5));
    } else if (nextQ.type === 'fill') {
      setAnswerState('');
    } else {
      setAnswerState([]);
    }

    setIsWrong(false);
    setShowExplanation(false);
  };

  const handleOptionToggle = (optText) => {
    if (showExplanation) return;
    setIsWrong(false);
    
    if (currentQuestion.type === 'multiple') {
      setAnswerState(prev => {
        const currentArr = Array.isArray(prev) ? prev : [];
        return currentArr.includes(optText) ? currentArr.filter(v => v !== optText) : [...currentArr, optText];
      });
    } else {
      setAnswerState([optText]); 
    }
  };

  const handleSubmit = () => {
    let correct = false;
    if (currentQuestion.type === 'fill') {
      const ans = (answerState || '').toLowerCase().trim();
      const cor = (currentQuestion.correctAnswerText || currentQuestion.answer || '').toLowerCase().trim();
      correct = ans === cor;
    } else if (currentQuestion.type === 'match') {
      correct = currentQuestion.options.every(o => answerState[o.matchLeft] === o.matchRight);
    } else {
      const correctValues = currentQuestion.options.filter(o => o.isCorrect === true || String(o.isCorrect) === 'true').map(o => o.text);
      if (currentQuestion.type === 'multiple') {
        correct = answerState.length === correctValues.length && answerState.every(v => correctValues.includes(v));
      } else {
        correct = correctValues.includes(answerState[0]);
      }
    }

    setShowExplanation(true);
    
    const currentTag = currentQuestion.topicTag || 'General';
    setTopicTracker(prev => ({
      ...prev,
      [currentTag]: {
        correct: prev[currentTag].correct + (correct ? 1 : 0),
        total: prev[currentTag].total + 1
      }
    }));
    
    if (correct) {
      if (onCorrectAnswer) onCorrectAnswer();
      setConsecutiveCorrect(prev => prev + 1);
      setScore(score + (currentDifficulty * 10)); 
      setIsWrong(false);
      if (consecutiveCorrect + 1 >= 2 && currentDifficulty < 3) {
        setCurrentDifficulty(currentDifficulty + 1);
        setConsecutiveCorrect(0); 
      }
    } else {
      if (onWrongAnswer) onWrongAnswer();
      setIsWrong(true);
      setConsecutiveCorrect(0); 
      if (currentDifficulty > 1) setCurrentDifficulty(currentDifficulty - 1); 
    }
  };

  const getCorrectAnswerDisplay = () => {
    if (currentQuestion.type === 'fill') return currentQuestion.correctAnswerText || currentQuestion.answer;
    if (currentQuestion.type === 'match') return currentQuestion.options.map(o => `${o.matchLeft} → ${o.matchRight}`).join(' | ');
    return currentQuestion.options.filter(o => o.isCorrect === true || String(o.isCorrect) === 'true').map(o => o.text).join(', ');
  };

  const formatTime = (seconds) => {
    if (seconds === null) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return <div className="glass-card p-5 text-center">🧠 AI is compiling your adaptive exam...</div>;
  if (!currentQuestion) return null;

  let canSubmit = false;
  if (currentQuestion.type === 'fill') canSubmit = typeof answerState === 'string' && answerState.trim().length > 0;
  else if (currentQuestion.type === 'match') canSubmit = answerState && Object.keys(answerState).length === currentQuestion.options.length;
  else canSubmit = Array.isArray(answerState) && answerState.length > 0;

  return (
    <div className="glass-card" style={{ padding: '35px', maxWidth: '650px', margin: '0 auto', borderRadius: '28px', border: '1px solid var(--card-border)', background: 'var(--bg-card)' }}>
      <style>{`
        .quiz-option-card:hover { transform: translateY(-2px); border-color: #6c5ce7 !important; background: rgba(108, 92, 231, 0.05) !important; }
        .quiz-option-card.selected { border-color: #6c5ce7 !important; background: rgba(108, 92, 231, 0.12) !important; box-shadow: 0 10px 20px rgba(108, 92, 231, 0.1); }
        .timer-warning { animation: pulseWarning 1s infinite; color: #ff4757 !important; border-color: #ff4757 !important; }
        @keyframes pulseWarning { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <FaBrain color="#6c5ce7" /> Mastery Level {currentDifficulty}
        </span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {timeLeft !== null && (
            <span className={timeLeft <= 30 ? 'timer-warning' : ''} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '15px', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.3s' }}>
              <FaClock /> {formatTime(timeLeft)}
            </span>
          )}
          <span style={{ background: '#6c5ce7', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontWeight: '900', fontSize: '13px', boxShadow: '0 4px 10px rgba(108, 92, 231, 0.3)' }}>
            {score} XP
          </span>
        </div>
      </div>

      <h3 style={{ color: 'var(--text-primary)', marginBottom: '25px', lineHeight: '1.6', fontSize: '20px', fontWeight: '700' }}>{currentQuestion.text}</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '30px' }}>
        {(currentQuestion.type === 'single' || currentQuestion.type === 'multiple') && currentQuestion.options?.map((opt, idx) => {
          const isSelected = Array.isArray(answerState) && answerState.includes(opt.text);
          return (
            <div 
              key={idx} 
              onClick={() => handleOptionToggle(opt.text)} 
              className={`quiz-option-card ${isSelected ? 'selected' : ''}`}
              style={{ 
                padding: '18px', borderRadius: '18px', cursor: showExplanation ? 'default' : 'pointer', 
                background: 'rgba(255,255,255,0.03)', border: '2px solid var(--card-border)', 
                display: 'flex', alignItems: 'center', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: showExplanation && !isSelected ? 0.5 : 1
              }}
            >
              <div style={{ 
                width: '22px', height: '22px', borderRadius: currentQuestion.type === 'multiple' ? '6px' : '50%', 
                border: `2.5px solid ${isSelected ? '#6c5ce7' : '#a29bfe'}`, 
                marginRight: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                background: isSelected ? '#6c5ce7' : 'transparent',
                transition: 'all 0.2s'
              }}>
                {isSelected && <FaCheck size={10} color="#fff" />}
              </div>
              <span style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600' }}>{opt.text}</span>
            </div>
          );
        })}

        {currentQuestion.type === 'fill' && (
          <input 
            type="text" 
            placeholder="Type your answer here..." 
            value={answerState || ''} 
            onChange={(e) => setAnswerState(e.target.value)} 
            disabled={showExplanation} 
            style={{ padding: '20px', borderRadius: '18px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', border: '2px solid var(--card-border)', outline: 'none', fontSize: '17px', width: '100%', transition: 'all 0.3s' }} 
          />
        )}

        {currentQuestion.type === 'match' && currentQuestion.options?.map((opt, idx) => (
          <div key={idx} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px', 
            background: 'rgba(255,255,255,0.02)', 
            padding: '15px', 
            borderRadius: '18px', 
            border: '2px solid var(--card-border)',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ flex: 1, color: 'var(--text-primary)', fontSize: '15px', fontWeight: 'bold' }}>
              {opt.matchLeft}
            </div>
            <select 
              disabled={showExplanation} 
              value={answerState?.[opt.matchLeft] || ""} 
              onChange={e => setAnswerState({ ...answerState, [opt.matchLeft]: e.target.value })} 
              style={{ 
                flex: 1.2, 
                padding: '12px', 
                borderRadius: '12px', 
                background: 'var(--bg-body)', 
                color: 'var(--text-primary)', 
                border: '1px solid #a29bfe', 
                cursor: 'pointer', 
                outline: 'none', 
                fontWeight: '600',
                minWidth: 0,
                width: '100%',
                textOverflow: 'ellipsis'
              }}
            >
              <option value="">Select match...</option>
              {shuffledMatchOptions.map((o, i) => <option key={i} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {showExplanation && (
        <div style={{ 
          background: isWrong ? 'rgba(255, 71, 87, 0.1)' : 'rgba(46, 204, 113, 0.1)', 
          borderLeft: `6px solid ${isWrong ? '#ff4757' : '#2ecc71'}`, 
          padding: '22px', borderRadius: '20px', marginBottom: '30px', animation: 'fadeIn 0.5s ease' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: isWrong ? '#ff4757' : '#2ecc71', fontWeight: '900', marginBottom: '12px', fontSize: '18px' }}>
            {isWrong ? <FaTimesCircle size={22} /> : <FaCheckCircle size={22} />} {isWrong ? "INCORRECT" : "CORRECT"}
          </div>
          {isWrong && (
            <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
              <span style={{ fontWeight: 'bold', color: '#ff4757', display: 'block', marginBottom: '4px' }}>Target Answer:</span> 
              <span style={{ fontWeight: '500' }}>{getCorrectAnswerDisplay()}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.7' }}>
            <FaLightbulb style={{ flexShrink: 0, marginTop: '4px' }} color="#6c5ce7" />
            <p style={{ margin: 0 }}>{currentQuestion.explanation || "Excellent logic applied to this module."}</p>
          </div>
        </div>
      )}

      {!showExplanation ? (
        <button 
          onClick={handleSubmit} 
          disabled={!canSubmit} 
          style={{ 
            width: '100%', padding: '20px', borderRadius: '20px', fontWeight: '900', fontSize: '18px', border: 'none', 
            cursor: canSubmit ? 'pointer' : 'not-allowed', 
            background: canSubmit ? '#6c5ce7' : 'rgba(108, 92, 231, 0.15)', 
            color: canSubmit ? '#fff' : 'rgba(255, 255, 255, 0.3)', 
            boxShadow: canSubmit ? '0 12px 30px rgba(108, 92, 231, 0.4)' : 'none', 
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: canSubmit ? 'scale(1)' : 'scale(0.98)'
          }}
        >
          Check Answer
        </button>
      ) : (
        <button 
          onClick={pickNextQuestion} 
          style={{ width: '100%', padding: '20px', borderRadius: '20px', background: '#00b894', color: '#fff', border: 'none', fontWeight: '900', fontSize: '18px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(0, 184, 148, 0.3)' }}
        >
          Next Challenge <FaArrowRight />
        </button>
      )}
    </div>
  );
};

export default AdaptiveQuiz;