// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// Follow the README instructions to get these values from
// your Firebase console at https://console.firebase.google.com
// ============================================================

import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, setDoc, getDoc,
  getDocs, onSnapshot, query, orderBy
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyBa__oU8pg3V5Yvu4hmgudOlozdA-MC3uY",
  authDomain:        "lista-mmm.firebaseapp.com",
  projectId:         "lista-mmm",
  storageBucket:     "lista-mmm.firebasestorage.app",
  messagingSenderId: "785621904066",
  appId:             "1:785621904066:web:b6a912fd57e88eba4aa95b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---- Database helpers ----

// Save or update a member profile
export async function saveMember(member) {
  try {
    await setDoc(doc(db, "members", member.id), member);
  } catch (e) {
    console.error("Error saving member:", e);
  }
}

// Get all members
export async function getAllMembers() {
  try {
    const snap = await getDocs(collection(db, "members"));
    return snap.docs.map((d) => d.data());
  } catch (e) {
    console.error("Error loading members:", e);
    return [];
  }
}

// Listen to members in real-time (leaderboard updates live)
export function onMembersChange(callback) {
  return onSnapshot(collection(db, "members"), (snap) => {
    callback(snap.docs.map((d) => d.data()));
  });
}

// Save a member's activity log
export async function saveMemberLogs(memberId, logs) {
  try {
    await setDoc(doc(db, "logs", memberId), { entries: logs });
  } catch (e) {
    console.error("Error saving logs:", e);
  }
}

// Get a member's activity log
export async function getMemberLogs(memberId) {
  try {
    const snap = await getDoc(doc(db, "logs", memberId));
    if (snap.exists()) return snap.data().entries || [];
    return [];
  } catch (e) {
    console.error("Error loading logs:", e);
    return [];
  }
}

export { db };
