import { useState, useEffect, useCallback } from "react";
import {
  saveMember, getAllMembers, onMembersChange,
  saveMemberLogs, getMemberLogs
} from "./firebase.js";

const GOAL = 150;
const ADMIN_CODE = "lista2026";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const MILESTONES = [
  { at: 25, label: "spark", icon: "🔥" },
  { at: 50, label: "momentum", icon: "🌊" },
  { at: 75, label: "power", icon: "⚡" },
  { at: 100, label: "unstoppable", icon: "🌴" },
  { at: 125, label: "transcend", icon: "🦋" },
  { at: 150, label: "crowned", icon: "👑" },
];

const AVATARS = [
  "🌴", "🌸", "🦋", "🌻", "🌊", "🔥", "✨", "🌙",
  "🪷", "🌿", "💫", "🫧", "🪻", "🍃", "☀️", "🧿"
];

const QUOTES = [
  { text: "she remembered who she was and the game changed.", author: "lalah delia" },
  { text: "you were born to be real, not to be perfect.", author: "ralph marston" },
  { text: "the body achieves what the mind believes.", author: "unknown" },
  { text: "don't limit your challenges. challenge your limits.", author: "unknown" },
  { text: "your only limit is you.", author: "unknown" },
  { text: "run when you can, walk if you have to, crawl if you must; just never give up.", author: "dean karnazes" },
  { text: "the miracle isn't that i finished. the miracle is that i had the courage to start.", author: "john bingham" },
];

const font = "'Cormorant Garamond', Georgia, serif";
const sans = "'DM Sans', system-ui, sans-serif";
const c = {
  bg: "#F7F4F0", card: "#FFFFFF", sand: "#E8E2D9", warm: "#D4C5B5",
  text: "#2C2825", sub: "#8A817A", accent: "#8B6F4E", highlight: "#C4956A",
  green: "#7A9B76", soft: "#EDE8E2", red: "#C4736A",
};

export default function App() {
  const [tab, setTab] = useState("home");
  const [currentUser, setCurrentUser] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [input, setInput] = useState("");
  const [stravaLink, setStravaLink] = useState("");
  const [logged, setLogged] = useState(false);
  const [ready, setReady] = useState(false);
  const [onboardName, setOnboardName] = useState("");
  const [onboardAvatar, setOnboardAvatar] = useState("🌴");
  const [logHistory, setLogHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [expandedMember, setExpandedMember] = useState(null);
  const [memberLogs, setMemberLogs] = useState({});

  const dailyQuote = QUOTES[new Date().getDay() % QUOTES.length];

  // ---- Init: load user from localStorage, members from Firebase ----
  useEffect(() => {
    async function init() {
      // Local user
      const saved = localStorage.getItem("lista-mmm-user");
      if (saved) {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        // Load personal logs
        const logs = await getMemberLogs(user.id);
        setLogHistory(logs);
      }
      // Admin status
      if (localStorage.getItem("lista-mmm-admin") === "true") setIsAdmin(true);
      // All members (initial load)
      const members = await getAllMembers();
      setAllMembers(members);
      setLoading(false);
      setTimeout(() => setReady(true), 100);
    }
    init();
  }, []);

  // ---- Real-time leaderboard listener ----
  useEffect(() => {
    const unsubscribe = onMembersChange((members) => {
      setAllMembers(members);
    });
    return () => unsubscribe();
  }, []);

  // ---- Join ----
  const handleJoin = useCallback(async () => {
    if (!onboardName.trim()) return;
    const newUser = {
      id: generateId(),
      name: onboardName.trim().toLowerCase(),
      avatar: onboardAvatar,
      miles: 0,
      streak: 0,
      verifiedRuns: 0,
      lastLogDate: null,
      joinedAt: new Date().toISOString(),
      weeklyMiles: {},
    };
    setCurrentUser(newUser);
    localStorage.setItem("lista-mmm-user", JSON.stringify(newUser));
    await saveMember(newUser);
  }, [onboardName, onboardAvatar]);

  // ---- Log miles ----
  const handleLog = useCallback(async () => {
    const val = parseFloat(input);
    if (isNaN(val) || val <= 0 || val > 50 || !currentUser) return;

    const today = new Date().toISOString().slice(0, 10);
    const weekNum = Math.ceil(
      (new Date() - new Date("2026-06-01")) / (1000 * 60 * 60 * 24 * 7)
    );
    const weekKey = `w${Math.max(1, weekNum)}`;

    const isConsecutive =
      currentUser.lastLogDate &&
      (today === currentUser.lastLogDate ||
        new Date(today) - new Date(currentUser.lastLogDate) <= 86400000);

    const hasStrava = !!stravaLink.trim();

    const updated = {
      ...currentUser,
      miles: Math.round((currentUser.miles + val) * 10) / 10,
      streak: isConsecutive ? currentUser.streak + 1 : 1,
      lastLogDate: today,
      verifiedRuns: (currentUser.verifiedRuns || 0) + (hasStrava ? 1 : 0),
      weeklyMiles: {
        ...currentUser.weeklyMiles,
        [weekKey]: Math.round(((currentUser.weeklyMiles?.[weekKey] || 0) + val) * 10) / 10,
      },
    };

    const newEntry = {
      date: today,
      miles: val,
      timestamp: Date.now(),
      strava: hasStrava ? stravaLink.trim() : null,
    };
    const newHistory = [...logHistory, newEntry];

    setCurrentUser(updated);
    setLogHistory(newHistory);
    localStorage.setItem("lista-mmm-user", JSON.stringify(updated));

    await saveMember(updated);
    await saveMemberLogs(updated.id, newHistory);

    setInput("");
    setStravaLink("");
    setLogged(true);
    setTimeout(() => setLogged(false), 2200);
  }, [input, stravaLink, currentUser, logHistory]);

  // ---- Admin ----
  const handleAdminLogin = useCallback(() => {
    if (adminCode.trim().toLowerCase() === ADMIN_CODE) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminCode("");
      localStorage.setItem("lista-mmm-admin", "true");
    }
  }, [adminCode]);

  const handleAdminLogout = useCallback(() => {
    setIsAdmin(false);
    if (tab === "admin") setTab("home");
    localStorage.removeItem("lista-mmm-admin");
  }, [tab]);

  const loadMemberLogs = useCallback(async (memberId) => {
    if (expandedMember === memberId) {
      setExpandedMember(null);
      return;
    }
    if (!memberLogs[memberId]) {
      const logs = await getMemberLogs(memberId);
      setMemberLogs((prev) => ({ ...prev, [memberId]: logs }));
    }
    setExpandedMember(memberId);
  }, [memberLogs, expandedMember]);

  // ---- Derived state ----
  const progress = currentUser ? Math.min((currentUser.miles / GOAL) * 100, 100) : 0;
  const nextMilestone = currentUser ? MILESTONES.find((m) => currentUser.miles < m.at) : MILESTONES[0];
  const lastMilestone = currentUser ? [...MILESTONES].reverse().find((m) => currentUser.miles >= m.at) : null;
  const milesLeft = currentUser ? Math.max(0, GOAL - currentUser.miles) : GOAL;
  const sorted = [...allMembers].sort((a, b) => b.miles - a.miles);
  const userRank = currentUser ? sorted.findIndex((m) => m.id === currentUser.id) + 1 : 0;

  const weeklyEntries = currentUser
    ? Object.entries(currentUser.weeklyMiles || {})
        .map(([k, v]) => ({ week: parseInt(k.replace("w", "")), miles: v }))
        .sort((a, b) => a.week - b.week)
    : [];
  const maxWeek = weeklyEntries.length > 0 ? Math.max(...weeklyEntries.map((w) => w.miles)) : 1;
  const recentLogs = logHistory.slice(-5).reverse();

  // ---- Loading screen ----
  if (loading) {
    return (
      <div style={{ fontFamily: sans, background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: font, fontSize: 28, fontStyle: "italic", fontWeight: 300, color: c.text }}>mind.movement.miles</div>
          <div style={{ fontSize: 12, color: c.sub, marginTop: 8 }}>loading...</div>
        </div>
      </div>
    );
  }

  // ---- Onboarding ----
  if (!currentUser) {
    return (
      <div style={{ fontFamily: sans, background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 380, width: "100%", animation: "fadeUp 0.6s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: c.sub, textTransform: "uppercase", fontWeight: 500 }}>lista run club</div>
            <div style={{ fontFamily: font, fontSize: 36, fontWeight: 300, fontStyle: "italic", color: c.text, marginTop: 8, lineHeight: 1.1 }}>
              mind.movement<br />.miles
            </div>
            <div style={{ fontSize: 12, color: c.sub, marginTop: 12 }}>150 miles · 10 weeks · one community</div>
            <div style={{ fontSize: 11, color: c.warm, marginTop: 6 }}>june 1 — august 4, 2026</div>
          </div>

          <div style={{ background: c.card, borderRadius: 20, padding: "32px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: c.sub, textTransform: "uppercase", marginBottom: 16 }}>choose your avatar</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24, justifyContent: "center" }}>
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setOnboardAvatar(a)}
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    border: onboardAvatar === a ? `2px solid ${c.accent}` : `1px solid ${c.sand}`,
                    background: onboardAvatar === a ? c.soft : "transparent",
                    fontSize: 20, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                >{a}</button>
              ))}
            </div>

            <div style={{ fontSize: 10, letterSpacing: 2, color: c.sub, textTransform: "uppercase", marginBottom: 10 }}>your first name</div>
            <input type="text" placeholder="enter your name" value={onboardName}
              onChange={(e) => setOnboardName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${c.sand}`,
                background: c.bg, fontFamily: sans, fontSize: 16, color: c.text, marginBottom: 24,
                boxSizing: "border-box",
              }}
            />

            <button onClick={handleJoin} disabled={!onboardName.trim()}
              style={{
                width: "100%", padding: 16, borderRadius: 14, border: "none",
                background: onboardName.trim() ? `linear-gradient(135deg, ${c.highlight}, ${c.accent})` : c.sand,
                color: onboardName.trim() ? "#fff" : c.sub,
                fontFamily: sans, fontSize: 14, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase",
                cursor: onboardName.trim() ? "pointer" : "default", transition: "all 0.3s ease",
              }}
            >join the challenge</button>
          </div>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: c.sub, fontStyle: "italic" }}>
            movement · energy · power
          </div>
        </div>
      </div>
    );
  }

  // ---- Main App ----
  return (
    <div style={{ fontFamily: sans, background: c.bg, minHeight: "100vh", color: c.text, maxWidth: 430, margin: "0 auto", position: "relative" }}>

      {/* header */}
      <div style={{
        padding: "32px 24px 20px", opacity: ready ? 1 : 0,
        transform: ready ? "translateY(0)" : "translateY(-10px)", transition: "all 0.6s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: c.sub, textTransform: "uppercase", fontWeight: 500 }}>lista run club</div>
            <h1 style={{ fontFamily: font, fontSize: 32, fontWeight: 300, fontStyle: "italic", marginTop: 4, color: c.text, lineHeight: 1.1 }}>
              mind.movement.miles
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{currentUser.avatar}</span>
            <span style={{ fontSize: 13, color: c.accent, fontWeight: 500 }}>{currentUser.name}</span>
          </div>
        </div>
        <div style={{ marginTop: 12, height: 1, background: `linear-gradient(90deg, ${c.warm}, transparent)` }} />
      </div>

      {/* content */}
      <div style={{ padding: "0 24px 120px", opacity: ready ? 1 : 0, animation: ready ? "fadeUp 0.5s ease forwards" : "none" }}>

        {/* ===================== DASHBOARD ===================== */}
        {tab === "home" && (
          <div>
            {/* progress ring */}
            <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 24px" }}>
              <div style={{ position: "relative", width: 200, height: 200 }}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="85" fill="none" stroke={c.sand} strokeWidth="6" />
                  <circle cx="100" cy="100" r="85" fill="none" stroke="url(#pg)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${progress * 5.34} ${534 - progress * 5.34}`} strokeDashoffset="133.5"
                    style={{ transition: "stroke-dasharray 1s ease" }} />
                  <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={c.highlight} /><stop offset="100%" stopColor={c.accent} />
                  </linearGradient></defs>
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                  <div style={{ fontFamily: font, fontSize: 44, fontWeight: 300, lineHeight: 1, color: c.text }}>{currentUser.miles}</div>
                  <div style={{ fontSize: 11, color: c.sub, letterSpacing: 2, marginTop: 4, textTransform: "uppercase" }}>of {GOAL} miles</div>
                  {lastMilestone && <div style={{ marginTop: 6, fontSize: 18 }}>{lastMilestone.icon}</div>}
                </div>
              </div>
            </div>

            {/* stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "miles left", value: milesLeft.toFixed(1) },
                { label: "day streak", value: `${currentUser.streak}` },
                { label: "rank", value: userRank > 0 ? `#${userRank}` : "—" },
              ].map((s, i) => (
                <div key={i} style={{ background: c.card, borderRadius: 14, padding: "14px 10px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontFamily: font, fontSize: 22, fontWeight: 400, color: c.text }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: c.sub, letterSpacing: 1.5, marginTop: 3, textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* milestones */}
            <div style={{ background: c.card, borderRadius: 16, padding: "18px 20px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: c.sub, textTransform: "uppercase", marginBottom: 14 }}>milestones</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {MILESTONES.map((m, i) => {
                  const hit = currentUser.miles >= m.at;
                  return (
                    <div key={i} style={{ textAlign: "center", flex: 1 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: hit ? `linear-gradient(135deg, ${c.highlight}, ${c.accent})` : c.soft,
                        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px",
                        fontSize: 16, opacity: hit ? 1 : 0.4, transition: "all 0.4s ease",
                      }}>{m.icon}</div>
                      <div style={{ fontSize: 9, color: hit ? c.accent : c.sub, fontWeight: hit ? 500 : 400 }}>{m.at}mi</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* weekly chart */}
            {weeklyEntries.length > 0 && (
              <div style={{ background: c.card, borderRadius: 16, padding: "18px 20px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: c.sub, textTransform: "uppercase", marginBottom: 16 }}>weekly breakdown</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                  {weeklyEntries.map((w, i) => {
                    const h = maxWeek > 0 ? (w.miles / maxWeek) * 80 : 0;
                    return (
                      <div key={i} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: c.text, fontWeight: 500, marginBottom: 4 }}>{w.miles}</div>
                        <div style={{
                          height: h, borderRadius: 6, minHeight: 4, transition: "height 0.6s ease",
                          background: i === weeklyEntries.length - 1
                            ? `linear-gradient(180deg, ${c.highlight}, ${c.accent})` : c.sand,
                        }} />
                        <div style={{ fontSize: 9, color: c.sub, marginTop: 5 }}>w{w.week}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* quote */}
            <div style={{ background: c.card, borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontFamily: font, fontSize: 18, fontStyle: "italic", fontWeight: 300, lineHeight: 1.4, color: c.text }}>
                "{dailyQuote.text}"
              </div>
              <div style={{ fontSize: 10, color: c.sub, marginTop: 8, letterSpacing: 1 }}>— {dailyQuote.author}</div>
            </div>
          </div>
        )}

        {/* ===================== LOG MILES ===================== */}
        {tab === "log" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontFamily: font, fontSize: 28, fontWeight: 300, fontStyle: "italic", color: c.text }}>log your miles</div>
              <div style={{ fontSize: 12, color: c.sub, marginTop: 4 }}>every mile is a conversation with yourself</div>
            </div>

            <div style={{ background: c.card, borderRadius: 20, padding: "32px 24px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}>
                <input type="number" placeholder="0.0" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLog()}
                  style={{
                    fontFamily: font, fontSize: 56, fontWeight: 300, width: 160, textAlign: "center",
                    border: "none", borderBottom: `2px solid ${c.sand}`, background: "transparent",
                    color: c.text, padding: "8px 0",
                  }} />
                <span style={{ fontSize: 14, color: c.sub, letterSpacing: 1 }}>mi</span>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
                {[1, 2, 3, 5].map((n) => (
                  <button key={n} onClick={() => setInput(String(n))}
                    style={{
                      width: 48, height: 48, borderRadius: 12, border: `1px solid ${c.sand}`,
                      background: input === String(n) ? c.accent : "transparent",
                      color: input === String(n) ? "#fff" : c.sub,
                      fontFamily: sans, fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease",
                    }}>+{n}</button>
                ))}
              </div>

              {/* strava proof */}
              <div style={{ marginBottom: 20, textAlign: "left" }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: c.sub, textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>
                  strava proof <span style={{ fontSize: 10, color: c.red, fontStyle: "italic", letterSpacing: 0, textTransform: "none" }}>(required)</span>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12,
                  border: `1px solid ${stravaLink ? c.accent : c.sand}`, background: c.bg, transition: "border-color 0.2s ease",
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>🏃‍♀️</span>
                  <input type="url" placeholder="paste strava activity link" value={stravaLink}
                    onChange={(e) => setStravaLink(e.target.value)}
                    style={{ flex: 1, border: "none", background: "transparent", fontFamily: sans, fontSize: 13, color: c.text, padding: 0 }}
                  />
                  {stravaLink && <span style={{ fontSize: 12, color: c.green, fontWeight: 600, flexShrink: 0 }}>✓</span>}
                </div>
                <div style={{ fontSize: 10, color: c.accent, marginTop: 6, textAlign: "center", fontStyle: "italic", fontWeight: 500 }}>
                  open strava → tap your run → share → copy link
                </div>
              </div>

              <button onClick={handleLog} disabled={!input || parseFloat(input) <= 0 || !stravaLink.trim()}
                style={{
                  width: "100%", padding: 16, borderRadius: 14, border: "none",
                  background: input && parseFloat(input) > 0 && stravaLink.trim() ? `linear-gradient(135deg, ${c.highlight}, ${c.accent})` : c.sand,
                  color: input && parseFloat(input) > 0 && stravaLink.trim() ? "#fff" : c.sub,
                  fontFamily: sans, fontSize: 14, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase",
                  cursor: input && parseFloat(input) > 0 && stravaLink.trim() ? "pointer" : "default", transition: "all 0.3s ease",
                }}>log miles</button>

              {logged && (
                <div style={{ marginTop: 16, animation: "pop 0.4s ease forwards", color: c.green, fontSize: 14, fontWeight: 500 }}>
                  ✓ miles logged — keep moving, keep growing 🌱
                </div>
              )}
            </div>

            {/* recent logs */}
            {recentLogs.length > 0 && (
              <div style={{ marginTop: 20, background: c.card, borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: c.sub, textTransform: "uppercase", marginBottom: 12 }}>recent logs</div>
                {recentLogs.map((l, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0",
                    borderBottom: i < recentLogs.length - 1 ? `1px solid ${c.soft}` : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, color: c.sub }}>{new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      {l.strava && (
                        <a href={l.strava} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 9, background: c.green, color: "#fff", padding: "2px 6px", borderRadius: 4, textDecoration: "none", fontWeight: 600 }}>
                          verified ✓
                        </a>
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: c.text, fontWeight: 500 }}>+{l.miles} mi</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== LEADERBOARD ===================== */}
        {tab === "board" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: font, fontSize: 28, fontWeight: 300, fontStyle: "italic", color: c.text }}>the board</div>
              <div style={{ fontSize: 12, color: c.sub, marginTop: 4 }}>we rise by lifting each other</div>
            </div>

            {sorted.length === 0 ? (
              <div style={{ background: c.card, borderRadius: 16, padding: "40px 20px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
                <div style={{ fontFamily: font, fontSize: 20, fontStyle: "italic", color: c.text }}>you're the first one here</div>
                <div style={{ fontSize: 12, color: c.sub, marginTop: 6 }}>share the link — your crew is coming</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sorted.map((m, i) => {
                  const p = Math.min((m.miles / GOAL) * 100, 100);
                  const isUser = currentUser && m.id === currentUser.id;
                  return (
                    <div key={m.id} style={{
                      background: isUser ? `linear-gradient(135deg, ${c.card}, #FBF6F0)` : c.card,
                      borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                      boxShadow: isUser ? "0 2px 8px rgba(139,111,78,0.1)" : "0 1px 3px rgba(0,0,0,0.03)",
                      border: isUser ? `1px solid ${c.warm}` : "1px solid transparent",
                      animation: `fadeUp 0.4s ease ${i * 0.06}s both`,
                    }}>
                      <div style={{
                        width: 28, fontFamily: font, fontSize: i < 3 ? 20 : 16, fontWeight: 400,
                        color: i === 0 ? c.highlight : i < 3 ? c.accent : c.sub, textAlign: "center",
                      }}>{i === 0 ? "👑" : i + 1}</div>
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%", background: c.soft,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
                      }}>{m.avatar}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: isUser ? 600 : 400, color: c.text }}>
                            {m.name} {isUser && <span style={{ fontSize: 10, color: c.accent }}>(you)</span>}
                          </span>
                          <span style={{ fontFamily: font, fontSize: 16, fontWeight: 400, color: c.text }}>
                            {m.miles} <span style={{ fontSize: 10, color: c.sub }}>mi</span>
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: c.soft, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${p}%`, borderRadius: 2, transition: "width 0.8s ease",
                            background: isUser ? `linear-gradient(90deg, ${c.highlight}, ${c.accent})` : c.warm,
                          }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <span style={{ fontSize: 9, color: c.sub }}>🔥 {m.streak} day streak</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {(m.verifiedRuns || 0) > 0 && (
                              <span style={{ fontSize: 8, background: c.green, color: "#fff", padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>
                                {m.verifiedRuns} verified
                              </span>
                            )}
                            <span style={{ fontSize: 9, color: c.sub }}>{Math.round(p)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {sorted.length > 0 && (
              <div style={{
                marginTop: 20, background: c.card, borderRadius: 16, padding: "18px 20px",
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: font, fontSize: 26, fontWeight: 300, color: c.text }}>
                    {sorted.reduce((a, m) => a + m.miles, 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: c.sub, textTransform: "uppercase", marginTop: 2 }}>total community miles</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: font, fontSize: 26, fontWeight: 300, color: c.text }}>{sorted.length}</div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: c.sub, textTransform: "uppercase", marginTop: 2 }}>active members</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== ADMIN / COMMITTEE ===================== */}
        {tab === "admin" && isAdmin && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: font, fontSize: 28, fontWeight: 300, fontStyle: "italic", color: c.text }}>committee view</div>
              <div style={{ fontSize: 12, color: c.sub, marginTop: 4 }}>tap a member to review their logs</div>
            </div>

            {/* overview stats */}
            <div style={{
              background: c.card, borderRadius: 16, padding: "18px 20px", marginBottom: 16,
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: font, fontSize: 24, fontWeight: 300, color: c.text }}>{allMembers.length}</div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: c.sub, textTransform: "uppercase", marginTop: 2 }}>members</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: font, fontSize: 24, fontWeight: 300, color: c.text }}>
                  {allMembers.reduce((a, m) => a + (m.verifiedRuns || 0), 0)}
                </div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: c.sub, textTransform: "uppercase", marginTop: 2 }}>verified runs</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: font, fontSize: 24, fontWeight: 300, color: c.text }}>
                  {allMembers.filter((m) => m.miles >= GOAL).length}
                </div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: c.sub, textTransform: "uppercase", marginTop: 2 }}>completed</div>
              </div>
            </div>

            {/* flag: unverified heavy loggers */}
            {(() => {
              const flagged = allMembers.filter((m) => m.miles > 30 && (m.verifiedRuns || 0) === 0);
              if (flagged.length === 0) return null;
              return (
                <div style={{
                  background: "#FFF8F0", border: "1px solid #F0D9B5", borderRadius: 14,
                  padding: "14px 16px", marginBottom: 16,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: c.highlight, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                    ⚠ needs verification
                  </div>
                  <div style={{ fontSize: 12, color: c.text, lineHeight: 1.5 }}>
                    {flagged.map((m) => m.name).join(", ")} — logged 30+ miles with no strava proof yet
                  </div>
                </div>
              );
            })()}

            {/* member list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sorted.map((m) => {
                const p = Math.min((m.miles / GOAL) * 100, 100);
                const isExpanded = expandedMember === m.id;
                const logs = memberLogs[m.id] || [];
                const verifiedCount = m.verifiedRuns || 0;

                return (
                  <div key={m.id}>
                    <div onClick={() => loadMemberLogs(m.id)}
                      style={{
                        background: c.card, borderRadius: isExpanded ? "14px 14px 0 0" : 14,
                        padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)", transition: "all 0.2s ease",
                        border: isExpanded ? `1px solid ${c.warm}` : "1px solid transparent",
                        borderBottom: isExpanded ? "none" : undefined,
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%", background: c.soft,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
                      }}>{m.avatar}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{m.name}</span>
                          <span style={{ fontFamily: font, fontSize: 16, color: c.text }}>
                            {m.miles} <span style={{ fontSize: 10, color: c.sub }}>mi</span>
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 2, background: c.soft, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${p}%`, borderRadius: 2, background: c.warm, transition: "width 0.8s ease" }} />
                          </div>
                          <span style={{
                            fontSize: 8, padding: "1px 5px", borderRadius: 3, fontWeight: 600, flexShrink: 0,
                            background: verifiedCount > 0 ? c.green : "#F0D9B5",
                            color: verifiedCount > 0 ? "#fff" : c.accent,
                          }}>
                            {verifiedCount} ✓
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: c.sub, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>▾</div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        background: c.card, borderRadius: "0 0 14px 14px", padding: "0 16px 16px",
                        border: `1px solid ${c.warm}`, borderTop: `1px solid ${c.soft}`, animation: "fadeUp 0.3s ease",
                      }}>
                        <div style={{
                          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "12px 0",
                          borderBottom: `1px solid ${c.soft}`, marginBottom: 10,
                        }}>
                          {[
                            { val: m.streak, lbl: "streak" },
                            { val: `${Math.round(p)}%`, lbl: "complete" },
                            { val: verifiedCount, lbl: "verified", color: verifiedCount > 0 ? c.green : c.highlight },
                          ].map((s, i) => (
                            <div key={i} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: s.color || c.text }}>{s.val}</div>
                              <div style={{ fontSize: 8, color: c.sub, textTransform: "uppercase", letterSpacing: 1 }}>{s.lbl}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ fontSize: 10, letterSpacing: 2, color: c.sub, textTransform: "uppercase", marginBottom: 8 }}>activity log</div>
                        {logs.length === 0 ? (
                          <div style={{ fontSize: 12, color: c.sub, fontStyle: "italic", padding: "8px 0" }}>no logs recorded yet</div>
                        ) : (
                          <div style={{ maxHeight: 200, overflowY: "auto" }}>
                            {[...logs].reverse().map((l, j) => (
                              <div key={j} style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0",
                                borderBottom: j < logs.length - 1 ? `1px solid ${c.soft}` : "none",
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 12, color: c.sub }}>
                                    {new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                  {l.strava ? (
                                    <a href={l.strava} target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize: 8, background: c.green, color: "#fff", padding: "2px 6px", borderRadius: 4, textDecoration: "none", fontWeight: 600 }}>
                                      view on strava ↗
                                    </a>
                                  ) : (
                                    <span style={{ fontSize: 8, background: c.soft, color: c.sub, padding: "2px 6px", borderRadius: 4 }}>no proof</span>
                                  )}
                                </div>
                                <span style={{ fontSize: 12, color: c.text, fontWeight: 500 }}>+{l.miles} mi</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: c.sub, marginTop: 10, fontStyle: "italic" }}>
                          joined {new Date(m.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={handleAdminLogout}
              style={{
                marginTop: 24, width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${c.sand}`,
                background: "transparent", color: c.sub, fontFamily: sans, fontSize: 12, cursor: "pointer",
                letterSpacing: 1, textTransform: "uppercase",
              }}>exit committee view</button>
          </div>
        )}
      </div>

      {/* admin login modal */}
      {showAdminLogin && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(44,40,37,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24,
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: c.bg, borderRadius: 20, padding: "32px 24px", maxWidth: 340, width: "100%",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)", animation: "pop 0.3s ease forwards",
          }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
              <div style={{ fontFamily: font, fontSize: 22, fontStyle: "italic", fontWeight: 300, color: c.text }}>committee access</div>
              <div style={{ fontSize: 11, color: c.sub, marginTop: 4 }}>enter the admin code</div>
            </div>
            <input type="password" placeholder="enter code" value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${c.sand}`,
                background: c.card, fontFamily: sans, fontSize: 16, color: c.text, marginBottom: 16,
                textAlign: "center", letterSpacing: 4, boxSizing: "border-box",
              }}
            />
            <button onClick={handleAdminLogin}
              style={{
                width: "100%", padding: 14, borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${c.highlight}, ${c.accent})`, color: "#fff",
                fontFamily: sans, fontSize: 13, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer", marginBottom: 10,
              }}>enter</button>
            <button onClick={() => { setShowAdminLogin(false); setAdminCode(""); }}
              style={{
                width: "100%", padding: 12, borderRadius: 12, border: "none",
                background: "transparent", color: c.sub, fontFamily: sans, fontSize: 12, cursor: "pointer",
              }}>cancel</button>
          </div>
        </div>
      )}

      {/* bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430,
        background: "rgba(247,244,240,0.92)", backdropFilter: "blur(16px)", borderTop: `1px solid ${c.sand}`,
        display: "flex", justifyContent: "space-around", padding: "10px 0 28px",
      }}>
        {[
          { id: "home", icon: "◎", label: "dashboard" },
          { id: "log", icon: "＋", label: "log" },
          { id: "board", icon: "♔", label: "board" },
          { id: "admin", icon: "◈", label: "committee", needsAdmin: true },
        ].map((t) => {
          if (t.needsAdmin && !isAdmin) {
            return (
              <button key={t.id} onClick={() => setShowAdminLogin(true)}
                style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center", padding: "4px 16px" }}>
                <div style={{ fontSize: 18, color: c.sub, marginBottom: 2, opacity: 0.5 }}>🔒</div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: c.sub, fontWeight: 400 }}>{t.label}</div>
              </button>
            );
          }
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center", padding: "4px 16px", transition: "all 0.2s ease" }}>
              <div style={{ fontSize: t.id === "log" ? 22 : 18, color: tab === t.id ? c.accent : c.sub, marginBottom: 2, transition: "color 0.2s ease" }}>{t.icon}</div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: tab === t.id ? c.accent : c.sub, fontWeight: tab === t.id ? 600 : 400, transition: "all 0.2s ease" }}>{t.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
