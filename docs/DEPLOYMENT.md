# 🚀 Deployment Guide

Complete guide to deploying Neural Break to Vercel with global online leaderboards.

---

## Quick Deploy (3 Steps)

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Deploy to Vercel
```bash
# Install Vercel CLI (one-time)
npm install -g vercel

# Login (one-time)
vercel login

# Deploy
vercel
```

### 3️⃣ Enable Online Scores
In Vercel Dashboard:
1. Go to Project → **Settings** → **Environment Variables**
2. Add variable: `VITE_USE_API_HIGHSCORES` = `true`
3. Redeploy: `vercel --prod`

**Done!** 🎉 Your game now has global online leaderboards!

---

## How It Works

### Automatic Environment Detection

```
Local Development (npm run dev)
└─> localStorage (scores per-browser)

Vercel Production
└─> API endpoint (/api/highscores)
    └─> Global scores visible to all players
```

The system **automatically detects** where it's running:
- `VITE_USE_API_HIGHSCORES=true` → Use API (online)
- `VITE_USE_API_HIGHSCORES=false` or not set → Use localStorage (local)

### Smart Fallback

If the API fails:
1. Tries API first
2. Falls back to localStorage
3. No errors or crashes
4. Seamless user experience

---

## Storage Options

### Current: In-Memory Storage

**Status**: ✅ Implemented and working

**Pros:**
- ✅ Free
- ✅ Fast
- ✅ No setup
- ✅ Global visibility

**Cons:**
- ⚠️ Resets on deployment
- ⚠️ Resets on cold start

**Best for**: Testing, demos, short events

### Upgrade: Vercel KV (Permanent)

**Status**: 🔄 Easy to add

**Pros:**
- ✅ Never resets
- ✅ Fast (Redis)
- ✅ Free tier: 256MB + 100k reads/month

**Steps to Upgrade:**

```bash
# 1. Create KV database
vercel kv create neural-break-scores

# 2. Install package
npm install @vercel/kv

# 3. Update api/highscores.ts
# Replace in-memory storage with:
import { kv } from '@vercel/kv'

// GET scores
const scores = await kv.get<HighScoreEntry[]>('highscores') || []

// SAVE scores
await kv.set('highscores', updatedScores)

# 4. Redeploy
vercel --prod
```

---

## Testing

### Test Locally (localStorage)

```bash
npm run dev
# Open http://localhost:5173
```

- Play game and get high score
- Scores save to browser
- Each browser has separate scores

### Test Online (API)

```bash
vercel
# Visit your Vercel URL
```

- Play game and get high score
- Open in different browser
- Same scores appear! 🌐

### Verify API Endpoint

Visit: `https://your-app.vercel.app/api/highscores`

Should return JSON array (empty initially):
```json
[]
```

After saving scores:
```json
[
  {
    "name": "ACE",
    "score": 150000,
    "level": 10,
    "gameMode": "original",
    ...
  }
]
```

Filter by mode:
```
/api/highscores?mode=original
```

---

## Troubleshooting

### Issue: Scores not saving online

**Check:**
1. Environment variable: `VITE_USE_API_HIGHSCORES=true`
2. Deployed to Vercel (not localhost)
3. Console logs (should show "🌐 Using Online API")

**Fix:**
```bash
# Verify environment variable
vercel env ls

# Add if missing
vercel env add VITE_USE_API_HIGHSCORES
# Enter: true
# Select: Production, Preview, Development
```

### Issue: Different scores in different browsers (on Vercel)

**Cause**: API not enabled or failing

**Fix**: 
1. Check Vercel environment variables
2. Check function logs for errors
3. Test API endpoint directly

### Issue: Scores reset after deployment

**Cause**: Using in-memory storage (expected)

**Solution**: Upgrade to Vercel KV (see above)

### Issue: Build fails

**Fix:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Deployment Checklist

Before deploying:

- [ ] `npm install` completed
- [ ] `npm run build` succeeds
- [ ] Code committed to Git
- [ ] Pushed to repository
- [ ] Connected to Vercel
- [ ] Environment variable set
- [ ] Deployed successfully
- [ ] Tested in browser
- [ ] Verified global leaderboard
- [ ] Tested mode toggle

---

## Environment Variables

### Required for Online Scores

| Variable | Value | Where |
|----------|-------|-------|
| `VITE_USE_API_HIGHSCORES` | `true` | Vercel Dashboard |

### Optional

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `/api/highscores` | Custom API endpoint (default works) |

---

## Cost Analysis

### Free Tier (Hobby Plan)
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Serverless functions
- ✅ Perfect for indie games!

### With Vercel KV
- ✅ 256 MB storage
- ✅ 100,000 reads/month
- ✅ 10,000 writes/month
- ✅ Enough for most games!

**Total Cost: $0** for typical usage 🎉

---

## API Reference

### GET /api/highscores

Retrieve high scores.

**Query Parameters:**
- `mode` (optional): Filter by game mode (`original`, `test`)

**Response:**
```json
[
  {
    "name": "ACE",
    "score": 150000,
    "survivedTime": 1800,
    "level": 10,
    "date": "1/14/26",
    "location": "ONLINE",
    "gameMode": "original"
  }
]
```

### POST /api/highscores

Save new high score.

**Body:**
```json
{
  "name": "ACE",
  "score": 150000,
  "survivedTime": 1800,
  "level": 10,
  "date": "1/14/26",
  "location": "ONLINE",
  "gameMode": "original"
}
```

**Response:**
```json
{
  "success": true,
  "entry": { ... }
}
```

---

## Monitoring

### Vercel Dashboard

- **Functions**: View API logs and errors
- **Analytics**: Track usage and performance
- **Deployments**: See deployment history

### Logs

```bash
# View recent logs
vercel logs

# Stream live logs
vercel logs --follow
```

---

## Next Steps

After successful deployment:

1. ✅ Test thoroughly from multiple devices
2. 🎨 Customize game settings in `balance.config.ts`
3. 📱 Add to home screen (PWA support coming)
4. 🚀 Share your game URL!
5. ⬆️ Consider upgrading to Vercel KV for permanent storage

---

**Need help?** Open an issue with your error logs and environment details.

**Working perfectly?** Enjoy your global leaderboards! 🎮🌐
