# mind.movement.miles — LISTA Run Club Challenge Tracker

A mobile-first web app for tracking the LISTA Mind.Movement.Miles 10-week challenge.
150 miles. 10 weeks. One community.

---

## What This App Does

- Members join with a name and avatar
- Log miles daily with optional Strava proof links
- Live leaderboard shows everyone's progress in real-time
- Milestone badges unlock at 25, 50, 75, 100, 125, and 150 miles
- Weekly breakdown charts
- Committee admin view to verify runs and review activity logs

---

## Setup Instructions (30 minutes, one time)

### Step 1: Set Up Firebase (Free Database)

Firebase stores all the data — member profiles, miles, logs. It's free for your usage level.

1. Go to **https://console.firebase.google.com**
2. Click **"Create a project"** (or "Add project")
3. Name it `lista-mmm` → click Continue
4. Turn OFF Google Analytics (you don't need it) → click Create Project
5. Wait for it to finish → click Continue

**Now set up the database:**

6. In the left sidebar, click **"Build"** → **"Firestore Database"**
7. Click **"Create database"**
8. Select a location (choose **nam5 (us-central)** — closest to LA)
9. Select **"Start in test mode"** → click Create
   *(Test mode is fine for now — we'll lock it down later if needed)*

**Now get your config keys:**

10. Click the **gear icon** (⚙️) next to "Project Overview" → **"Project settings"**
11. Scroll down to **"Your apps"** → click the **web icon** (`</>`)
12. Name the app `lista-mmm` → click **"Register app"**
13. You'll see a code block with `firebaseConfig`. Copy these values:
    - `apiKey`
    - `authDomain`
    - `projectId`
    - `storageBucket`
    - `messagingSenderId`
    - `appId`

14. Open the file `src/firebase.js` in this project
15. Replace each `"PASTE_YOUR_..._HERE"` with the matching value from Firebase
16. Save the file

**Example of what it should look like when done:**
```js
const firebaseConfig = {
  apiKey:            "AIzaSyD_abc123...",
  authDomain:        "lista-mmm.firebaseapp.com",
  projectId:         "lista-mmm",
  storageBucket:     "lista-mmm.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123..."
};
```

---

### Step 2: Deploy to Vercel (Free Hosting)

Vercel gives you a live URL that your runners can open on their phones.

**Option A — Deploy from GitHub (recommended):**

1. Create a GitHub account if you don't have one: **https://github.com**
2. Create a new repository → name it `lista-mmm`
3. Upload all the files from this project folder to the repository
4. Go to **https://vercel.com** → sign up with your GitHub account
5. Click **"Add New Project"** → select your `lista-mmm` repository
6. Vercel auto-detects it's a Vite project — just click **"Deploy"**
7. Wait 1-2 minutes → you'll get a live URL like `lista-mmm.vercel.app`

**Option B — Deploy with Vercel CLI (if you're comfortable with terminal):**

```bash
npm install
npm install -g vercel
vercel
```

Follow the prompts → you'll get a live URL.

---

### Step 3: Share With Your Runners

Once deployed, you'll have a URL. To share it:

1. **Group chat:** Drop the link in your LISTA group chat
2. **Instagram:** Add the link to your bio or stories
3. **Add to home screen:** Tell your runners to open the link in Safari,
   tap the Share button (⎋), and select "Add to Home Screen" — it'll look
   and feel like a real app with its own icon

---

## Admin / Committee Access

The committee tab is locked behind a code. Default code: **`lista2026`**

To change the code, open `src/App.jsx` and find this line near the top:
```js
const ADMIN_CODE = "lista2026";
```
Change it to whatever you want and redeploy.

Committee members who should have access: share the code with them privately.
They tap the 🔒 icon in the bottom nav, enter the code, and they're in.

**What the committee can see:**
- Total members, verified runs, and completions at a glance
- Flagged members (30+ miles logged with zero Strava proof)
- Tap any member to expand their full activity log
- Each log entry shows date, miles, and whether they attached a Strava link
- Green "view on strava ↗" button opens the actual Strava activity

---

## Customization

**Change the mile goal:**
In `src/App.jsx`, find `const GOAL = 150;` and change the number.

**Change milestone levels:**
In `src/App.jsx`, find the `MILESTONES` array and adjust the `at` values.

**Change the admin code:**
In `src/App.jsx`, find `const ADMIN_CODE = "lista2026";`

**Change colors/branding:**
In `src/App.jsx`, find the `c` object with all the color values.

**Add or change quotes:**
In `src/App.jsx`, find the `QUOTES` array.

---

## Custom Domain (Optional)

If you want a clean URL like `mmm.listarunclub.com`:

1. In Vercel dashboard → your project → Settings → Domains
2. Add your custom domain
3. Update your DNS records as Vercel instructs
4. Free SSL is automatic

---

## Tech Stack

- React 18 + Vite (frontend)
- Firebase Firestore (real-time database, free tier)
- Vercel (hosting, free tier)
- No backend server needed

---

## Need Help?

If you get stuck on any step, bring this README back to Claude
and describe where you're at — we'll work through it together.
