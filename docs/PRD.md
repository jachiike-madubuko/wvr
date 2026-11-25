# Weavr — Product Requirements Document (PRD)

> **Team**: Weaver (`WVR`)  
> **Linear Project**: [Weavr Clean Rebuild (`P-WVR-5`)](https://linear.app/weaver-edu/project/weavr-clean-rebuild-73f58bb45938)

---

## 1. Product Vision & Multi-Surface Architecture

K–6 teacher app: calendar-first, standards-aware, interest-personalized lesson packets across **5 core subjects** (**Math**, **ELA**, **Science**, **Social Studies**, **Art**).

1. **Galaxy Field (Home)** ↔ **Pace Calendar & Swimlanes**: Front and back faces of a single 3D CSS perspective stage (`.wv-flip-scene`, toggled via `G` / `C` or navbar pills).
2. **Student Profile & Offline Interventions (`/students/[studentId]`)**: Clicking any student avatar or swimlane row opens their SEL Weaver Wheel, AM/PM check-ins, mastery chart, and 3-step physical teacher coaching drawer.
3. **Student Capability Path (`/s/[token]`)**: Anonymous first-name-only deck with 2-column YouTube-thumbnail mosaic, 3D card-flip activation, sequential padlock gating, and collectible avatar gear.

---

## 2. Standards-Based Weekly Pacing Model

- **1–2 Week Standard Cadence**: Every Common Core / core-subject standard spans a 1–2 week target window on the class pacing calendar.
- **Integrated Learning & Comprehension Gating**: Given a student's current spot in their lesson block, Weavr generates integrated learning blocks anchored to their active standard and advances them to the next standard once adequate comprehension is demonstrated.
- **Subject-Level & Overall Pace Derivation**:
  - Comparing each student's active standard against the target Common Core calendar week yields a weekly offset (`-3W`, `-2W`, `-1W`, `TODAY`, `+1W`, `+2W`):
    - **Behind** (`-3W`..`-1W`, coral): Student is 1–3 weeks behind target pace in that subject.
    - **On Track** (`TODAY`, mint): Student is on the current week's target standard.
    - **Ahead** (`+1W`..`+2W`, blue): Student has demonstrated comprehension and advanced 1–2 weeks ahead.
  - **No Averaged-Away Struggles**: In **Overall** mode, a student's status reflects their most urgent (furthest behind) subject rather than an average that hides struggles.

### Screen 2: Pace Calendar & Weekly Swimlanes (`WVR-228`)
- **Wavy Calendar**: 5-day week / month grid with `WavyStackBar` (`Ahead`, `On Track`, `Behind`).
- **Weekly Swimlane Matrix (`PacingTable`)**:
  - **Columns**: 6 weekly date columns (`-3W`, `-2W`, `-1W`, `TODAY`, `+1W`, `+2W`) with formatted calendar dates.
  - **Rows**: Students sorted automatically by urgency (furthest behind at top), showing first name, behind-subject summary, and status badge.
  - **Cell Values**: Up to 5 subject chips (`M` Math, `E` ELA, `S` Science, `SS` Social Studies, `A` Art) plotted directly in the week column where each subject's active standard sits.
  - **Filters**: Subject filter tabs (`Overall`, `Math`, `ELA`, `Science`, `Social Studies`, `Art`) and Pulse summary filters (`Behind`, `On Track`, `Ahead`).

---

## 3. Fail-Closed Invariants (Non-Negotiable)

1. **First Name Only**: `public.students` carries ONLY `first_name` (no last names, emails, passwords, student logins, or photos).
2. **Anonymous Capability Links**: `/s/[token]` hashed via SHA-256 against `student_path_tokens`; zero student auth session.
3. **Zero Secret Keys in Web Bundles**: `DATABASE_URL` and `DATABASE_URL_UNPOOLED` stay strictly server-side (`npm run check:env`).
4. **Teacher-Facing Offline Interventions**: AI advises the teacher offline; never inject AI chat or automated remediation blocks into the student's deck.
5. **Zero External Chart Bloat**: Charts import from `@/components/charts/*` (`@visx/*`, `d3-scale`, `d3-shape`, `motion` only).
6. **Optimistic Concurrency**: Student group moves require `expected_version` (`409 VERSION_CONFLICT`).
