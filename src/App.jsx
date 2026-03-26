import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword'; 
import ResetPassword from './pages/ResetPassword';     
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Forum from './pages/Forum';
import Stats from './pages/Stats';
import CourseCatalog from './pages/CourseCatalog';
import LessonView from './pages/LessonView';
import StudyDashboard from './pages/StudyDashboard'; 
import Credits from './pages/Credits'; 
import FindFriends from './pages/FindFriends'; 
// ✅ IMPORT LORE BOOK
import LoreBook from './pages/LoreBook'; 
import ChatBox from './components/ChatBox'; 
import Banned from './pages/Banned'; 
import Toast from './components/Toast'; 
import axios from 'axios';
import confetti from 'canvas-confetti';

// --- 🛡️ PROTECTED ROUTE ---
const ProtectedRoute = ({ user, isBanned, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (isBanned) return <Navigate to="/banned" replace />; 
  return children;
};

// --- ✨ LEVEL UP MODAL COMPONENT ---
const LevelUpModal = ({ level, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div className="glass-card" style={{ maxWidth: '450px', width: '100%', padding: '40px', textAlign: 'center', border: '2px solid var(--accent-color)', animation: 'scaleIn 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67)' }}>
      <div style={{ fontSize: '80px', marginBottom: '20px' }}>✨</div>
      <h1 style={{ color: 'var(--text-primary)', fontSize: '32px', margin: '0 0 10px 0' }}>RANK INCREASED!</h1>
      <p style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '20px', marginBottom: '30px' }}>You are now Level {level}</p>
      
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px', marginBottom: '30px', textAlign: 'left' }}>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontSize: '14px' }}>UNLOCKED REWARDS:</h4>
        <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingLeft: '20px', margin: 0 }}>
          <li>New Rank: Advanced Scholar</li>
          <li>Exclusive Profile Badge: Level {level} Veteran</li>
          <li>Increased Daily XP Cap (+200)</li>
        </ul>
      </div>

      <button onClick={onClose} className="btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontWeight: 'bold' }}>
        CONTINUE ADVENTURE
      </button>
    </div>
  </div>
);

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => localStorage.getItem('currentUser'));
  const [currentId, setCurrentId] = useState(() => localStorage.getItem('userId')); 
  const [role, setRole] = useState(() => localStorage.getItem('currentRole')?.toLowerCase() || 'scholar'); 
  const [isBanned, setIsBanned] = useState(() => localStorage.getItem('isBanned') === 'true');
  const [avatar, setAvatar] = useState(() => localStorage.getItem('userAvatar') || "👨‍💻");
  const [activeChatFriend, setActiveChatFriend] = useState(null); 
  const [theme, setTheme] = useState(() => localStorage.getItem('appTheme') || 'light');
  const [activeLesson, setActiveLesson] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toastConfig, setToastConfig] = useState(null);
  
  const [showLevelUp, setShowLevelUp] = useState(null);

  const showToast = (message, type = 'success', xpAmount = null) => {
    setToastConfig({ message, type, xpAmount });
  };

  // --- 🕵️‍♂️ EASTER EGG: CONSOLE LORE WINK ---
  useEffect(() => {
    console.log(
      "%c🔱 TRIDENTQUEST SECRETS\n\n%cGreetings, Explorer. You seek the code beneath the reality. The Guardians obscure the truth, but the logic is pure. \n\nUse this knowledge wisely.", 
      "color: #2ecc71; font-size: 20px; font-weight: bold;", 
      "color: #a29bfe; font-size: 14px; font-style: italic;"
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    const checkInactivity = () => {
      const lastAction = localStorage.getItem('lastActionTime');
      const now = Date.now();
      const limit = 30 * 60 * 1000; 
      if (lastAction && (now - lastAction > limit)) {
        handleLogout();
        showToast("Session expired. Please log in again.", "error");
      }
    };
    const updateActivity = () => localStorage.setItem('lastActionTime', Date.now());
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity); 
    window.addEventListener('scroll', updateActivity); 
    window.addEventListener('click', updateActivity); 
    const interval = setInterval(checkInactivity, 60000); 
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity); 
      window.removeEventListener('scroll', updateActivity); 
      window.removeEventListener('click', updateActivity); 
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleLogin = (usernameFromDB, userRoleFromDB, userId, userIsBanned = false) => {
    const safeUsername = String(usernameFromDB).trim(); 
    const normalizedRole = userRoleFromDB ? String(userRoleFromDB).toLowerCase() : 'scholar';
    setUser(safeUsername);
    setCurrentId(userId); 
    setRole(normalizedRole);
    setIsBanned(userIsBanned); 
    localStorage.setItem('currentUser', safeUsername);
    localStorage.setItem('userId', userId);
    localStorage.setItem('currentRole', normalizedRole);
    localStorage.setItem('isBanned', userIsBanned); 
    localStorage.setItem('lastActionTime', Date.now()); 
    
    if (userIsBanned) { 
      navigate('/banned'); 
    } else { 
      showToast(`Welcome back, ${safeUsername}!`, "success"); 
      // ✅ ROUTE BASED ON ROLE
      if (normalizedRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard'); 
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentId(null);
    localStorage.clear();
    navigate('/login');
  };

  const handleLessonComplete = async (earnedXP, quizStats) => {
    if (!activeLesson) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://elearning-api-dr6r.onrender.com';
      
      const userRes = await axios.get(`${apiUrl}/api/users/${encodeURIComponent(user)}`);
      const oldLevel = userRes.data.level || 1;

      const res = await axios.put(`${apiUrl}/api/users/${user}/progress`, {
        xpEarned: earnedXP,
        courseId: activeLesson._id,
        courseTitle: activeLesson.title,
        stats: quizStats
      });

      const newLevel = res.data.level;
      setRefreshTrigger(prev => prev + 1);

      if (newLevel > oldLevel) {
        setShowLevelUp(newLevel); 
        confetti({
          particleCount: 300,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#6c5ce7', '#ffd700', '#00b894']
        });
      } else {
        showToast("Guardian Defeated!", "reward", earnedXP);
      }

      navigate('/dashboard');
    } catch (err) { 
      showToast("Cloud sync failed.", "error"); 
    }
  };

  return (
    <>
      {showLevelUp && <LevelUpModal level={showLevelUp} onClose={() => setShowLevelUp(null)} />}

      {toastConfig && (
        <Toast 
          message={toastConfig.message} 
          type={toastConfig.type} 
          xpAmount={toastConfig.xpAmount} 
          onClose={() => setToastConfig(null)} 
        />
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login onLogin={handleLogin} onNavigate={(v) => navigate(`/${v}`)} />} />
        <Route path="/register" element={<Register onSignUp={(n, id, r, b) => handleLogin(n, r, id, b)} onNavigate={(v) => navigate(`/${v}`)} />} />
        <Route path="/banned" element={<Banned />} />
        <Route path="/forgot-password" element={<ForgotPassword onNavigate={(v) => navigate(`/${v}`)} />} />
        <Route path="/reset-password/:resetToken" element={<ResetPassword onNavigate={(v) => navigate(`/${v}`)} />} />

        {/* ✅ ADMIN ONLY ROUTE */}
        <Route path="/admin" element={
          <ProtectedRoute user={user} isBanned={isBanned}>
            {role === 'admin' ? (
              <AdminDashboard 
                onLogout={handleLogout} 
                onOpenChat={(f) => setActiveChatFriend(f)} 
                onNavigate={(v) => navigate(`/${v}`)} // Allows admin to navigate to /dashboard
              />
            ) : (
              <Navigate to="/dashboard" replace /> 
            )}
          </ProtectedRoute>
        } />

        {/* ✅ STUDENT DASHBOARD (Admins can also view this) */}
        <Route path="/dashboard" element={
          <ProtectedRoute user={user} isBanned={isBanned}>
            <Dashboard 
              username={user} avatar={avatar} refreshTrigger={refreshTrigger}
              onLogout={handleLogout} onNavigate={(v) => navigate(`/${v}`)} 
              toggleTheme={toggleTheme} currentTheme={theme} 
              onStartLesson={(l) => { setActiveLesson(l); navigate('/lesson'); }} 
              onOpenChat={(f) => setActiveChatFriend(f)} 
              userRole={role} // Passed so dashboard knows if an admin is visiting
            />
          </ProtectedRoute>
        } />

        <Route path="/study-vault" element={
          <ProtectedRoute user={user} isBanned={isBanned}>
            <StudyDashboard 
              userId={currentId} 
              onNavigate={(v) => navigate(`/${v}`)} 
              showToast={showToast}
            />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={<ProtectedRoute user={user} isBanned={isBanned}><Profile onNavigate={(v) => navigate(`/${v}`)} onUpdateProfile={(newName, newAvatar) => { setUser(newName); setAvatar(newAvatar); }} showToast={showToast} /></ProtectedRoute>} />
        <Route path="/forum" element={<ProtectedRoute user={user} isBanned={isBanned}><Forum username={user} avatar={avatar} onNavigate={(v) => navigate(`/${v}`)} /></ProtectedRoute>} />
        <Route path="/course-catalog" element={<ProtectedRoute user={user} isBanned={isBanned}><CourseCatalog username={user} onNavigate={(v) => navigate(`/${v}`)} /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute user={user} isBanned={isBanned}><Stats username={user} onNavigate={(v) => navigate(`/${v}`)} refreshTrigger={refreshTrigger} /></ProtectedRoute>} />
        
        <Route path="/lesson" element={<ProtectedRoute user={user} isBanned={isBanned}><LessonView lesson={activeLesson} username={user} onComplete={handleLessonComplete} onExit={() => navigate('/dashboard')} /></ProtectedRoute>} />
        
        <Route path="/codex" element={<ProtectedRoute user={user} isBanned={isBanned}><LoreBook username={user} onNavigate={(v) => navigate(`/${v}`)} /></ProtectedRoute>} />

        <Route path="/credits" element={<ProtectedRoute user={user} isBanned={isBanned}><Credits onNavigate={(v) => navigate(`/${v}`)} /></ProtectedRoute>} />
        <Route path="/find-friends" element={<ProtectedRoute user={user} isBanned={isBanned}><FindFriends username={user} onNavigate={(v) => navigate(`/${v}`)} showToast={showToast} /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      {activeChatFriend && currentId && !isBanned && <ChatBox currentUserId={currentId} friend={activeChatFriend} onClose={() => setActiveChatFriend(null)} />}
    </>
  );
}

export default App;