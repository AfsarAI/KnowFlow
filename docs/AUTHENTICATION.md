# KnowFlow Authentication Specification (KF-04)

This document provides complete technical instructions and architectural details for authentication in KnowFlow, covering Supabase Auth, Google OAuth, FastAPI JWT verification, session restoration, and multi-tenant authorization boundaries.

---

## 1. Authentication Architecture

KnowFlow decouples client identity management from database operations by utilizing **Supabase Auth** as the identity provider while independently verifying JSON Web Tokens (JWT) inside the **FastAPI backend**.

```
Client (React SPA)
       │
       ▼  1. Sign in (Email / Google OAuth)
Supabase Auth Service
       │
       ▼  2. Issue JWT Access Token (claims: sub=UUID, email, exp, role)
Client (React SPA)
       │
       ▼  3. HTTP Request: Authorization: Bearer <token>
FastAPI Gateway (`get_current_user` Dependency)
       │
       ├─► 4. Independent JWT Verification (HS256 secret or RS256/ES256 JWKS)
       │
       ├─► 5. User Sync: Map token `sub` (UUID) to PostgreSQL `users` table
       │
       ▼  6. Authorized Request Execution (user_id scoped queries)
PostgreSQL Database (Local or Hosted Supabase)
```

---

## 2. Supabase Integration Setup

To connect KnowFlow to your hosted Supabase instance:

1. **Create a Supabase Project:**
   Navigate to [https://database.new](https://database.new) and create a new project.

2. **Retrieve API Credentials:**
   In your Supabase project dashboard, navigate to **Project Settings -> API**:
   - `Project URL`: Copy this value as `SUPABASE_URL` and `VITE_SUPABASE_URL`.
   - `Project API Keys (anon / public)`: Copy this value as `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`.

3. **Retrieve JWT Secret:**
   In your Supabase project dashboard, navigate to **Project Settings -> API -> JWT Settings**:
   - `JWT Secret`: Copy this string into backend `.env` as `SUPABASE_JWT_SECRET`.
   - `JWKS URL`: Usually `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`.

---

## 3. Google OAuth Configuration

To enable **Continue with Google**:

1. **Google Cloud Console:**
   - Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
   - Create an **OAuth 2.0 Client ID** (Web application).
   - Add your Supabase project callback URL under **Authorized redirect URIs**:
     `https://<project-ref>.supabase.co/auth/v1/callback`

2. **Supabase Dashboard:**
   - In Supabase, go to **Authentication -> Providers -> Google**.
   - Enable the Google provider.
   - Enter your Google **Client ID** and **Client Secret**.
   - Save changes.

3. **Client Flow:**
   When the user clicks "Continue with Google", the React frontend executes:
   ```typescript
   await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: `${window.location.origin}/dashboard`,
     },
   });
   ```
   Upon returning, Supabase restores the authenticated session, which is detected by `onAuthStateChange`.

---

## 4. Backend JWT Verification Pipeline

The FastAPI backend **never trusts client-supplied user IDs**. Every private endpoint enforces authentication through `get_current_user`:

1. **Bearer Token Extraction:** Reads the `Authorization: Bearer <token>` header.
2. **Signature & Expiration Verification:**
   - If `SUPABASE_JWT_SECRET` is set, verifies HMAC-SHA256 signature and `exp`.
   - If `SUPABASE_JWKS_URL` is set, fetches public signing keys to verify RS256/ES256 signatures.
   - In local development mode, verifies against `SECRET_KEY` with automatic fallback.
3. **Identity Resolution:** Extracts the token `sub` (UUID), ensuring it is a valid UUID format.
4. **User Synchronization:**
   - Checks if the user exists in the local PostgreSQL `users` table (`db.get(User, user_uuid)`).
   - If the user is new, automatically synchronizes a row in `users` with their email, name, and provider.
5. **Authorization Enforcement:** Rejects inactive users with HTTP 403 Forbidden.

---

## 5. Protected Endpoints Available

- `GET /api/auth/me` (or `/api/v1/auth/me`):
  Returns the verified user profile:
  ```json
  {
    "id": "e4c935b0-36a5-4e2a-9cb8-4f9547b744d0",
    "email": "jane@example.com",
    "full_name": "Jane Doe",
    "auth_provider": "google",
    "is_active": true,
    "created_at": "2026-11-24T16:15:00Z"
  }
  ```
- `GET /api/auth/status`:
  Public status reporting whether Supabase credentials are configured.
