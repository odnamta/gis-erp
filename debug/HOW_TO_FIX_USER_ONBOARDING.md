# URGENT: How to Fix User Onboarding Issue

## Problem Summary

**Issue:** Feri (and potentially other users) can login via Google OAuth but don't appear in the User Management page because they don't have a `user_profiles` record.

**Root Cause:** The RLS (Row Level Security) policy on `user_profiles` table has a chicken-and-egg problem:
- New users need to INSERT their profile on first login
- But the INSERT policy requires them to already have `can_manage_users = true`
- Since they don't have a profile yet, the INSERT fails
- Result: User can login but has no database record

## The Fix (5 Minutes)

### Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ljbkjtaowrdddvjhsygj)
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Fix Script

1. Open the file: `URGENT_FIX_USER_ONBOARDING.sql` (in the project root)
2. Copy the ENTIRE contents
3. Paste into Supabase SQL Editor
4. Click **Run** button

### Step 3: Verify the Fix

The script will output messages showing:
```
✓ Step 1 Complete: RLS policy fixed
✓ Created profile for Feri Supriono (finance_manager)
✓ Created profile for [any other orphaned accounts]
✓ USER ONBOARDING FIX COMPLETE
```

### Step 4: Test with Feri

1. Ask Feri to **logout** completely (clear session)
2. Ask Feri to **login** again
3. He should now see the Finance Manager dashboard
4. Go to Settings > User Management
5. You should now see Feri's account listed

## What This Script Does

### 1. Fixes the RLS Policy ✅
- **Before:** Only admins could create user_profiles
- **After:** Users can create their OWN profile on first login + admins can create others

### 2. Creates Feri's Profile ✅
- Email: `ferisupriono@gama-group.co`
- Role: `finance_manager`
- Permissions: Full finance manager permissions (can see revenue/profit, approve PJOs, manage invoices)

### 3. Fixes Any Other Orphaned Accounts ✅
- Automatically finds users in `auth.users` without profiles
- Creates profiles with appropriate roles based on email
- Default roles:
  - `dioatmando@gama-group.co` → owner
  - `ferisupriono@gama-group.co` → finance_manager
  - `hutamiarini@gama-group.co` → marketing_manager
  - `rezapramana@gama-group.co` → operations_manager
  - Other `@gama-group.co` → marketing
  - External emails → ops

## Verification Checklist

After running the script, verify:

- [ ] Feri can login and see the Finance Manager dashboard
- [ ] Feri appears in Settings > User Management
- [ ] You can edit Feri's role and permissions
- [ ] New users (like Rania, Yuma) will automatically get profiles when they login
- [ ] No more "no record" issues

## Future Prevention

This fix is **permanent**. After running this script:
- ✅ New users will automatically create their profile on first login
- ✅ No more chicken-and-egg RLS issues
- ✅ Pre-registered users will still work (Rania, Yuma)
- ✅ Admin user creation still works

## If You Still Have Issues

1. Check Supabase SQL Editor output for error messages
2. Verify Feri's email is exactly: `ferisupriono@gama-group.co`
3. Check `auth.users` table: `SELECT * FROM auth.users WHERE email = 'ferisupriono@gama-group.co'`
4. Check `user_profiles` table: `SELECT * FROM user_profiles WHERE email = 'ferisupriono@gama-group.co'`
5. If Feri still can't login, ask him to logout completely and clear browser cache

## Technical Details (For Reference)

### RLS Policy Change

**Before (Blocking Self-Registration):**
```sql
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.can_manage_users = true)
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('owner', 'director', 'sysadmin'))
);
```

**After (Allows Self-Registration):**
```sql
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (
  -- Users can create THEIR OWN profile
  (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid()))
  -- OR admins can create profiles for others
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.can_manage_users = true)
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('owner', 'director', 'sysadmin'))
);
```

### Why This Happened Again

This is the same issue we fixed before with Rania and Yuma. The previous fix was incomplete - it only fixed the specific accounts but didn't fix the underlying RLS policy. This time, we're fixing BOTH:
1. The immediate issue (Feri's account)
2. The root cause (RLS policy)

This ensures it won't happen again.
