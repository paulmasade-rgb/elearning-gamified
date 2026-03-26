import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaPlus, FaTrash, FaUsers, FaBook, FaComments, 
  FaSignOutAlt, FaChalkboardTeacher, FaSun, FaMoon, FaUserShield, FaSpinner,
  FaMagic, FaBrain, FaEdit, FaSave, FaTimes, FaBan, FaCheck,
  FaVideo, FaFont, FaClone, FaClipboardList, FaClock
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

// ✅ Added onNavigate to props
const AdminDashboard = ({ onLogout, toggleTheme, currentTheme, role, onOpenChat, onNavigate }) => {
  const isSuperAdmin = role === 'admin';
  const dashboardTitle = isSuperAdmin ? "System Administrator" : "Academic Instructor";

  const [activeTab, setActiveTab] = useState('courses'); 
  const [generatingId, setGeneratingId] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  
  // --- CURRICULUM STATE ---
  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    xpReward: 500,
    modules: [{
      moduleNumber: "1.0",
      title: "",
      chapters: [{
        chapterNumber: "1.1",
        title: "",
        pages: [{ pageNumber: "1.1.1", title: "", topicTag: "", contentBlocks: [] }]
      }]
    }]
  });

  // --- ASSESSMENTS & GRADEBOOK STATE ---
  const [gradebook, setGradebook] = useState([]);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [editingQuizTimer, setEditingQuizTimer] = useState(null);

  // ✅ NEW: MANUAL QUIZ BUILDER STATE
  const [manualQuiz, setManualQuiz] = useState({
    lessonId: "",
    timeLimit: 600, // Default 10 mins
    questions: []
  });

  const fetchCourses = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/courses`);
      setCourses(res.data);
    } catch (err) { console.error("Failed to load curriculum:", err); }
  };

  useEffect(() => { fetchCourses(); }, []);

  // --- BUILDER HELPER FUNCTIONS ---
  const addContentBlock = (modIdx, chapIdx, pageIdx, type) => {
    const updated = { ...newCourse };
    const newBlock = { type, data: {} };
    if (type === 'text') newBlock.data.content = "";
    if (type === 'video') newBlock.data.videoId = "";
    if (type === 'flashcard') { newBlock.data.front = ""; newBlock.data.back = ""; }
    updated.modules[modIdx].chapters[chapIdx].pages[pageIdx].contentBlocks.push(newBlock);
    setNewCourse(updated);
  };

  const updateContentData = (modIdx, chapIdx, pageIdx, blockIdx, field, value) => {
    const updated = { ...newCourse };
    updated.modules[modIdx].chapters[chapIdx].pages[pageIdx].contentBlocks[blockIdx].data[field] = value;
    setNewCourse(updated);
  };

  // --- SCHOLAR DATA FETCHING ---
  const [students, setStudents] = useState([]);
  const [loadingScholars, setLoadingScholars] = useState(false);

  const fetchScholars = async () => {
    setLoadingScholars(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/users`); 
      const currentUserId = localStorage.getItem('userId');
      setStudents(res.data.filter(u => u._id !== currentUserId));
    } catch (err) { toast.error("Cloud sync failed."); } 
    finally { setLoadingScholars(false); }
  };

  useEffect(() => { if (activeTab === 'students') fetchScholars(); }, [activeTab]);

  // --- FORUM DATA FETCHING ---
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/posts`);
      setPosts(res.data);
    } catch (err) { toast.error("Failed to fetch forum data."); } 
    finally { setLoadingPosts(false); }
  };

  useEffect(() => { if (activeTab === 'forum') fetchPosts(); }, [activeTab]);

  // --- GRADEBOOK & QUIZ FETCHING ---
  const fetchAssessments = async () => {
    setLoadingAssessments(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const [gradesRes, quizzesRes] = await Promise.all([
        axios.get(`${apiUrl}/api/users/global-missions`),
        axios.get(`${apiUrl}/api/quizzes`)
      ]);
      setGradebook(gradesRes.data);
      setAllQuizzes(quizzesRes.data);
    } catch (err) { toast.error("Failed to load assessments data."); } 
    finally { setLoadingAssessments(false); }
  };

  useEffect(() => { if (activeTab === 'assessments') fetchAssessments(); }, [activeTab]);

  // --- ADMIN ACTIONS ---
  const handleToggleBan = async (username) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/users/${username}/toggle-ban`);
      toast.success(res.data.message);
      fetchScholars();
    } catch (err) { toast.error("Moderation command failed."); }
  };

  const handleUpdateStudent = async (username, updatedData) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/users/${username}/admin-edit`, updatedData);
      toast.success(`${username}'s record updated.`);
      setEditingStudent(null);
      fetchScholars();
    } catch (err) { toast.error("Update failed."); }
  };

  const handleNeutralizePost = async (id) => {
    if(window.confirm("Permanently neutralize this post?")) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        await axios.delete(`${apiUrl}/api/posts/${id}`);
        setPosts(posts.filter(p => p._id !== id));
        toast.success("Content neutralized.");
      } catch (err) { toast.error("Failed to remove content."); }
    }
  };

  const handleGenerateAIQuiz = async (course) => {
    setGeneratingId(course._id);
    const toastId = toast.loading(`Generating AI Logic for ${course.title}...`);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/quizzes/generate`, {
        lessonId: `lesson-00${course._id}`,
        lessonContent: `${course.title} within ${course.modules?.[0]?.title || 'Phase 1'}. Focus on core principles and adaptive assessment.`
      });
      toast.success("AI Brain specialized for this module!", { id: toastId });
    } catch (err) {
      toast.error("AI engine temporarily offline.", { id: toastId });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.title) return toast.error("Course title is required");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${apiUrl}/api/courses`, newCourse);
      setCourses([...courses, res.data]);
      setNewCourse({
        title: "", description: "", xpReward: 500,
        modules: [{ moduleNumber: "1.0", title: "", chapters: [{ chapterNumber: "1.1", title: "", pages: [{ pageNumber: "1.1.1", title: "", topicTag: "", contentBlocks: [] }] }] }]
      });
      toast.success("NetAcad Curriculum Deployed!");
    } catch (err) { toast.error("Failed to deploy to database."); }
  };

  const handleDeleteCourse = async (id) => {
    if(window.confirm("Confirm deletion of this course?")) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        await axios.delete(`${apiUrl}/api/courses/${id}`);
        setCourses(courses.filter(c => c._id !== id));
        toast.success("Course removed from catalog.");
      } catch (err) { toast.error("Failed to delete."); }
    }
  };

  // --- QUIZ MANAGER ACTIONS ---
  const handleDeleteQuiz = async (id) => {
    if(window.confirm("Permanently delete this quiz?")) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        await axios.delete(`${apiUrl}/api/quizzes/${id}`);
        setAllQuizzes(allQuizzes.filter(q => q._id !== id));
        toast.success("Quiz Deleted.");
      } catch (err) { toast.error("Failed to delete quiz."); }
    }
  };

  const handleSaveQuizTimer = async (quizId) => {
    try {
      const timeLimit = parseInt(document.getElementById(`timer-${quizId}`).value);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/quizzes/${quizId}`, { timeLimit });
      toast.success("Quiz Timer Updated!");
      setEditingQuizTimer(null);
      fetchAssessments();
    } catch (err) { toast.error("Failed to update timer."); }
  };

  // --- ✅ NEW: MANUAL QUIZ LOGIC ---
  const handleAddManualQuestion = (type) => {
    const q = { text: "", type, difficulty: 1, explanation: "", topicTag: "General" };
    if (type === 'single' || type === 'multiple') q.options = [{ text: "", isCorrect: false }];
    if (type === 'fill') q.correctAnswerText = "";
    if (type === 'match') q.options = [{ matchLeft: "", matchRight: "" }];
    setManualQuiz({ ...manualQuiz, questions: [...manualQuiz.questions, q] });
  };

  const updateManualQuestion = (qIdx, field, value) => {
    const mq = { ...manualQuiz };
    mq.questions[qIdx][field] = value;
    setManualQuiz(mq);
  };

  const addManualOption = (qIdx) => {
    const mq = { ...manualQuiz };
    const type = mq.questions[qIdx].type;
    if (type === 'single' || type === 'multiple') mq.questions[qIdx].options.push({ text: "", isCorrect: false });
    if (type === 'match') mq.questions[qIdx].options.push({ matchLeft: "", matchRight: "" });
    setManualQuiz(mq);
  };

  const updateManualOption = (qIdx, optIdx, field, value) => {
    const mq = { ...manualQuiz };
    if (field === 'isCorrect' && mq.questions[qIdx].type === 'single') {
      mq.questions[qIdx].options.forEach(o => o.isCorrect = false); // Enforce single correct
    }
    mq.questions[qIdx].options[optIdx][field] = value;
    setManualQuiz(mq);
  };

  const handleDeployManualQuiz = async (e) => {
    e.preventDefault();
    if (!manualQuiz.lessonId) return toast.error("Target Course is required");
    if (manualQuiz.questions.length === 0) return toast.error("Add at least one question");

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/quizzes`, manualQuiz);
      toast.success("Instructor Quiz Deployed!");
      setManualQuiz({ lessonId: "", timeLimit: 600, questions: [] });
      fetchAssessments();
    } catch (err) { toast.error("Deployment failed"); }
  };

  // --- RENDERING FUNCTIONS ---
  const renderCourses = () => (
    <div className="animate-fade">
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Curriculum Architect</h2>
      <div className="glass-card" style={{ padding: '25px', marginBottom: '30px', border: '1.5px solid var(--accent-color)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--accent-color)', fontSize: '14px', textTransform: 'uppercase' }}>Initialize New Course</h3>
        <form onSubmit={handleAddCourse} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input placeholder="Course Master Title (e.g. Intro to Subnetting)" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} style={styles.input} />
            <input type="number" placeholder="XP Reward (Default: 500)" value={newCourse.xpReward} onChange={e => setNewCourse({...newCourse, xpReward: e.target.value})} style={styles.input} />
          </div>

          <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>Module 1.0 Settings</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <input placeholder="Module Title" value={newCourse.modules[0].title} onChange={e => { const u = {...newCourse}; u.modules[0].title = e.target.value; setNewCourse(u); }} style={styles.input} />
              <input placeholder="Chapter 1.1 Title" value={newCourse.modules[0].chapters[0].title} onChange={e => { const u = {...newCourse}; u.modules[0].chapters[0].title = e.target.value; setNewCourse(u); }} style={styles.input} />
            </div>

            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid var(--accent-color)' }}>
               <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Page 1.1.1 Builder</h4>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                 <input placeholder="Page Title" value={newCourse.modules[0].chapters[0].pages[0].title} onChange={e => { const u = {...newCourse}; u.modules[0].chapters[0].pages[0].title = e.target.value; setNewCourse(u); }} style={styles.input} />
                 <input placeholder="Topic Tag (For Analytics)" value={newCourse.modules[0].chapters[0].pages[0].topicTag} onChange={e => { const u = {...newCourse}; u.modules[0].chapters[0].pages[0].topicTag = e.target.value; setNewCourse(u); }} style={styles.input} />
               </div>

               {newCourse.modules[0].chapters[0].pages[0].contentBlocks.map((block, bIdx) => (
                 <div key={bIdx} style={{ padding: '10px', background: 'var(--bg-body)', marginBottom: '10px', borderRadius: '8px', border: '1px dashed var(--card-border)' }}>
                   <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>{block.type} BLOCK</div>
                   {block.type === 'text' && (
                     <textarea rows="3" placeholder="Enter text content (HTML supported)..." value={block.data.content} onChange={(e) => updateContentData(0,0,0, bIdx, 'content', e.target.value)} style={{...styles.input, width: '100%', resize: 'vertical'}} />
                   )}
                   {block.type === 'video' && (
                     <input placeholder="YouTube Video ID" value={block.data.videoId} onChange={(e) => updateContentData(0,0,0, bIdx, 'videoId', e.target.value)} style={{...styles.input, width: '100%'}} />
                   )}
                   {block.type === 'flashcard' && (
                     <div style={{ display: 'flex', gap: '10px' }}>
                       <input placeholder="Front of Card" value={block.data.front} onChange={(e) => updateContentData(0,0,0, bIdx, 'front', e.target.value)} style={{...styles.input, flex: 1}} />
                       <input placeholder="Back of Card" value={block.data.back} onChange={(e) => updateContentData(0,0,0, bIdx, 'back', e.target.value)} style={{...styles.input, flex: 1}} />
                     </div>
                   )}
                 </div>
               ))}

               <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                 <button type="button" onClick={() => addContentBlock(0,0,0, 'text')} style={styles.addBlockBtn}><FaFont /> Add Text</button>
                 <button type="button" onClick={() => addContentBlock(0,0,0, 'video')} style={styles.addBlockBtn}><FaVideo /> Add Video</button>
                 <button type="button" onClick={() => addContentBlock(0,0,0, 'flashcard')} style={styles.addBlockBtn}><FaClone /> Add Flashcard</button>
               </div>
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '15px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '16px' }}>
            <FaPlus /> Deploy Master Course
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {courses.map(course => (
          <div key={course._id} className="glass-card" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{course.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{course.xpReward || course.xp} XP Master Reward</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleGenerateAIQuiz(course)} disabled={generatingId === course._id} style={styles.aiBtn}>
                {generatingId === course._id ? <FaBrain className="fa-spin" /> : <FaMagic />}
                {generatingId === course._id ? "Analyzing..." : "AI Quiz"}
              </button>
              <button onClick={() => handleDeleteCourse(course._id)} style={styles.deleteBtn}><FaTrash /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAssessments = () => (
    <div className="animate-fade">
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Assessment Manager & Gradebook</h2>
      
      {/* ✅ NEW: MANUAL QUIZ CONSTRUCTOR */}
      <div className="glass-card" style={{ padding: '25px', marginBottom: '30px', border: '1px solid #2ecc71' }}>
        <h3 style={{ marginTop: 0, color: '#2ecc71', fontSize: '14px', textTransform: 'uppercase' }}>Manual Quiz Constructor</h3>
        <form onSubmit={handleDeployManualQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <select 
              value={manualQuiz.lessonId} 
              onChange={e => setManualQuiz({...manualQuiz, lessonId: e.target.value})} 
              style={{...styles.input, flex: 1, appearance: 'none', cursor: 'pointer'}}
            >
              <option value="">Select Target Course...</option>
              {courses.map(c => <option key={c._id} value={`lesson-00${c._id}`}>{c.title}</option>)}
            </select>
            <input type="number" placeholder="Time Limit (seconds)" value={manualQuiz.timeLimit} onChange={e => setManualQuiz({...manualQuiz, timeLimit: e.target.value})} style={{...styles.input, width: '180px'}} />
          </div>

          {manualQuiz.questions.map((q, qIdx) => (
            <div key={qIdx} style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 'bold' }}>QUESTION {qIdx + 1} ({q.type.toUpperCase()})</span>
                <button type="button" onClick={() => setManualQuiz({...manualQuiz, questions: manualQuiz.questions.filter((_, i) => i !== qIdx)})} style={{ background: 'transparent', border: 'none', color: '#ff7675', cursor: 'pointer' }}><FaTrash /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <input placeholder="Question Text" value={q.text} onChange={e => updateManualQuestion(qIdx, 'text', e.target.value)} style={styles.input} />
                <input placeholder="Topic Tag" value={q.topicTag} onChange={e => updateManualQuestion(qIdx, 'topicTag', e.target.value)} style={styles.input} />
                <select value={q.difficulty} onChange={e => updateManualQuestion(qIdx, 'difficulty', parseInt(e.target.value))} style={styles.input}>
                  <option value={1}>Easy (1)</option><option value={2}>Medium (2)</option><option value={3}>Hard (3)</option>
                </select>
              </div>

              <input placeholder="Explanation (Shown after answering)" value={q.explanation} onChange={e => updateManualQuestion(qIdx, 'explanation', e.target.value)} style={{...styles.input, width: '100%', marginBottom: '15px'}} />

              {/* Option Renderers based on type */}
              {(q.type === 'single' || q.type === 'multiple') && (
                <div style={{ paddingLeft: '20px', borderLeft: '2px solid var(--accent-color)' }}>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <input placeholder="Option Text" value={opt.text} onChange={e => updateManualOption(qIdx, oIdx, 'text', e.target.value)} style={{...styles.input, flex: 1, padding: '8px'}} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={opt.isCorrect} onChange={e => updateManualOption(qIdx, oIdx, 'isCorrect', e.target.checked)} /> Correct
                      </label>
                    </div>
                  ))}
                  <button type="button" onClick={() => addManualOption(qIdx)} style={{...styles.addBlockBtn, marginTop: '5px'}}>+ Add Option</button>
                </div>
              )}

              {q.type === 'fill' && (
                <input placeholder="Exact Correct Answer" value={q.correctAnswerText} onChange={e => updateManualQuestion(qIdx, 'correctAnswerText', e.target.value)} style={styles.input} />
              )}

              {q.type === 'match' && (
                <div style={{ paddingLeft: '20px', borderLeft: '2px solid var(--accent-color)' }}>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <input placeholder="Left Side" value={opt.matchLeft} onChange={e => updateManualOption(qIdx, oIdx, 'matchLeft', e.target.value)} style={{...styles.input, flex: 1, padding: '8px'}} />
                      <input placeholder="Right Side" value={opt.matchRight} onChange={e => updateManualOption(qIdx, oIdx, 'matchRight', e.target.value)} style={{...styles.input, flex: 1, padding: '8px'}} />
                    </div>
                  ))}
                  <button type="button" onClick={() => addManualOption(qIdx)} style={{...styles.addBlockBtn, marginTop: '5px'}}>+ Add Match Pair</button>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => handleAddManualQuestion('single')} style={styles.addBlockBtn}>+ Single Choice</button>
            <button type="button" onClick={() => handleAddManualQuestion('multiple')} style={styles.addBlockBtn}>+ Multiple Choice</button>
            <button type="button" onClick={() => handleAddManualQuestion('fill')} style={styles.addBlockBtn}>+ Fill Blank</button>
            <button type="button" onClick={() => handleAddManualQuestion('match')} style={styles.addBlockBtn}>+ Matching</button>
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '15px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '16px', marginTop: '10px' }}>
            <FaSave /> Deploy Instructor Quiz
          </button>
        </form>
      </div>

      <h3 style={{ color: 'var(--accent-color)', fontSize: '16px' }}>Active Quizzes</h3>
      <div className="glass-card" style={{ padding: '20px', overflowX: 'auto', borderRadius: '16px', marginBottom: '40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ padding: '15px' }}>Course ID Link</th>
              <th style={{ padding: '15px' }}>Questions</th>
              <th style={{ padding: '15px' }}>Time Limit</th>
              <th style={{ padding: '15px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingAssessments ? (
               <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}><FaSpinner className="fa-spin" color="var(--accent-color)" /></td></tr>
            ) : allQuizzes.map(q => (
              <tr key={q._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '15px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{q.lessonId}</td>
                <td style={{ padding: '15px' }}>{q.questions?.length || 0} Questions</td>
                <td style={{ padding: '15px' }}>
                  {editingQuizTimer === q._id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FaClock color="var(--accent-color)" />
                      <input style={{...styles.editInput, width: '80px'}} type="number" defaultValue={q.timeLimit || 0} id={`timer-${q._id}`} placeholder="Secs" />
                      <button onClick={() => handleSaveQuizTimer(q._id)} style={{ ...styles.actionBtnIcon, color: '#00b894' }}><FaSave /></button>
                      <button onClick={() => setEditingQuizTimer(null)} style={{ ...styles.actionBtnIcon, color: '#ff7675' }}><FaTimes /></button>
                    </div>
                  ) : (
                    <span><FaClock style={{ marginRight: '5px' }} /> {q.timeLimit ? `${q.timeLimit}s` : 'Auto'}</span>
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setEditingQuizTimer(q._id)} style={styles.actionBtnIcon} title="Set Custom Timer"><FaEdit /></button>
                    <button onClick={() => handleDeleteQuiz(q._id)} style={{ ...styles.actionBtnIcon, color: '#ff7675' }} title="Delete Quiz"><FaTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ color: 'var(--accent-color)', fontSize: '16px' }}>Student Gradebook</h3>
      <div className="glass-card" style={{ padding: '20px', overflowX: 'auto', borderRadius: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ padding: '15px' }}>Student</th>
              <th style={{ padding: '15px' }}>Course Completed</th>
              <th style={{ padding: '15px' }}>Completion Date</th>
            </tr>
          </thead>
          <tbody>
            {loadingAssessments ? (
               <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}><FaSpinner className="fa-spin" color="var(--accent-color)" /></td></tr>
            ) : gradebook.map((mission, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '15px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{mission.username}</td>
                <td style={{ padding: '15px' }}>{mission.moduleName} - {mission.lessonTitle}</td>
                <td style={{ padding: '15px' }}>{new Date(mission.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="animate-fade">
      <h2 style={{ color: 'var(--text-primary)' }}>Scholar Ledger</h2>
      <div className="glass-card" style={{ marginTop: '20px', overflowX: 'auto', borderRadius: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ padding: '15px' }}>Scholar Identity</th>
              <th style={{ padding: '15px' }}>Dept / Level</th>
              <th style={{ padding: '15px' }}>Academic XP</th>
              <th style={{ padding: '15px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingScholars ? (
               <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}><FaSpinner className="fa-spin" style={{ color: 'var(--accent-color)', fontSize: '24px' }} /></td></tr>
            ) : students.map(s => (
              <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', opacity: s.isBanned ? 0.5 : 1 }}>
                <td style={{ padding: '15px' }}>
                  <div style={{ fontWeight: 'bold', color: s.isBanned ? '#ff7675' : 'var(--text-primary)' }}>
                    {s.username} {s.isBanned && "(Restricted)"}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.6 }}>{s.email}</div>
                </td>
                <td style={{ padding: '15px' }}>
                  {editingStudent === s._id ? (
                    <input style={styles.editInput} defaultValue={s.major} id={`major-${s._id}`} />
                  ) : (
                    <span>{s.academicLevel} {s.major}</span>
                  )}
                </td>
                <td style={{ padding: '15px', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                  {editingStudent === s._id ? (
                    <input style={styles.editInput} type="number" defaultValue={s.xp} id={`xp-${s._id}`} />
                  ) : (
                    <span>{s.xp?.toLocaleString()} XP</span>
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {editingStudent === s._id ? (
                      <>
                        <button onClick={() => handleUpdateStudent(s.username, { 
                          major: document.getElementById(`major-${s._id}`).value,
                          xp: parseInt(document.getElementById(`xp-${s._id}`).value)
                        })} style={{ ...styles.actionBtnIcon, color: '#00b894' }}><FaSave /></button>
                        <button onClick={() => setEditingStudent(null)} style={{ ...styles.actionBtnIcon, color: '#ff7675' }}><FaTimes /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingStudent(s._id)} style={styles.actionBtnIcon} title="Edit Record"><FaEdit /></button>
                        <button onClick={() => onOpenChat(s)} style={styles.actionBtnIcon} title="Chat"><FaComments /></button>
                        <button onClick={() => handleToggleBan(s.username)} style={{ ...styles.actionBtnIcon, color: s.isBanned ? '#00b894' : '#ff7675' }} title={s.isBanned ? "Reactivate" : "Restrict"}>
                          {s.isBanned ? <FaCheck /> : <FaBan />}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderForum = () => (
    <div className="animate-fade">
      <h2 style={{ color: 'var(--text-primary)' }}>Security Center (Forum Control)</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Review and neutralize flagged community content.</p>
      
      {loadingPosts ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><FaSpinner className="fa-spin" size={30} color="var(--accent-color)" /></div>
      ) : posts.length > 0 ? (
        posts.map(p => (
          <div key={p._id} className="glass-card" style={{ padding: '20px', marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #ff7675' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '5px' }}>{p.username}</div>
              <h4 style={{ margin: '5px 0', color: 'var(--accent-color)' }}>{p.title}</h4>
              <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>"{p.content}"</p>
            </div>
            <button 
              onClick={() => handleNeutralizePost(p._id)}
              className="btn-primary" 
              style={{ background: '#ff7675', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Neutralize Post
            </button>
          </div>
        ))
      ) : (
        <p style={{ color: 'var(--text-secondary)' }}>No active forum posts.</p>
      )}
    </div>
  );

  return (
    <div className="admin-container">
      <style>{`
        .admin-container { display: flex; min-height: 100vh; background: var(--bg-body); }
        .admin-sidebar { width: 260px; background: rgba(0,0,0,0.15); border-right: 1px solid var(--card-border); padding: 25px; display: flex; flex-direction: column; }
        .admin-content { flex: 1; padding: 40px; overflow-y: auto; }
        .bottom-actions { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
        @media (max-width: 768px) {
          .admin-container { flex-direction: column; }
          .admin-sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--card-border); padding: 15px; }
          .admin-sidebar nav { flex-direction: row !important; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 15px; }
          .admin-sidebar nav button { width: auto !important; }
          .bottom-actions { flex-direction: row; justify-content: center; margin-top: 10px; }
          .admin-content { padding: 15px; }
        }
      `}</style>

      <div className="admin-sidebar">
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--accent-color)', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '900' }}>
            {isSuperAdmin ? <FaUserShield /> : <FaChalkboardTeacher />} VICI COMMAND
          </h2>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>{dashboardTitle}</p>
        </div>
        
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setActiveTab('courses')} style={activeTab === 'courses' ? styles.activeNav : styles.navBtn}><FaBook /> Curriculum</button>
          <button onClick={() => setActiveTab('assessments')} style={activeTab === 'assessments' ? styles.activeNav : styles.navBtn}><FaClipboardList /> Gradebook</button>
          <button onClick={() => setActiveTab('students')} style={activeTab === 'students' ? styles.activeNav : styles.navBtn}><FaUsers /> Scholars</button>
          {isSuperAdmin && (
            <button onClick={() => setActiveTab('forum')} style={activeTab === 'forum' ? styles.activeNav : styles.navBtn}><FaComments /> Forum Control</button>
          )}
        </nav>

        <div className="bottom-actions">
          {/* ✅ Added the Switch View Button here */}
          <button onClick={() => onNavigate('dashboard')} style={{ ...styles.actionBtn, background: 'var(--accent-color)', color: 'white', border: 'none' }}>
            <FaBook /> View Student Experience
          </button>
          <button onClick={toggleTheme} className="glass-card" style={styles.actionBtn}>
            {currentTheme === 'light' ? <FaMoon /> : <FaSun color="#f1c40f" />} Theme
          </button>
          <button onClick={onLogout} style={{ ...styles.actionBtn, background: '#ff7675', color: 'white', border: 'none' }}>
            <FaSignOutAlt /> Sign Out
          </button>
        </div>
      </div>

      <div className="admin-content">
        {activeTab === 'courses' && renderCourses()}
        {activeTab === 'assessments' && renderAssessments()}
        {activeTab === 'students' && renderStudents()}
        {activeTab === 'forum' && isSuperAdmin && renderForum()}
      </div>
    </div>
  );
};

const styles = {
  input: { padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none' },
  editInput: { padding: '5px 10px', borderRadius: '5px', border: '1px solid var(--accent-color)', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', width: '120px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 15px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', borderRadius: '10px', fontWeight: 'bold' },
  activeNav: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 15px', background: 'var(--accent-color)', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 'bold' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  actionBtnIcon: { background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' },
  deleteBtn: { background: 'transparent', border: '1px solid #ff7675', padding: '8px', borderRadius: '8px', color: '#ff7675', cursor: 'pointer' },
  aiBtn: { background: 'var(--accent-color)', border: 'none', color: 'white', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' },
  addBlockBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }
};

export default AdminDashboard;