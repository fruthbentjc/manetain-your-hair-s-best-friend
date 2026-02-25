

# Manetain — AI-Powered Hair Loss Prevention App 🧑‍🦲

## Design Direction
Warm & approachable design — friendly colors, rounded elements, and reassuring language to reduce anxiety around hair loss. Think calm greens, warm neutrals, and soft gradients.

---

## Page 1: Landing / Marketing Page
- Hero section with tagline: *"Catch hair loss before it catches you"*
- Problem/solution overview with statistics ($8.2B market, 25-50% loss before noticing)
- How it works (3 steps: Photo → AI Analysis → Action Plan)
- Testimonials/social proof section (placeholder)
- CTA buttons to sign up
- "Not medical advice" disclaimer in footer

## Page 2: Authentication
- Sign up / Log in with email and password
- Clean, minimal auth flow
- User profile creation (name, age, hair type, family history of hair loss)

## Page 3: Dashboard (Home)
- Welcome message with hair health summary score
- Progress timeline showing hair density trend over time (chart)
- Quick action: "Take this week's photo"
- Alert banner when AI detects changes worth noting
- Streak tracker for consistent photo uploads

## Page 4: Photo Capture & Analysis
- Guided photo capture with positioning instructions (top of head, hairline, temples, crown)
- Photo upload for each angle
- AI analysis powered by Lovable AI (Gemini vision model) that evaluates:
  - Hair density estimation
  - Hairline position
  - Crown thinning indicators
  - Comparison to previous photos
- Results displayed with visual indicators and clear "not medical advice" disclaimer
- Results saved to user history

## Page 5: Progress History
- Timeline view of all past analyses
- Side-by-side photo comparison tool
- Hair density trend chart over weeks/months
- Export progress report (for sharing with doctors)

## Page 6: Treatment Recommendations
- Personalized suggestions based on AI analysis results and user profile
- Categories: Topical treatments, supplements, lifestyle changes, professional treatments
- Each recommendation with description, evidence rating, and affiliate link (placeholder)
- Filter by type, cost, and commitment level

## Page 7: Find a Specialist
- List of partner clinics/dermatologists (placeholder data for MVP)
- Filter by location and specialty
- "Book Consultation" CTA (links out or shows contact info for MVP)
- Option to share your Manetain progress report with the specialist

## Page 8: Profile & Settings
- Edit personal info and hair profile
- Notification preferences (weekly photo reminders)
- Privacy settings
- Account management

---

## Backend & Infrastructure

- **Lovable Cloud** for database, authentication, storage, and edge functions
- **User accounts** with profiles table (age, hair type, family history)
- **Photo storage** in Supabase storage buckets
- **Analysis history** table storing AI results per photo session
- **Lovable AI** (Gemini vision model) for photo analysis via edge function
- **Treatment recommendations** stored as content in the database

## AI Integration
- Edge function receives uploaded photos and sends them to Lovable AI (Gemini Pro with vision) for analysis
- Structured output extracted via tool calling (density score, recession score, thinning indicators)
- All results include "not medical advice" disclaimers
- Comparison logic tracks changes between sessions and triggers alerts

