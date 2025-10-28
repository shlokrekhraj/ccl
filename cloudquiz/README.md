# CloudQuiz (Cloud-Based Online Quiz Platform)

A simple, attractive quiz web app with cloud storage. Students can take the "Cloud Computing Basics" quiz (10 MCQs), get instant scoring, and admins can view results on a dashboard.

## Features
- Start quiz with name + category selector
- 10 MCQs with progress bar, timer (10 minutes), Previous/Next navigation
- Answer selection and final review breakdown (correct vs your answer)
- Result saved to Firebase Firestore (name, score, percent, answers)
- Admin dashboard: total attempts, average percent, best score, table of results
- Mobile-friendly UI with modern styling

## Quick Start
1. Open `index.html` in a modern browser.
2. It works offline using a built-in default question set.
3. To enable cloud saving and admin results:
   - Create a Firebase project and enable Firestore (in test mode for development).
   - Copy your Firebase config into `script.js`:
     ```js
     const firebaseConfig = {
       apiKey: "...",
       authDomain: "...",
       projectId: "...",
       storageBucket: "...",
       messagingSenderId: "...",
       appId: "..."
     };
     ```
   - Optional: Seed Firestore collection `questions_cloud_basics` with documents:
     ```json
     { "question": "...", "options": ["A","B","C","D"], "answer": "A" }
     ```
     If empty, the app uses built-in default questions.

## Admin Dashboard
- Default admin key is `changeme-admin-123` (set in `script.js` as `ADMIN_KEY`).
- Enter the key and click "View Results" to see stats and the results table.
- Change the key before deploying.

## Collections
- `questions_cloud_basics` (optional): each doc `{ question, options: string[], answer }`
- `results`: `{ name, quizId, score, total, percent, date, answers }`

## Deploy
- You can host this static site on any provider (Firebase Hosting, GitHub Pages, Netlify, Vercel, S3+CloudFront).
- No server required; Firestore is accessed directly from the browser.

## Notes
- For MongoDB instead of Firebase, you would need a small backend (Node/Express) to securely store results. Firestore avoids needing a custom server for this project.
- Keep Firestore security rules strict for production.
