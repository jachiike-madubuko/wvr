import type { ActionChatCfg } from "@/lib/classroom/action-chat";

export const DEMO_PROFILE_STUDENT_ID = "stu_jordan";
export const INTERVENTION_MS = 1700;

export const MOOD_LABELS = ["Calm", "Uneasy", "Mixed", "Distressed", "Steady"] as const;
export type MoodLabel = (typeof MOOD_LABELS)[number];

export type RadarZone = {
  label: string;
  /** Display label only. Not a stored Wheel score. */
  score: number;
  color: string;
};

export type CheckInSlot = "am" | "pm";

export type CheckInPoint = {
  id: string;
  day: string;
  date: string;
  /** 0 calm, 1 distressed. Chart position only. */
  value: number;
  label: MoodLabel;
  slot: CheckInSlot;
  /** Fixture-only context a teacher might tie to this mood. Never a diagnosis. */
  reason?: string;
};

export type MasteryDetail = {
  concept: string;
  misconception: string;
  rounds: string;
  timeOnTask: string;
  summary: string;
};

export type MasteryNode = {
  id: string;
  label: string;
  /** Completion time in seconds. Chart position only, not a grade. */
  value: number;
  kind: "strength" | "struggle";
  detail: MasteryDetail | null;
  subject?: string;
  attempts?: number;
  /** Set on a day or week. Opening it shows that lesson's blocks. */
  blocks?: MasteryNode[];
};

export type MasteryZoom = "day" | "week" | "month";
export type MasteryFilter = "strengths" | "struggles" | "both";

export type ProfileFixture = {
  focusCaption: string;
  zones: RadarZone[];
  checkIns: CheckInPoint[];
  /** The current lesson, block by block. Also `mastery.day`. */
  lesson: MasteryNode[];
  mastery: Record<MasteryZoom, MasteryNode[]>;
  intervention: {
    kicker: string;
    title: string;
    minutes: string;
    misconception: string;
    prompt: string;
    choices: string[];
  };
};

const ZONE_LABELS = ["Emotional Reg", "Focus", "Engagement", "Task Completion", "Social"] as const;
const ZONE_COLORS = [
  "var(--signal-blue)",
  "var(--signal-coral)",
  "var(--pack-volcanoes)",
  "var(--signal-mint)",
  "var(--pack-ballet)",
];
const DATES = ["10-23", "10-24", "10-25", "10-26", "10-27", "10-28", "10-29", "10-30"];
const SHAPES = ["pace", "distress", "sparse", "crash", "rebound", "swing"] as const;
type Shape = "dip" | (typeof SHAPES)[number];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) % 997;
  return n;
}

function moodLabel(value: number): MoodLabel {
  if (value > 0.66) return "Distressed";
  if (value > 0.45) return "Uneasy";
  if (value > 0.3) return "Mixed";
  return "Calm";
}

function point(dayIndex: number, slot: CheckInSlot, value: number, reason: string): CheckInPoint {
  return {
    reason,
    id: `d${dayIndex + 1}-${slot}`,
    day: `Day ${dayIndex + 1}`,
    date: DATES[dayIndex] ?? "10-23",
    value,
    label: moodLabel(value),
    slot,
  };
}

/** One day: [am value, pm value, why am felt that way, why pm felt that way]. */
type DayRow = [number, number, string, string];

function checks(days: DayRow[]): CheckInPoint[] {
  return days.flatMap(([am, pm, amWhy, pmWhy], i) => [
    point(i, "am", am, amWhy),
    point(i, "pm", pm, pmWhy),
  ]);
}

/**
 * Mornings and afternoons differ on purpose, so a teacher can scan for the days
 * worth a look (good am, bad pm, or the reverse). Each check-in carries a short
 * reason for the chat to start from.
 */
const SERIES: Record<Shape, DayRow[]> = {
  pace: [
    [0.12, 0.18, "Arrived relaxed after breakfast with a friend.", "Easy group work after lunch."],
    [0.1, 0.2, "Excited about the science demo.", "A little tired after recess."],
    [0.14, 0.16, "Settled in quickly.", "Finished the exit ticket early."],
    [0.12, 0.52, "Calm start to the day.", "Usual partner was absent and group work felt awkward."],
    [0.11, 0.17, "Chatty and ready to start.", "Proud of a finished project."],
    [0.13, 0.19, "Smooth drop-off.", "Enjoyed read-aloud."],
    [0.1, 0.14, "Good mood from the weekend plans.", "Relaxed end of day."],
  ],
  distress: [
    [0.7, 0.82, "Rough morning at home before school.", "Struggled to start the ratio task."],
    [0.9, 0.35, "Arrived upset and quiet.", "Lunch with a trusted adult helped; afternoon went better."],
    [0.88, 0.8, "Skipped breakfast and was short with others.", "Frustrated when a scaling problem did not work."],
    [0.92, 0.85, "Slow arrival; did not want to talk.", "Asked to leave the group during math."],
    [0.78, 0.25, "Anxious about a quiz.", "Quiz done and a favorite activity followed; relief showed."],
    [0.84, 0.88, "Tired and withdrawn.", "Stuck on scaling again and shut the notebook."],
    [0.8, 0.9, "Hard start after a weekend change.", "Overwhelmed by the exit ticket."],
  ],
  dip: [
    [0.35, 0.42, "Quiet at arrival; homework was left at home.", "Stayed on the first problem for most of the block."],
    [0.15, 0.22, "Cheerful, traded stickers at the door.", "Finished the exit ticket early."],
    [0.72, 0.18, "Arrived upset after an argument on the bus.", "Recovered after a short walk and a reset."],
    [0.2, 0.78, "Calm morning, helped set up.", "Ratio quiz came back; stopped trying scaling problems."],
    [0.48, 0.2, "Unsettled after a schedule change.", "Settled into partner work."],
    [0.55, 0.74, "Reported a short night of sleep.", "Focus faded during math and stayed low."],
    [0.9, 0.78, "Skipped breakfast; hard drop-off.", "Stuck on scaling again and asked to leave the group."],
  ],
  sparse: [[0.25, 0.62, "Settled in well.", "Said the afternoon task felt too long."]],
  crash: [
    [0.15, 0.62, "Cheerful and on time.", "Long worksheet right after lunch wore the day down."],
    [0.2, 0.7, "Ready to go.", "Disagreement with a classmate at recess carried into class."],
    [0.12, 0.3, "Smiling at the door.", "Mild fatigue after PE."],
    [0.18, 0.74, "Eager to share a story.", "Got a quiz back and went quiet."],
    [0.22, 0.5, "Good morning routine.", "Hungry before dismissal."],
    [0.1, 0.68, "Calm and focused.", "Fire drill broke the afternoon routine."],
    [0.14, 0.28, "Easy start.", "Recovered with a short movement break."],
  ],
  rebound: [
    [0.7, 0.25, "Missed the bus and arrived flustered.", "Settled once the day got going."],
    [0.62, 0.2, "Poor sleep; slow to warm up.", "Enjoyed hands-on math."],
    [0.4, 0.3, "A little unsure about a new seat.", "Comfortable with the new group."],
    [0.78, 0.35, "Upset about a family change.", "A quiet check-in at lunch helped."],
    [0.55, 0.15, "Worried about a presentation.", "Presentation went well."],
    [0.68, 0.28, "Grumpy after a long car ride.", "Warmed up during partner reading."],
    [0.3, 0.22, "Calm start.", "Happy to be at the end of the week."],
  ],
  swing: [
    [0.2, 0.8, "Great start and chatty.", "Conflict over a game at recess."],
    [0.75, 0.15, "Argument at home before school.", "Praised for a good question; mood lifted."],
    [0.3, 0.35, "Even and steady.", "Even and steady."],
    [0.15, 0.7, "Happy to see friends.", "Left out of a lunch table group."],
    [0.8, 0.5, "Worried about a test.", "Test over, but still uneasy."],
    [0.25, 0.25, "Relaxed morning.", "Steady afternoon."],
    [0.6, 0.18, "Slow start after a late night.", "Lively during the class game."],
  ],
};

const BLOCKS: { id: string; label: string; subject: string; seconds: number }[] = [
  { id: "hook", label: "Hook", subject: "hook", seconds: 130 },
  { id: "math", label: "Math", subject: "math", seconds: 190 },
  { id: "ela", label: "ELA", subject: "ela", seconds: 180 },
  { id: "science", label: "Science", subject: "science", seconds: 210 },
  { id: "social", label: "Social", subject: "social_studies", seconds: 195 },
  { id: "art", label: "Art", subject: "art", seconds: 175 },
];

function nodes(name: string, struggle: boolean): MasteryNode[] {
  const detail: MasteryDetail | null = struggle
    ? {
        concept: "Science",
        misconception: "Matched the wrong planet",
        rounds: "4 attempts",
        timeOnTask: "210 seconds",
        summary: `${name} kept matching the inner planet to the outer one.`,
      }
    : null;
  return BLOCKS.map((block) => {
    const slow = struggle && block.id === "science";
    return {
      id: block.id,
      label: block.label,
      subject: block.subject,
      attempts: slow ? 4 : 1,
      value: slow ? block.seconds : struggle ? block.seconds : 140,
      kind: slow ? "struggle" : "strength",
      detail: slow ? detail : null,
    };
  });
}

function build(shape: Shape, name: string): ProfileFixture {
  const dip = shape === "dip" || shape === "distress";
  const scores = {
    pace: [82, 78, 80, 76, 88],
    distress: [35, 22, 40, 30, 48],
    sparse: [60, 60, 60, 60, 60],
    dip: [65, 40, 55, 45, 80],
    crash: [70, 50, 65, 55, 72],
    rebound: [55, 70, 72, 68, 66],
    swing: [60, 52, 58, 56, 64],
  }[shape];
  const caption = {
    crash: "Afternoons are the hard part: look at what happens after lunch.",
    rebound: "Mornings start rough and afternoons recover.",
    swing: "Mood swings day to day: look at the red days.",
  } as Partial<Record<Shape, string>>;
  const mastery = nodes(name, dip);
  const shown = shape === "sparse" ? mastery.slice(0, 2) : mastery;
  const calm = (level: number): MasteryNode[] =>
    shown.map((node) => ({ ...node, value: level, kind: "strength", detail: null }));
  const dipped = shown;
  const weekLevels = dip ? [140, 145, 150, 210, 210] : [140, 142, 138, 141, 144];
  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const week = weekLevels.map((value, index) => {
    const drop = dip && index >= 3;
    return {
      id: `day-${index + 1}`,
      label: weekLabels[index] ?? "Fri",
      value,
      kind: drop ? ("struggle" as const) : ("strength" as const),
      detail: drop ? dipped.find((node) => node.detail)?.detail ?? null : null,
      blocks: drop ? dipped : calm(value),
    };
  });
  const monthLevels = dip ? [140, 145, 210, 210] : [140, 142, 138, 141];
  const monthLabels = ["Oct 6", "Oct 13", "Oct 20", "Oct 27"];
  const month = monthLevels.map((value, index) => {
    const drop = dip && index >= 2;
    return {
      id: `week-${index + 1}`,
      label: monthLabels[index] ?? "Oct 27",
      value,
      kind: drop ? ("struggle" as const) : ("strength" as const),
      detail: drop ? dipped.find((node) => node.detail)?.detail ?? null : null,
      blocks: drop ? dipped : calm(value),
    };
  });
  return {
    focusCaption:
      caption[shape] ??
      (dip ? "Focus: scaling ratios focus & frustration management." : "On pace across all domains."),
    zones: ZONE_LABELS.map((label, i) => ({
      label,
      score: scores[i] ?? 50,
      color: ZONE_COLORS[i] ?? "var(--ink)",
    })),
    checkIns: checks(SERIES[shape]),
    lesson: shown,
    mastery: { day: shown, week, month },
    intervention: {
      kicker: "Quick check",
      title: "Scaling ratios",
      minutes: "6 min",
      misconception: "Adds instead of multiplying when scaling",
      prompt: "A recipe uses 2 cups of flour for 6 cookies. How much flour for 36 cookies?",
      choices: ["6 cups", "12 cups", "18 cups", "36 cups"],
    },
  };
}

/** Fast or slow enough that the galaxy should mark them. Everyone else stays unmarked. */
export function galaxyPace(studentId: string, firstName?: string): "fast" | "slow" | null {
  const profile = profileFixture(studentId, firstName);
  if (profile.lesson.some((node) => node.kind === "struggle")) return "slow";
  const focus = profile.zones.find((zone) => zone.label === "Focus")?.score ?? 0;
  const engagement = profile.zones.find((zone) => zone.label === "Engagement")?.score ?? 0;
  if (focus >= 76 && engagement >= 76) return "fast";
  return null;
}

export function profileFixture(studentId: string, firstName?: string): ProfileFixture {
  const name = firstName?.trim() || "This student";
  const pin: Record<string, Shape> = {
    [DEMO_PROFILE_STUDENT_ID]: "dip",
    "stu_morgan": "distress",
    "stu_jamie": "distress",
    "stu_taylor": "sparse",
    // Rest of the demo class: mostly steady, a few with am/pm swings worth a look.
    stu_avery: "pace",
    stu_alex: "pace",
    stu_maya: "pace",
    stu_parker: "pace",
    stu_rowan: "pace",
    stu_sam: "pace",
    stu_cameron: "crash",
    stu_nico: "crash",
    stu_sage: "crash",
    stu_casey: "rebound",
    stu_quinn: "rebound",
    stu_drew: "swing",
    stu_riley: "swing",
    stu_skyler: "swing",
  };
  const shape: Shape =
    pin[studentId] ??
    (name.toLowerCase() === "jordan" ? "dip" : SHAPES[hashId(studentId) % SHAPES.length]!);
  return build(shape, name);
}

export function masteryView(
  nodes: MasteryNode[],
  filter: MasteryFilter,
): Array<MasteryNode & { dimmed: boolean }> {
  return nodes.map((node) => ({
    ...node,
    dimmed:
      (filter === "strengths" && node.kind === "struggle") ||
      (filter === "struggles" && node.kind === "strength"),
  }));
}

export type MoodCheckIn = {
  day: string;
  date: string;
  label: MoodLabel;
};

export function parseMoodCheckIn(value: unknown): MoodCheckIn | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { day?: unknown; date?: unknown; label?: unknown };
  if (typeof row.day !== "string" || !/^Day [1-8]$/.test(row.day)) return null;
  if (typeof row.date !== "string" || !/^\d{2}-\d{2}$/.test(row.date)) return null;
  if (typeof row.label !== "string" || !MOOD_LABELS.includes(row.label as MoodLabel)) {
    return null;
  }
  return { day: row.day, date: row.date, label: row.label as MoodLabel };
}

export function moodChatCfg(firstName: string, point: CheckInPoint): ActionChatCfg {
  const name = firstName.trim() || "this student";
  return {
    kicker: `SEL check-in · ${point.day} · ${point.date}`,
    title: `Address ${point.label.toLowerCase()}`,
    blurb: `Talk through this check-in with ${name}. Weaver drafts a move you can run. ${name} is not in this chat.`,
    placeholder: "What do you want to try with this check-in",
    footnote: "Draft only. This check-in chat is not saved onto the action-plan thread.",
    opening: point.reason
      ? `${name} checked in ${point.label.toLowerCase()} on ${point.day} (${point.slot === "am" ? "morning" : "afternoon"}). Possible context: ${point.reason} What do you want to do about that mood tomorrow?`
      : `${name} checked in ${point.label.toLowerCase()} on ${point.day}. What do you want to do about that mood tomorrow?`,
    prompts: [
      `Why might ${name} feel this way`,
      "What should I say at the door",
      "One move for tomorrow",
      "Help me name it without a diagnosis",
    ],
    replies: [
      {
        label: "Draft move",
        text: `${point.reason ? `Possible link: ${point.reason} ` : ""}Start from the mood ${name} marked, not from a past plan. You pick the words.`,
        steps: [
          `At the door, ask ${name} one yes/no question about how the work felt.`,
          "Offer a shorter first step before the rest of the task.",
          "You decide at the end of the block whether to keep that move.",
        ],
      },
      {
        text: "Updated from what you just wrote. Nothing here is a record of a student conversation.",
      },
    ],
  };
}
