# Deploy user_profiles RLS Fix to Production

**Created:** 2026-01-09
**Priority:** HIGH - Security Fix
**Status:** Ready to Deploy

## 📋 What This Fixes

**Problem:**
- `user_profiles` table had NO INSERT policy
- Users couldn't be added via `/settings/users`
- "Row-level security policy violation" error

**Solution:**
- Proper RLS policies with role-based access control
- Secure, production-ready implementation
- Maintains security while allowing authorized user management

---

## 🚀 DEPLOYMENT STEPS

### Option A: Supabase CLI (Recommended - 1 minute)

```bash
# Navigate to project
cd /Users/dioatmando/Vibecode/gama/gis-erp

# Push migration to Supabase
supabase db push

# Verify it worked
supabase db pull
```

**Expected output:** `Migration applied successfully`

---

### Option B: Supabase Dashboard (2 minutes)

**Step 1:** Open Supabase Dashboard → SQL Editor

**Step 2:** Copy the entire content from:
`supabase/migrations/20260109_proper_user_profiles_rls.sql`

**Step 3:** Paste into SQL Editor and click **RUN**

**Step 4:** Verify success - you should see:
```
Success. No rows returned
NOTICE: user_profiles RLS policies created successfully
```

---

## ✅ VERIFICATION STEPS

### 1. Check Policies Were Created

Run this in SQL Editor:
```sql
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd;
```

**Expected Result:** 4 policies (SELECT, INSERT, UPDATE, DELETE)

### 2. Check Your Permissions

```sql
SELECT
  email,
  role,
  can_manage_users,
  is_active
FROM user_profiles
WHERE user_id = auth.uid();
```

**Expected:** Your account should have `can_manage_users = true` or `role = 'owner'`

### 3. Test User Creation

1. Go to: `https://your-app.vercel.app/settings/users`
2. Click **Add User**
3. Fill in test user details
4. Click **Save**

**Expected:** User created successfully ✅

---

## 🔒 SECURITY FEATURES

### What's Protected:

**SELECT (View Users):**
- ✅ Users can see their own profile
- ✅ Users with `can_manage_users = true` see all profiles
- ✅ Owner, Director, Sysadmin roles see all profiles
- ❌ Regular users cannot see other profiles

**INSERT (Create Users):**
- ✅ Users with `can_manage_users = true` can create users
- ✅ Owner, Director, Sysadmin roles can create users
- ❌ Regular users cannot create users

**UPDATE (Edit Users):**
- ✅ Users can update their own profile (name, avatar, etc.)
- ✅ Users with `can_manage_users = true` can edit all profiles
- ✅ Owner, Director, Sysadmin roles can edit all profiles
- ❌ Regular users cannot edit other users

**DELETE (Remove Users):**
- ✅ Only Owner role can delete profiles
- ❌ Even Director/Sysadmin cannot delete users

### Additional Protections:

1. **Owner Role Protection**
   - Trigger prevents removing owner role
   - Ensures at least one owner always exists

2. **Active User Check**
   - Policies check `is_active = true`
   - Deactivated admins lose management privileges

3. **Self-Deactivation Prevention**
   - Handled in application code
   - Users cannot deactivate themselves

---

## 🔄 ROLLBACK PLAN (If Needed)

If something goes wrong, revert with:

```sql
-- Remove the new policies
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;

-- Re-apply permissive policies (temporary)
CREATE POLICY "user_profiles_select_permissive" ON user_profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "user_profiles_insert_permissive" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "user_profiles_update_permissive" ON user_profiles
FOR UPDATE TO authenticated
USING (true);
```

---

## 📊 COMPARISON

### Before (Nuclear Option - Demo Fix):
```sql
-- Permissive - INSECURE
WITH CHECK (true)  -- Anyone can do anything
```
- ❌ Any authenticated user could create profiles
- ❌ Any authenticated user could edit any profile
- ❌ No role checking
- ⚠️ Security risk in production

### After (Proper Fix - Production):
```sql
-- Role-based - SECURE
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.can_manage_users = true
  )
)
```
- ✅ Only authorized users can manage profiles
- ✅ Role-based access control
- ✅ Principle of least privilege
- ✅ Production-ready security

---

## 🎯 POST-DEPLOYMENT CHECKLIST

After deploying, verify:

- [ ] 4 RLS policies exist on `user_profiles` table
- [ ] Owner account can create users
- [ ] Director account can create users (if you have one)
- [ ] Regular user accounts CANNOT create users
- [ ] Users can view their own profile
- [ ] Users CANNOT view other profiles (unless authorized)
- [ ] Trigger `prevent_owner_removal` exists
- [ ] No more "row-level security violation" errors

---

## 🐛 TROUBLESHOOTING

### Issue: "Still getting RLS violation error"

**Check 1:** Verify your account has proper permissions
```sql
UPDATE user_profiles
SET can_manage_users = true
WHERE email = 'your-email@example.com';
```

**Check 2:** Verify policies were applied
```sql
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles';
-- Should return 4
```

**Check 3:** Check for conflicting policies
```sql
SELECT policyname FROM pg_policies
WHERE tablename = 'user_profiles'
AND policyname LIKE '%permissive%';
-- Should return 0 (no permissive policies)
```

### Issue: "Migration already applied"

If you get "migration already exists":
```bash
# Check migration status
supabase migration list

# If shown as applied, you're good!
```

---

## 📝 MIGRATION DETAILS

**File:** `supabase/migrations/20260109_proper_user_profiles_rls.sql`

**What it does:**
1. Enables RLS on `user_profiles`
2. Removes temporary permissive policies (from demo fix)
3. Creates 4 secure, role-based policies
4. Adds trigger to prevent owner role removal
5. Adds table documentation

**Safe to run multiple times:** Yes (uses `DROP POLICY IF EXISTS`)

---

## ⚡ QUICK DEPLOY (TL;DR)

```bash
cd /Users/dioatmando/Vibecode/gama/gis-erp
supabase db push
```

Then test at: `/settings/users`

Done! ✅

---

## 📞 SUPPORT

If issues persist:
1. Check Supabase logs: Dashboard → Logs
2. Check browser console for errors
3. Verify migration applied: `supabase migration list`

---

**Ready to deploy?** Follow Option A or B above! 🚀
