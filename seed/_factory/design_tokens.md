# Design Tokens & Visual Rules

## Pin Roles & Color Tokens
Every block and student node adheres to 4 primary roles:
- **`Start`**: Hooks, video intros, reading passages (`var(--pin-hook)`: `#f5d442`, ink `#2b2302`).
- **`Try`**: Practice, interactive canvas, manipulatives, riddles (`var(--pin-try)`: `#58b6fa`, ink `#04243b`).
- **`Check`**: Formative checks, multiple choice questions, audio checks (`var(--pin-check)`: `#48e29a`, ink `#032b17`).
- **`Next`**: Open-ended creation, art studio, project synthesis (`var(--pin-next)`: `#c88dfc`, ink `#2a0b45`).

## Pace Distribution Tokens
Used in WavyStackBar and student pace badges:
- **Ahead**: `var(--signal-mint)` (`#48e29a`)
- **On Pace**: `var(--signal-blue)` (`#58b6fa`)
- **Behind**: `var(--signal-coral)` (`#f87171`)

## Typography & Geometry
- **Headings**: `var(--font-serif-display)` (Georgia / Newsreader serif)
- **Body & UI**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Card Radii**: Pin `20px`, Panel `24px`, Pill `999px`.
- **Delays**: Student hover popover must enforce **500ms** debounce (`OPEN_DELAY_MS = 500`).
