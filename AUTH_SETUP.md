# Authentication Setup Guide

## ✅ What Has Been Implemented

I've successfully implemented a complete Supabase authentication flow for your React application. Here's what was done:

### 1. **Supabase Client Setup**
- Installed `@supabase/supabase-js` package
- Created `/src/lib/supabase.ts` - Supabase client instance
- Added environment variables to `.env` and `/src/env.ts`

### 2. **Authentication Context**
- Created `/src/contexts/auth-context.tsx` - Manages auth state globally
- Provides `useAuth()` hook for accessing:
  - `user` - Current authenticated user
  - `session` - Current session with access token
  - `signIn(email, password)` - Login function
  - `signOut()` - Logout function
  - `getAccessToken()` - Get current token
  - `loading` - Loading state

### 3. **Login Page**
- Updated `/src/components/login-form.tsx` to use Supabase authentication
- Calls `supabase.auth.signInWithPassword()` on form submit
- Shows loading state and error messages
- Redirects to dashboard on successful login

### 4. **Route Protection**
- Created `/src/lib/auth-guard.ts` - Route protection helper
- Added `beforeLoad: requireAuth` to all protected routes:
  - `/` (Home)
  - `/tickets`
  - `/properties`
  - `/approvals`
  - `/reports`
  - `/calendar`
  - `/automations`
  - `/audit-logs`
- Unauthenticated users are redirected to `/login`

### 5. **API Authentication**
- Created `/src/lib/api.ts` - Authenticated fetch wrapper
- All API calls now include `Authorization: Bearer <access_token>` header
- Updated all fetch calls across the app to use `authFetch()`

### 6. **App Integration**
- Wrapped app with `<AuthProvider>` in `__root.tsx`
- Updated logout button to call `signOut()` from auth context

---

## 🔧 What You Need to Do

### Step 1: Set Up Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project (or use existing one)
3. Wait for the project to finish setting up

### Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 3: Update Environment Variables

Open `/front-end/my-app/.env` and replace the placeholder values:

```env
VITE_API_BASE_URL=http://localhost:8000

# Replace these with your actual Supabase credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Step 4: Create a Test User in Supabase

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Enter an email and password
4. Click **Create user**

---

## 🔐 How It Works

### Login Flow

1. User enters email/password on `/login` page
2. Frontend calls `supabase.auth.signInWithPassword({ email, password })`
3. Supabase validates credentials and returns:
   - `user` object
   - `session` object with `access_token`
4. AuthProvider stores session and user in state
5. User is redirected to dashboard (`/`)

### Route Protection

1. When user navigates to a protected route (e.g., `/tickets`)
2. `beforeLoad: requireAuth` runs BEFORE the route component loads
3. `requireAuth()` checks if there's an active Supabase session
4. If no session → redirect to `/login`
5. If session exists → route loads normally

### API Calls with Authentication

1. Component calls `authFetch(url, options)`
2. `authFetch()` gets current session from Supabase
3. Extracts `access_token` from session
4. Adds `Authorization: Bearer <token>` to request headers
5. Makes the API call with auth header
6. Backend verifies the JWT token and processes request

### Session Persistence

- Supabase automatically stores session in `localStorage`
- On page refresh, `AuthProvider` checks for existing session
- If valid session exists, user remains logged in
- Session automatically refreshes before expiration

---

## 🧪 Testing the Authentication

### Test Login

1. Start your dev server: `npm run dev`
2. Navigate to `http://localhost:5173/login`
3. Try to access a protected route (e.g., `/tickets`) - you should be redirected to `/login`
4. Enter the test user credentials you created in Supabase
5. Click **Sign In**
6. You should see a success toast and be redirected to the dashboard
7. Now you can access all protected routes

### Test Logout

1. While logged in, click the **Logout** button in the sidebar
2. You should be signed out and redirected to `/login`
3. Try accessing `/tickets` again - you should be redirected to `/login`

### Test Session Persistence

1. Log in successfully
2. Refresh the page
3. You should remain logged in (not redirected to login)
4. Check browser localStorage - you should see Supabase session data

### Test API Calls

1. Open browser DevTools → Network tab
2. Log in and navigate to any page with data (e.g., `/properties`)
3. Check the network requests
4. Click on any API request
5. Look at **Request Headers** - you should see:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables" Error

**Problem**: You see this error in the browser console.

**Solution**: Make sure you've updated `.env` with your actual Supabase credentials and restarted the dev server.

### Login Fails with "Invalid login credentials"

**Problem**: Login form shows this error.

**Solution**:
1. Verify the email/password in Supabase dashboard
2. Make sure the user is created in the correct Supabase project
3. Check if email confirmation is required (disable in Supabase → Authentication → Settings)

### Redirected to Login Immediately After Login

**Problem**: You log in but get redirected back to login page.

**Solution**: Check browser console for errors. This usually means:
- Supabase credentials are wrong
- Session is not being stored properly
- Check if there's a CORS issue

### API Calls Return 401 Unauthorized

**Problem**: API calls fail with 401 even when logged in.

**Solution**: 
1. Your backend needs to verify the Supabase JWT token
2. Backend should have the same Supabase JWT secret
3. Check if the token is being sent in the `Authorization` header (use DevTools)

### Token Expired Error

**Problem**: After some time, requests start failing.

**Solution**: Supabase automatically refreshes tokens, but if you're getting this:
1. Check if you're calling `supabase.auth.getSession()` (which refreshes automatically)
2. Our `authFetch()` already does this, so this shouldn't happen

---

## 📁 Files Modified/Created

### New Files
- `/src/lib/supabase.ts` - Supabase client instance
- `/src/contexts/auth-context.tsx` - Auth state management
- `/src/lib/auth-guard.ts` - Route protection helper
- `/src/lib/api.ts` - Authenticated fetch wrapper
- `/src/vite-env.d.ts` - TypeScript types for Vite

### Modified Files
- `/src/routes/__root.tsx` - Added AuthProvider
- `/src/components/login-form.tsx` - Integrated Supabase auth
- `/src/components/simple-layout.tsx` - Updated logout function
- `/src/env.ts` - Added Supabase env vars
- `.env` - Added Supabase configuration
- All route files - Added `beforeLoad: requireAuth`
- All files with API calls - Updated to use `authFetch()`

---

## 🎯 Next Steps

1. ✅ Add your Supabase credentials to `.env`
2. ✅ Create a test user in Supabase
3. ✅ Test the login flow
4. 🔄 **Update your backend** to verify Supabase JWT tokens
5. 🔄 Configure Supabase authentication settings (email confirmation, password requirements, etc.)
6. 🔄 Set up password reset flow (optional)
7. 🔄 Add sign-up functionality (if needed)

---

## 💡 Additional Features You Can Add

- **Sign Up Page**: Create new user accounts
- **Password Reset**: Forgot password functionality
- **Email Verification**: Verify user emails before allowing login
- **Social Auth**: Login with Google, GitHub, etc.
- **User Profile**: Display user info from Supabase
- **Role-Based Access**: Restrict routes based on user roles

Let me know if you need help implementing any of these! 🚀
