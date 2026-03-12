# Post-Competition Roadmap: Co-Builder → Migration → Stabilization

**Date:** 2026-03-12
**Author:** Dio Atmando + Claude
**Status:** Approved

## Overview

Four-phase plan to transition GIS-ERP from competition mode to production-ready, including migration from legacy system.

## Phase 1: Co-Builder Cutoff (March 12, 23:59 WIB)

### Competition Freeze
- `COMPETITION_END = new Date('2026-03-12T23:59:59+07:00')` — already in code
- After midnight: submissions still accepted, but competition ranking frozen
- Points continue accumulating for permanent Co-Builder programme

### Code Changes
- Extract `COMPETITION_END` to shared constant (currently duplicated in 4 files)
- Add post-competition banner on `/co-builder`
- Submission form: change messaging from competition to permanent programme
- Results page: show "Hasil Akhir Kompetisi" with final prizes
- Leaderboard: show frozen competition ranking + active programme leaderboard

### UX After Cutoff
- Banner: "Kompetisi berakhir! Co-Builder berlanjut sebagai program permanent."
- Submit button stays active, new label: "Kirim Feedback (Program Co-Builder)"
- No cooldown period — seamless transition

## Phase 2: Disbursement + Data Reconnaissance (March 13)

### Morning: Prize Disbursement
Final leaderboard (as of midnight March 12):

| Rank | Name | Points | Prize (Rp) |
|------|------|--------|------------|
| 1 | Iqbal Tito | 6,937 | 3,000,000 |
| 2 | Kurniashanti | 6,661 | 2,000,000 |
| 3 | Feri Supriono | 5,170 | 1,500,000 |
| 4 | Luthfi Badarnawa | 1,823 | 1,000,000 |
| 5 | Navisa Kafka | 1,283 | 750,000 |

Plus participation bonuses (Rp 250,000) for eligible participants.

### Announcements
- Co-Builder permanent programme
- Eid sprint plan (ERP improvements while office is quiet)
- Post-Eid: full ERP adoption begins

### Critical: Old PC Data Reconnaissance
Before staff leave for Eid, grab the old system operator and execute this checklist:

```
□ Connect a monitor to the old PC
□ Photo: the PC, the application, the main menu
□ Windows version (right-click My Computer → Properties)
□ Application name (title bar, About menu)
□ Data location:
  - C:\Program Files\[app name]\
  - C:\Users\[user]\Documents\
  - Look for: .mdb, .accdb, .sql, .db, .dbf files
  - Check Services (services.msc) for database servers
□ Export all data possible (File → Export, Reports → Excel)
□ Export: JO list, PJO list, customers, vendors
□ Copy entire application folder to USB → Synology backup
□ Screenshot key screens: JO list, JO detail, PJO list, PJO detail
□ Ask operator: "Berapa total JO yang pernah dibuat?"
```

Timeline: ~1-2 hours with operator. Data safe on Synology for Eid sprint.

## Phase 3: Eid Sprint (March 14-29)

Solo work (Dio + agents). No staff available.

### Week 1 (March 14-20): ERP Stabilization
- Close remaining 25 acknowledged feedback items (wont_fix)
- Language consistency sweep (standardize Bahasa Indonesia across all modules)
- Implement 3 good suggestions:
  - E-procurement URL field on customer profile
  - PJO customer column visibility improvement
  - Language/label cleanup
- Harden core workflows: Quotation → PJO → BKK → JO → Invoice
- Verify every role can complete daily tasks end-to-end
- Performance audit on key pages

### Week 2 (March 21-29): Migration Prep
Depends on what was found on March 13:
- Analyze data dump from old PC
- Map old schema → ERP tables (JO numbers, PJO numbers, customers, vendors, amounts)
- Write import scripts
- Test import with sample records
- Prepare "Day 1 post-Eid" checklist for staff

### Flexible Timing
This is async work. If Dio is also on holiday, agents can prep and Dio reviews when available.

## Phase 4: Post-Eid Adoption (March 30+)

### Week 1: Parallel Running
- Staff come back to polished ERP
- Old PC stays on as **read-only reference only**
- ALL new JOs/PJOs go through ERP
- Co-Builder programme catches issues from real daily usage
- Daily monitoring (Arya agent assists)

### Week 2: Verify + Cutover
- Staff complete full business cycles in ERP without touching old PC
- Import remaining historical data if needed
- **Success metric:** Zero need to touch old PC for 5 consecutive working days
- Old PC → powered off, data archived on Synology

### Ongoing
- Co-Builder permanent programme for continuous feedback
- Monthly ERP health reviews
- Feature development driven by real usage patterns

## Remaining 32 Acknowledged Items

| Action | Count | When |
|--------|-------|------|
| Bulk close as wont_fix | 25 | March 12 (tonight) |
| Verify & close | 2 | March 12 (tonight) |
| Implement (language sweep, e-proc field, PJO visibility) | 3 | Eid sprint Week 1 |
| Close if no reply by March 15 | 2 | March 15 |

## Key Dependencies

1. **Old PC operator** — must be available March 13 for data reconnaissance
2. **Old PC data format** — determines migration script complexity
3. **Staff availability post-Eid** — parallel running needs all roles active
4. **Synology backup** — data dump must be safely stored before Eid

## Risk Mitigation

- **Old PC dies during Eid:** Backup on March 13 to Synology is the insurance policy
- **Migration data is messy:** Import scripts handle transformation; manual cleanup for edge cases
- **Staff resistance post-Eid:** Co-Builder programme incentivizes engagement; prizes prove commitment
- **Bugs during parallel running:** Co-Builder catches them; daily monitoring via Arya
