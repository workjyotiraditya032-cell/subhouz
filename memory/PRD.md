# Subhouz — Smart Hostel Management Platform PRD

## Original Problem Statement
Build a production-ready Hostel Management Platform named Subhouz with ultra-premium hero section, two-tier access model (Super Admin / Hostel Admin), resident rent tracker with one-tap payment, automated WhatsApp challan/reminder system, and n8n-style automation engine.

## Architecture
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, Framer Motion, Recharts
- **Backend**: FastAPI (Python), Motor (async MongoDB driver)
- **Database**: MongoDB with proper indexes
- **Auth**: JWT + bcrypt, httpOnly cookies, RBAC (2 roles)

## User Personas
1. **Super Admin** — Platform-wide access, manages all hostels, creates admins, views cross-hostel analytics
2. **Hostel Admin** — Single hostel access, manages residents/rooms/rent for assigned hostel

## Core Requirements
- Premium animated hero section (dark theme, glassmorphism, floating cards)
- JWT auth with Super Admin + Hostel Admin roles
- Dashboard with real-time analytics, charts, hostel breakdown
- Hostel/Room/Bed CRUD with auto-bed creation
- Resident management (full profile, check-in/check-out)
- Rent Tracker — one-tap mark paid with auto receipt generation
- Automation Engine (WhatsApp challan/reminder workflows)
- Activity logging, global search, notifications

## What's Been Implemented (July 2, 2026)
- ✅ Premium hero section with animated counters, glassmorphism, trust badges
- ✅ JWT authentication (Super Admin + Hostel Admin)
- ✅ Dashboard with 8 stat cards, revenue chart, payment pie, hostel breakdown
- ✅ Hostel CRUD (3 real hostels seeded: Jogmaya, Homely Havens, GS Residency)
- ✅ Room/Bed management with auto-bed creation
- ✅ Resident management with check-in/check-out
- ✅ Rent Tracker (core feature) — one-tap mark paid, auto receipt, undo
- ✅ Automation Engine — 8 pre-built workflows, toggle enable/disable, manual reminder trigger
- ✅ WhatsApp integration architecture (MOCKED — needs user's Meta Business API credentials)
- ✅ Settings (WhatsApp config, User Management, General)
- ✅ Activity logging across all actions
- ✅ Seed data: 3 hostels, 21 rooms, 57 beds, 39 residents, 3 months payment history
- ✅ 3 Hostel Admin accounts seeded

## Test Results
- Backend: 17/17 tests passed (100%)
- Frontend: 13/13 features verified (100%)

## Prioritized Backlog
### P0 (Next)
- Wire WhatsApp Business Cloud API with user's Meta credentials
- Cron job for automatic daily rent reminders
- PDF receipt generation and download

### P1
- Complaints module
- Electricity billing calculator
- Staff management (records only)
- Export (CSV, Excel, PDF) for all data tables

### P2
- Public website pages (About, Gallery, FAQ, Privacy)
- Admission enquiry form on public site
- Maintenance tracking
- Housekeeping schedule
- Inventory management
- Dark mode toggle for dashboard
- Mobile-responsive optimization
- Forgot password email flow

## Iteration 2 — Homepage Redesign (July 2, 2026)
### Change: Public website redesigned from SaaS dashboard → warm hospitality brand
- ✅ Photography-led hero with ambient image carousel (3 images, 6s crossfade)
- ✅ Fraunces serif for headlines, DM Sans for body text
- ✅ Warm palette: cream (#FAF7F2), forest green (#2D5F3F), terracotta (#D4A574), charcoal (#1C1917)
- ✅ "A Place That Feels Like Home." headline — hospitality-first messaging
- ✅ CTAs: "Browse Our Hostels" and "Send an Enquiry" — no SaaS/dashboard language
- ✅ Hostel cards section showcasing 3 real Bhubaneswar hostels with photos + types (Boys/Girls/Co-ed)
- ✅ Amenities section (Wi-Fi, Security, AC, etc.)
- ✅ Gallery section with 6-image grid
- ✅ Booking enquiry form with hostel selector
- ✅ Admin Login link tucked in footer only (no Sign In in nav)
- ✅ Public /api/hostels/public endpoint (no auth required)
- ✅ Frontend 100% tests passed (iteration 2)
