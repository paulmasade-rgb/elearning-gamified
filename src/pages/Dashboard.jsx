import React, { useState, useEffect, useRef } from 'react';
import XPBar from '../components/XPBar';
import BadgeCard from '../components/BadgeCard';
import CourseCard from '../components/CourseCard';
// import ActivityFeed from '../components/ActivityFeed'; // 🔴 DISABLED
import SocialInbox from '../components/SocialInbox'; 
import { 
  FaBookOpen, FaPlus, FaChartLine, FaBars, FaCommentDots, 
  FaUser, FaUsers, FaSignOutAlt, FaTimes, FaMoon, FaSun, FaShieldAlt,
  FaBrain 
} from 'react-icons/fa';
import axios from 'axios';
import confetti from 'canvas-confetti'; 

// ✅ Added userRole to props
const Dashboard = ({ username, avatar, onNavigate, refreshTrigger, onLogout, toggleTheme, currentTheme, onStartLesson, onOpenChat, userRole }) => {
  const [xp, setXP] = useState(0); 
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]); 
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ streak: 0, accuracy: 0 });
  const [userData, setUserData] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- ✅ EASTER EGG STATES ---
  const [logoClicks, setLogoClicks] = useState(0);
  const [showLoreSecret, setShowLoreSecret] = useState(false);
  const clickTimeout = useRef(null);

  // ✅ NEW: Konami Code State
  const [konamiUnlocked, setKonamiUnlocked] = useState(false);

  // ✅ NEW: Midnight Guardian Check (12:00 AM - 2:59 AM)
  const currentHour = new Date().getHours();
  const isMidnight = currentHour >= 0 && currentHour < 3;

  // --- ✅ EASTER EGG LOGIC (Logo Clicks) ---
  const handleSecretLogoClick = () => {
    setLogoClicks((prev) => {
      const newCount = prev + 1;
      if (newCount === 7) {
        setShowLoreSecret(true);
        confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.4 },
          colors: ['#000000', '#2ecc71', '#ffffff'] 
        });
        return 0; 
      }
      return newCount;
    });

    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      setLogoClicks(0);
    }, 1500);
  };

  // --- ✅ NEW: KONAMI CODE LISTENER ---
  useEffect(() => {
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    const handleKeyDown = (e) => {
      const key = e.key === 'B' ? 'b' : e.key === 'A' ? 'a' : e.key; 
      
      if (key === konamiSequence[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiSequence.length) {
          setKonamiUnlocked(true);
          confetti({ particleCount: 150, spread: 80, colors: ['#ff0000', '#00ff00', '#0000ff'] }); 
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0; 
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchUserData = async (isRefresh = false) => {
    if (!isRefresh && xp === 0) setLoading(true);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const encodedName = encodeURIComponent(username);

      const [userRes, statsRes, coursesRes, feedRes] = await Promise.all([
        axios.get(`${apiUrl}/api/users/${encodedName}`),
        axios.get(`${apiUrl}/api/users/${encodedName}/stats`),
        axios.get(`${apiUrl}/api/courses`),
        axios.get(`${apiUrl}/api/users/activities`)
      ]);

      setUserData(userRes.data);
      setXP(userRes.data.xp || 0);
      setLevel(userRes.data.level || 1);
      setStats(statsRes.data);
      
      const sortedFeed = (feedRes.data || []).sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt);
        const timeB = new Date(b.timestamp || b.createdAt);
        return timeB - timeA;
      });
      setActivities(sortedFeed);
      
      const enrolled = coursesRes.data
        .filter(c => userRes.data.enrolledCourses?.includes(String(c._id)))
        .map(c => ({ 
          ...c, 
          completed: userRes.data.completedCourses?.includes(String(c._id)) 
        }));
      setCourses(enrolled);
    } catch (err) { 
      console.error("Data sync failed:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchUserData(refreshTrigger > 0); 
  }, [username, refreshTrigger]);

  if (loading && xp === 0) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)', color: 'var(--text-primary)' }}>
      Synchronizing Academic Core...
    </div>
  );

  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '15px', background: 'var(--bg-body)' }}>
      <style>{`
        .dashboard-grid { 
          display: grid; 
          grid-template-columns: 320px 1fr 340px; 
          gap: 25px; 
          max-width: 1600px; 
          width: 100%; 
          margin: 0 auto; 
          align-items: start; 
        }
        .action-card {
          margin-top: 15px; border: 2.5px solid var(--accent-color); padding: 25px 20px; 
          border-radius: 24px; color: var(--text-primary); cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 15px;
          font-weight: 900; text-transform: uppercase; transition: 0.3s;
          background: rgba(108, 92, 231, 0.04); font-size: 14px;
        }
        .action-card:hover { background: rgba(108, 92, 231, 0.1); transform: translateY(-4px); }
        .study-vault-card { border-color: #2ecc71; color: #2ecc71; background: rgba(46, 204, 113, 0.05); }
        .study-vault-card:hover { background: rgba(46, 204, 113, 0.1); border-color: #27ae60; }
        .vici-menu-item { display: flex; align-items: center; gap: 15px; width: 100%; padding: 15px 40px; background: transparent; border: none; color: var(--text-primary); font-size: 16px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .vici-menu-item:hover { background: rgba(255,255,255,0.05); color: var(--accent-color); padding-left: 45px; }
        .messenger-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); border-radius: 15px; margin-bottom: 10px; cursor: pointer; transition: 0.2s; }
        .messenger-item:hover { border-color: var(--accent-color); background: rgba(108, 92, 231, 0.1); }
        @media (max-width: 1300px) { .dashboard-grid { grid-template-columns: 1fr 320px; } .achievements-col { display: none; } }
        @media (max-width: 800px) { .dashboard-grid { grid-template-columns: 1fr; } .social-col { order: 3; } }
        
        .hidden-scroll::-webkit-scrollbar { display: none; }
        .hidden-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        /* ✅ Retro Styling for Konami Trigger */
        .retro-avatar {
          image-rendering: pixelated;
          border: 3px dashed #f1c40f !important;
          box-shadow: 0 0 20px rgba(241, 196, 15, 0.5);
          background: #000 !important;
        }
        .retro-text {
          font-family: 'Courier New', Courier, monospace !important;
          color: #f1c40f !important;
          text-shadow: 2px 2px 0px #ff4757;
        }
      `}</style>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', maxWidth: '1600px', margin: '0 auto 25px auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          {/* ✅ AVATAR UPDATES ON KONAMI */}
          <div className={`glass-card ${konamiUnlocked ? 'retro-avatar' : ''}`} onClick={() => onNavigate('profile')} style={{ cursor: 'pointer', width: '55px', height: '55px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', transition: 'all 0.3s' }}>
            {konamiUnlocked ? "👾" : avatar}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h1 
                onClick={handleSecretLogoClick}
                style={{ 
                  margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: '900',
                  cursor: 'pointer', userSelect: 'none', transition: 'transform 0.1s', display: 'inline-block',
                  transform: logoClicks > 0 ? `scale(${1 + (logoClicks * 0.05)})` : 'scale(1)',
                  transformOrigin: 'left center'
                }}
                className={konamiUnlocked ? 'retro-text' : ''}
              >
                {username}
              </h1>

              {/* ✅ Added the Return to Admin Button here */}
              {userRole === 'admin' && (
                <button onClick={() => onNavigate('admin')} style={{ background: '#d63031', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', border: 'none', marginLeft: '15px', fontSize: '11px', textTransform: 'uppercase' }}>
                  Return to Admin Panel
                </button>
              )}
            </div>
            
            {/* ✅ MIDNIGHT GUARDIAN LOGIC APPLIED HERE */}
            <p style={{ margin: 0, fontSize: '12px', color: isMidnight ? '#a29bfe' : 'var(--accent-color)', fontWeight: '800', transition: 'color 0.5s', marginTop: '4px' }}>
              {konamiUnlocked ? "Legacy Player" : isMidnight ? "Midnight Guardian 🦉" : "Independent Scholar"}
            </p>
          </div>
        </div>
        <button onClick={() => setIsMenuOpen(true)} className="glass-card" style={{ padding: '12px', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '12px' }}><FaBars size={22} /></button>
      </header>

      <div className="glass-card" style={{ padding: '25px', marginBottom: '30px', maxWidth: '1600px', margin: '0 auto 30px auto' }}>
        <XPBar currentXP={xp} level={level} />
        <div style={{ textAlign: 'right', marginTop: '12px' }}>
          <button onClick={() => onNavigate('stats')} style={{ background: 'transparent', border: '1.5px solid var(--accent-color)', color: 'var(--accent-color)', padding: '7px 18px', borderRadius: '25px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>OPEN PERFORMANCE ANALYTICS</button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="achievements-col">
          <div className="glass-card" style={{ padding: '20px', marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '12px', color: 'var(--accent-color)', textTransform: 'uppercase', fontWeight: '900' }}>Academic Record</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-primary)' }}><span>Streak</span><b>🔥 {stats.streak} Days</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-primary)', marginTop: '12px' }}><span>Accuracy</span><b>🎯 {stats.accuracy}%</b></div>
          </div>
          
          {/* 🔴 DISABLED: AI Study Vault Button
          <div className="action-card study-vault-card" onClick={() => onNavigate('study-vault')}>
            <FaBrain size={20} /> 
            <span>AI Study Vault</span>
          </div>
          */}

          <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginTop: '25px', marginBottom: '15px', fontWeight: '900' }}>Milestone Badges</h3>
          {userData?.badges?.map((b, i) => <BadgeCard key={i} name={b} isUnlocked={true} />)}
        </div>

        <div className="center-col">
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '900' }}>
              <FaBookOpen color="var(--accent-color)" /> Active Curriculum
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {courses.map(c => <CourseCard key={c._id} {...c} isCompleted={c.completed} onClick={() => onStartLesson(c)} />)}
            <div className="action-card" style={{ borderStyle: 'dashed' }} onClick={() => onNavigate('course-catalog')}>
              <FaPlus /> Enroll in New Module
            </div>
          </div>
        </div>

        <div className="social-col">
           <div className="glass-card" style={{ padding: '20px', marginBottom: '25px', border: '1.5px solid var(--accent-color)' }}>
             <h4 style={{ margin: '0 0 15px 0', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '900' }}><FaCommentDots /> Messenger</h4>
             
             <div onClick={() => onOpenChat({ username: 'Admin', role: 'admin', _id: '65d000000000000000000001' })} className="messenger-item" style={{ border: '1.5px solid #f1c40f' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaShieldAlt color="#f1c40f" size={20}/>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '800' }}>Academic Support</span>
                </div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f1c40f' }}></div>
             </div>

             {userData?.friends?.map(f => (
               <div key={f._id} onClick={() => onOpenChat(f)} className="messenger-item">
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <span style={{ fontSize: '20px' }}>👨‍💻</span>
                   <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '800' }}>{f.username}</span>
                 </div>
                 <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 10px #2ecc71' }}></div>
               </div>
             ))}
           </div>
           
           {/* 🔴 DISABLED: Activity Feed
           <ActivityFeed activities={activities} />
           */}
        </div>
      </div>

      <div onClick={() => setIsMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9998, opacity: isMenuOpen ? 1 : 0, pointerEvents: isMenuOpen ? 'all' : 'none', transition: '0.4s' }} />
      <div style={{ position: 'fixed', top: 0, right: isMenuOpen ? '0' : '-100%', width: '340px', height: '100%', zIndex: 9999, transition: '0.4s cubic-bezier(0.16, 1, 0.3, 1)', background: 'var(--bg-body)', borderLeft: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '25px', display: 'flex', justifyContent: 'flex-end' }}><button onClick={() => setIsMenuOpen(false)} style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-primary)', width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer' }}><FaTimes size={20} /></button></div>
        <div style={{ padding: '0 40px 40px 40px', textAlign: 'center', borderBottom: '1px solid var(--card-border)' }}><div style={{ fontSize: '70px', marginBottom: '20px' }}>{konamiUnlocked ? "👾" : avatar}</div><h2 style={{ color: 'var(--text-primary)', margin: 0, fontWeight: '900' }}>{username}</h2></div>
        
        <div className="hidden-scroll" style={{ padding: '30px 0', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
          <button onClick={() => { onNavigate('profile'); setIsMenuOpen(false); }} className="vici-menu-item"><FaUser opacity={0.6} /> Profile Settings</button>
          
          {/* 🔴 DISABLED: Side Menu Vault Link
          <button onClick={() => { onNavigate('study-vault'); setIsMenuOpen(false); }} className="vici-menu-item" style={{ color: '#2ecc71' }}>
            <FaBrain opacity={0.8} /> Personal Study Vault
          </button>
          */}

          <button onClick={() => { onNavigate('course-catalog'); setIsMenuOpen(false); }} className="vici-menu-item"><FaBookOpen opacity={0.6} /> Course Catalog</button>
          <button onClick={() => { onNavigate('forum'); setIsMenuOpen(false); }} className="vici-menu-item"><FaUsers opacity={0.6} /> Community</button>
          
          <button onClick={() => { onNavigate('credits'); setIsMenuOpen(false); }} className="vici-menu-item">⭐ Credits</button>

          <button onClick={toggleTheme} className="vici-menu-item">{currentTheme === 'light' ? <FaMoon opacity={0.6} /> : <FaSun opacity={0.6} />} {currentTheme === 'light' ? "Dark Mode" : "Light Mode"}</button>
          
          <button onClick={onLogout} className="vici-menu-item" style={{ marginTop: 'auto', borderTop: '1px solid var(--card-border)', color: '#ff4757', padding: '25px 40px', flexShrink: 0 }}><FaSignOutAlt /> Sign Out</button>
        </div>
      </div>

      {/* --- ✅ EASTER EGG: LORE FRAGMENT MODAL --- */}
      {showLoreSecret && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', 
          backdropFilter: 'blur(15px)', zIndex: 99999, display: 'flex', 
          alignItems: 'center', justifyContent: 'center', padding: '20px',
          animation: 'fadeIn 0.5s ease'
        }}>
          <div className="glass-card" style={{ 
            maxWidth: '500px', width: '100%', padding: '40px', 
            textAlign: 'center', border: '2px solid #2ecc71', 
            background: 'rgba(0, 200, 100, 0.05)',
            boxShadow: '0 0 40px rgba(46, 204, 113, 0.2)'
          }}>
            <FaBookOpen size={60} color="#2ecc71" style={{ marginBottom: '20px' }} />
            
            <h2 style={{ color: '#2ecc71', textTransform: 'uppercase', letterSpacing: '4px', fontSize: '14px', marginBottom: '10px' }}>
              Secret Discovered
            </h2>
            <h1 style={{ color: '#fff', fontSize: '28px', margin: '0 0 20px 0' }}>
              Fragment 01: The Void
            </h1>
            
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', lineHeight: '1.8', fontStyle: 'italic', marginBottom: '30px' }}>
              "Before the Archives were built, there was only noise. The Guardians were not born to restrict knowledge, but to protect it from those who would use it without wisdom. You have found the first thread. Keep pulling."
            </p>

            <button 
              onClick={() => setShowLoreSecret(false)}
              style={{ 
                background: 'transparent', border: '1px solid #2ecc71', color: '#2ecc71', 
                padding: '12px 30px', borderRadius: '12px', fontWeight: 'bold', 
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto' 
              }}
            >
               Close Archive <FaTimes />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;