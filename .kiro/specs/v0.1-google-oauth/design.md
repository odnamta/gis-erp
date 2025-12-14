# Design Document: Google OAuth Authentication

## Overview

This design implements Google OAuth authentication for Gama ERP using Supabase Auth with the `@supabase/ssr` package. The implementation follows Next.js 14 App Router patterns with server-side session management and middleware-based route protection.

## Architecture

```mermaid
flowchart TD
    subgraph Client
        A[Login Page] -->|Click Sign In| B[Supabase Auth]
        B -->|OAuth Redirect| C[Google OAuth]
    end
    
    subgraph Google
        C -->|User Selects Account| D[Google Auth Server]
        D -->|Auth Code| E[Callback URL]
    end
    
    subgraph Server
        E -->|Exchange Code| F[/auth/callback Route]
        F -->|Create Session| G[Supabase Server Client]
        G -->|Set Cookies| H[Redirect to Dashboard]
    end
    
    subgraph Middleware
        I[Request] -->|Check Session| J{Authenticated?}
        J -->|No| K[Redirect to /login]
        J -->|Yes| L[Allow Request]
    end
```

## Components and Interfaces

### 1. Supabase Clients

**Browser Client** (`lib/supabase/client.ts`)
- Creates client-side Supabase instance
- Used for OAuth initiation and client-side auth operations
- Already exists, no changes needed

**Server Client** (`lib/supabase/server.ts`)
- Creates server-side Supabase instance with cookie handling
- Used in Server Components and Route Handlers
- Already exists, no changes needed

**Middleware Helper** (`lib/supabase/middleware.ts`)
- Updates session cookies on each request
- Provides session validation for route protection
- Already exists, may need minor updates

### 2. Pages and Routes

**Login Page** (`app/login/page.tsx`)
```typescript
interface LoginPageProps {
  searchParams: { error?: string; message?: string }
}
```
- Displays Gama ERP branding
- Google sign-in button with loading state
- Error message display from URL params

**Auth Callback** (`app/auth/callback/route.ts`)
```typescript
// GET handler for OAuth callback
// Exchanges auth code for session
// Redirects to dashboard or login with error
```

### 3. Middleware

**Route Protection** (`middleware.ts`)
```typescript
// Protects all routes except:
// - /login
// - /auth/callback
// - Static files (_next, favicon, etc.)
```

### 4. Header Component Updates

**Header** (`components/layout/header.tsx`)
```typescript
interface UserInfo {
  name: string
  email: string
  avatarUrl: string | null
}
```
- Display user name and avatar
- Logout button/dropdown
- Fallback initials for missing avatar

## Data Models

### Supabase User Object (from Google OAuth)
```typescript
interface User {
  id: string
  email: string
  user_metadata: {
    full_name: string
    avatar_url: string
    email: string
    name: string
  }
}
```

### Session Object
```typescript
interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  user: User
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Route protection redirects unauthenticated users
*For any* protected route (not /login, /auth/callback, or static files), when accessed by an unauthenticated user, the middleware SHALL redirect to /login.
**Validates: Requirements 4.1**

### Property 2: Authenticated user profile display
*For any* authenticated user with profile metadata, when viewing any protected page, the header SHALL display the user's name from their profile.
**Validates: Requirements 2.1, 2.2**

### Property 3: Avatar fallback to initials
*For any* authenticated user where avatar_url is null or image fails to load, the header SHALL display a fallback element containing the user's initials derived from their name.
**Validates: Requirements 2.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| OAuth flow cancelled | Redirect to /login with error param |
| OAuth code exchange fails | Redirect to /login with error message |
| Session expired | Middleware redirects to /login |
| Network error during auth | Display error on login page |
| Missing user metadata | Use email as fallback for name |

## Testing Strategy

### Unit Tests
- Login page renders correctly with sign-in button
- Error messages display when error param present
- Header displays user info correctly
- Avatar fallback renders initials when no image

### Property-Based Tests
Using `fast-check` library for property-based testing:

1. **Route Protection Property**: Generate random route paths, verify middleware correctly identifies protected vs public routes
2. **User Profile Display Property**: Generate random user metadata, verify header correctly extracts and displays name
3. **Initials Generation Property**: Generate random names, verify initials are correctly derived (first letter of first and last name)

### Integration Tests
- Full OAuth flow with mocked Supabase responses
- Middleware correctly handles session cookies
- Logout clears session and redirects

## File Structure

```
gama-erp/
├── app/
│   ├── login/
│   │   └── page.tsx          # Login page with Google button
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts      # OAuth callback handler
│   └── (main)/
│       └── layout.tsx        # Update to pass user to Header
├── components/
│   └── layout/
│       └── header.tsx        # Update with user info & logout
├── lib/
│   └── supabase/
│       ├── client.ts         # Existing - no changes
│       ├── server.ts         # Existing - no changes
│       └── middleware.ts     # Update for session refresh
└── middleware.ts             # Route protection
```
