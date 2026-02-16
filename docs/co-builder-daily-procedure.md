# Co-Builder Daily Procedure

> Repeatable workflow for each day of the competition (Feb 12 - Mar 12, 2026).
> Run once daily (or after returning from a break).

---

## 1. Check New Feedback

```sql
-- Run via Supabase Management API or SQL Editor
SELECT cf.id, cf.category, cf.title, cf.description, cf.page_url,
       cf.screenshot_url, cf.admin_status, cf.created_at,
       up.full_name as reporter
FROM competition_feedback cf
LEFT JOIN user_profiles up ON cf.user_id = up.user_id
WHERE cf.admin_status = 'new'
ORDER BY cf.created_at DESC;
```

**Action:** For each new feedback item:
- Read the description + screenshot
- Classify: `bug` (needs fix), `duplicate` (of existing), `question` (needs answer), `suggestion` (log for backlog)
- If it's a bug, investigate the root cause

---

## 2. Fix Bugs

For each confirmed bug:

1. **Investigate** — read the relevant code, check RLS policies, verify database state
2. **Fix** — edit code in `/Users/dioatmando/Vibecode/gama/gis-erp/`
3. **Build** — `npm run build` (must pass before commit)
4. **If DB change needed** — run SQL via Supabase Management API:
   ```
   POST https://api.supabase.com/v1/projects/ljbkjtaowrdddvjhsygj/database/query
   Authorization: Bearer sbp_7f742ed82f73544f805de9def2e1dad9fbee25e2
   ```

---

## 3. Review & Score Feedback

For each reviewed feedback item, update admin fields:

```sql
UPDATE competition_feedback
SET admin_status = 'fixed',        -- or 'acknowledged', 'duplicate', 'wont_fix'
    impact_level = 'critical',     -- or 'important', 'helpful'
    impact_multiplier = 3,         -- critical=3, important=2, helpful=1
    admin_response = 'Fixed — [brief description]',
    reviewed_at = NOW()
WHERE id = '[feedback_id]';
```

**Impact levels:**
| Level | Multiplier | Criteria |
|-------|-----------|----------|
| Critical | x3 | Blocks core workflow, affects multiple users |
| Important | x2 | Significant bug or useful improvement |
| Helpful | x1 | Minor issue, vague report, or general comment |

**If bug was fixed**, also insert a bonus point event:
```sql
INSERT INTO point_events (user_id, event_type, points, metadata)
SELECT user_id, 'bug_fixed', 5, '{"feedback_title": "[title]"}'::jsonb
FROM competition_feedback WHERE id = '[feedback_id]';
```

---

## 4. Deploy

```bash
# All changes committed and pushed to main auto-deploy to Vercel
git add [specific files]
git commit -m "fix: [description]"
git push
```

Verify deployment at Vercel dashboard or wait ~2 minutes for auto-deploy.

---

## 5. Update Daily Log

Edit `docs/co-builder-daily-log.md`:
- Add/update the day's section using the template at the bottom of the file
- Include: bugs found, bugs fixed, features added, commits, investigation items
- Update leaderboard if scores changed

---

## 6. Check Leaderboard

```sql
SELECT up.full_name,
       COALESCE(SUM(pe.points), 0) as total_points,
       COUNT(DISTINCT pe.id) as events
FROM user_profiles up
LEFT JOIN point_events pe ON up.user_id = pe.user_id
WHERE up.user_id IN (
  SELECT DISTINCT user_id FROM competition_feedback
  UNION
  SELECT DISTINCT user_id FROM scenario_completions
)
GROUP BY up.full_name
ORDER BY total_points DESC;
```

---

## 7. Draft Email

Use the style guide at `docs/co-builder-email-style.md`.

**Template structure:**
1. Greeting + energy/context
2. Leaderboard table (if changed)
3. Bugs fixed (bold key phrase, keep scannable)
4. New features
5. Tips or call to action
6. Encouragement for inactive members

**Rules:**
- Keep under 300 words (excluding tables)
- Name specific people for contributions
- Don't mention Yuma (GLS-ERP)
- Don't list commit hashes
- End with clear action item

---

## 8. Check Participation

```sql
-- Active submitters
SELECT up.full_name, COUNT(cf.id) as feedback_count,
       MAX(cf.created_at) as last_feedback
FROM competition_feedback cf
JOIN user_profiles up ON cf.user_id = up.user_id
GROUP BY up.full_name
ORDER BY last_feedback DESC;

-- Logged in but inactive
SELECT full_name, last_login_at
FROM user_profiles
WHERE last_login_at IS NOT NULL
AND user_id NOT IN (SELECT DISTINCT user_id FROM competition_feedback)
ORDER BY full_name;
```

---

## Quick Reference

| Resource | Location |
|----------|----------|
| Supabase project | `ljbkjtaowrdddvjhsygj` |
| Daily log | `docs/co-builder-daily-log.md` |
| Email style | `docs/co-builder-email-style.md` |
| Feedback component | `components/co-builder/competition-feedback-button.tsx` |
| Scoring utils | `lib/co-builder-utils.ts` |
| Co-Builder pages | `app/(main)/co-builder/` |
