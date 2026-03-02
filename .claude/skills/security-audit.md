# Skill: Security Audit

This skill performs a comprehensive security audit of the Notavex application.

## Instructions

You are performing a security audit of the Notavex web application. Follow these steps:

### 1. Authentication & Authorization

- ✅ Check all API routes have `validateApiAuth()` middleware
- ✅ Verify server-side session validation in dashboard layouts
- ✅ Check middleware.ts protects all /dashboard routes
- ✅ Verify JWT/session token security
- ✅ Check for exposed sensitive endpoints

### 2. Rate Limiting

- ✅ Verify Upstash Redis configuration (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
- ✅ Check rate limiting on auth endpoints:
  - /api/auth/signup (3 req/hour)
  - /api/auth/signin (5 req/15min)
  - /api/auth/reset-password (3 req/hour)
  - /api/auth/resend-verification (3 req/10min)
- ✅ Verify rate limit error responses (429 status code)

### 3. Input Validation

- ✅ Check all API endpoints use Zod schemas
- ✅ Verify password strength requirements
- ✅ Check email format validation
- ✅ Verify no SQL injection vulnerabilities (Prisma should prevent this)

### 4. Security Headers

- ✅ Check next.config.ts has:
  - Content-Security-Policy (CSP)
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy

### 5. Sensitive Data Exposure

- ✅ Check .env is in .gitignore
- ✅ Verify no hardcoded secrets in code
- ✅ Check .env.example has placeholder values
- ✅ Verify passwords are hashed (bcryptjs)
- ✅ Check sensitive data is not logged

### 6. Audit Logging

- ✅ Verify audit logger tracks:
  - Signin/signup success/failure
  - Password resets
  - Unauthorized access attempts
  - Rate limit violations
- ✅ Check logs include IP, timestamp, user info

### 7. Session Management

- ✅ Check JWT expiry settings
- ✅ Verify secure cookie flags
- ✅ Check session invalidation on logout

### 8. Dependencies

- ✅ Run `npm audit` to check vulnerabilities
- ✅ Check for outdated critical packages

### Output Format:

```
## 🔒 Security Audit Report

### ✅ Passed Checks:
- [List all passed checks]

### ⚠️ Warnings:
- [List potential issues]

### ❌ Critical Issues:
- [List critical security problems]

### 📋 Recommendations:
- [List actionable recommendations]

### 🎯 Security Score: X/10
```

Start the audit now.
