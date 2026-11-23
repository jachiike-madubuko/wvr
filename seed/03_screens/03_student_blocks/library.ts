export const FACE = {
  start: { bg: "var(--pin-hook)", ink: "var(--pin-hook-ink)", tint: "var(--pin-hook-tint)", kicker: "Start" },
  try: { bg: "var(--pin-try)", ink: "var(--pin-try-ink)", tint: "var(--pin-try-tint)", kicker: "Try" },
  check: { bg: "var(--pin-check)", ink: "var(--pin-check-ink)", tint: "var(--pin-check-tint)", kicker: "Check" },
  next: { bg: "var(--pin-next)", ink: "var(--pin-next-ink)", tint: "var(--pin-next-tint)", kicker: "Next" },
} as const;

export type BlockRole = keyof typeof FACE;

export type BlockEntry = {
  id: string;
  type: string;
  sub: string;
  role: BlockRole;
  title: string;
  instr: string;
  cta: string;
  completes: string;
  shape: string;
  dur?: number;
  h?: number;
};

export const B: BlockEntry[] = [
  { id: "text.question", type: "text", sub: "Answer a question", role: "check", title: "Which shot count is right?", instr: "Pick the number sentence that matches the two rows of shots.", cta: "Lock in my answer", completes: "One choice picked, then confirmed. Wrong answers are kept and shown to the teacher, not scored in front of the kid.", shape: "{ type: 'text', subtype: 'question', choiceId, correct: bool, tries: int }", h: 150 },
  { id: "text.write", type: "text", sub: "Write out an answer", role: "check", title: "Say how you added them", instr: "Write the number sentence you used, then say why it works.", cta: "Turn it in", completes: "15 words or more. No spellcheck, no auto-correct — the teacher reads the kid's own words.", shape: "{ type: 'text', subtype: 'write', body: string, words: int }", h: 170 },
  { id: "text.read", type: "text", sub: "Read a section", role: "start", title: "Two rows at the arcade", instr: "Read the whole thing. The button turns on when you reach the end.", cta: "I read it", completes: "Scrolled to 90% of the passage. Scroll depth is the only signal — nothing is timed.", shape: "{ type: 'text', subtype: 'read', depth: 0..1 }", h: 180 },
  { id: "text.instructions", type: "text", sub: "Instructions", role: "start", title: "Before you start", instr: "Tap each line as you do it. All four turn on the button.", cta: "Ready", completes: "Every step checked. Steps are tappable, never a single wall of text.", shape: "{ type: 'text', subtype: 'instructions', done: [stepId] }", h: 160 },
  { id: "image.draw", type: "image", sub: "Draw", role: "try", title: "Draw the two rows", instr: "Draw 8 buttons, then 8 more under them. Count as you go.", cta: "Save my drawing", completes: "At least one stroke. Undo and Clear are always available; nothing is auto-graded.", shape: "{ type: 'image', subtype: 'draw', strokes: int, png: dataUrl }", h: 190 },
  { id: "image.display", type: "image", sub: "Display", role: "start", title: "Look at this cabinet", instr: "Count the buttons on the panel before you scroll on.", cta: "Got it", completes: "Tapped through. A Display block never asks for input — it is the hook.", shape: "{ type: 'image', subtype: 'display', seen: bool }", h: 160 },
  { id: "image.art", type: "image", sub: "Art", role: "next", title: "Design your own cabinet", instr: "Pick a colour and a brush. Make it yours.", cta: "Add to the gallery", completes: "One stroke minimum. This is the open-ended cousin of Draw — no right answer.", shape: "{ type: 'image', subtype: 'art', strokes: int, palette: [hex], png: dataUrl }", h: 190 },
  { id: "image.meme", type: "image", sub: "Meme", role: "next", title: "Caption the boss fight", instr: "Type a top line and a bottom line. Keep it kind.", cta: "Post it", completes: "Both lines have text. Captions are teacher-visible before they hit the class gallery.", shape: "{ type: 'image', subtype: 'meme', top: string, bottom: string, imageId }", h: 170 },
  { id: "video.reference", type: "video", sub: "Reference", role: "try", title: "How ten-frames work", instr: "Watch as much as you need. Loop it if it helps.", cta: "That helped", completes: "No watch requirement — reference is a lifeline, not an assignment.", shape: "{ type: 'video', subtype: 'reference', watched: 0..1, loops: int }", dur: 42, h: 168 },
  { id: "video.instructions", type: "video", sub: "Instructions", role: "start", title: "Set up your board", instr: "Three chapters. Jump to the one you need.", cta: "I'm set up", completes: "Chapters visited or 80% watched, whichever comes first.", shape: "{ type: 'video', subtype: 'instructions', chapters: [id], watched: 0..1 }", dur: 70, h: 180 },
  { id: "video.story", type: "video", sub: "Story", role: "start", title: "The arcade that ran out of tokens", instr: "Watch the whole story. Captions if you want them.", cta: "Start the lesson", completes: "90% watched. The hook is the one place we ask for full attention.", shape: "{ type: 'video', subtype: 'story', watched: 0..1, captions: bool }", dur: 6, h: 168 },
  { id: "video.lesson", type: "video", sub: "Lesson", role: "try", title: "Adding two rows", instr: "It pauses halfway to ask you one thing.", cta: "Finish the lesson", completes: "Reached the end, checkpoint answered. Speed control is allowed; skipping is not.", shape: "{ type: 'video', subtype: 'lesson', watched: 0..1, rate, checkpoint: answer }", dur: 260, h: 190 },
  { id: "audio.story", type: "audio", sub: "Story", role: "start", title: "Listen: token trouble", instr: "Press play. Turn on read-along if you want the words.", cta: "I listened", completes: "90% played. Read-along shows the same text a Read block would.", shape: "{ type: 'audio', subtype: 'story', played: 0..1, readAlong: bool }", dur: 128, h: 160 },
  { id: "audio.question", type: "audio", sub: "Question", role: "check", title: "Say how you added", instr: "Hear the question, then record your answer out loud.", cta: "Send my answer", completes: "One take recorded. Re-record as many times as you like; only the last take is sent.", shape: "{ type: 'audio', subtype: 'question', take: blob, seconds: int, retakes: int }", dur: 12, h: 160 },
  { id: "audio.instructions", type: "audio", sub: "Instructions", role: "start", title: "What to get out", instr: "The steps light up as you hear them.", cta: "Ready", completes: "Played to the end. Steps stay on screen after the audio stops.", shape: "{ type: 'audio', subtype: 'instructions', played: 0..1 }", dur: 34, h: 160 },
  { id: "audio.music", type: "audio", sub: "Music", role: "try", title: "Work music", instr: "Loop it while you build. Volume is yours.", cta: "Keep going", completes: "Never gates. Music is ambience — the pin completes on its own.", shape: "{ type: 'audio', subtype: 'music', volume: 0..100, loop: bool }", dur: 180, h: 140 },
  { id: "pbl.social", type: "pbl", sub: "Social", role: "try", title: "Compare with your partner", instr: "One minute each. Say your number sentence, then listen.", cta: "We both went", completes: "Both prompts checked and both turns taken. Off-device work, on-device timer.", shape: "{ type: 'pbl', subtype: 'social', turns: 2, prompts: [id], partnerSeat }", h: 170 },
  { id: "pbl.manipulative", type: "pbl", sub: "Manipulative", role: "try", title: "Build 24 with blocks", instr: "Use ten rods and one cubes. Tap a block to take it back.", cta: "That's 24", completes: "Total equals the target. Works with real base-ten blocks — the screen is a mirror.", shape: "{ type: 'pbl', subtype: 'manipulative', tens: int, ones: int, target: int }", h: 210 },
  { id: "pbl.project", type: "pbl", sub: "Project", role: "next", title: "Build the token counter", instr: "Check off the kit parts, do the three steps, photograph it.", cta: "Turn in my build", completes: "All materials checked, all steps done, one photo attached.", shape: "{ type: 'pbl', subtype: 'project', materials: [id], steps: [id], photo: imageId }", h: 200 },
  { id: "game.brain", type: "game", sub: "Brain game", role: "next", title: "Match the totals", instr: "Tap a number, then tap a sentence that makes it.", cta: "Done playing", completes: "All three pairs matched. Taps are counted, never timed.", shape: "{ type: 'game', subtype: 'brain', pairs: 3, taps: int, ms: int }", h: 190 },
  { id: "game.viewer3d", type: "game", sub: "3D viewer", role: "try", title: "How many cubes?", instr: "Drag to turn the block. Count what you can't see too.", cta: "Submit my count", completes: "A number typed in. The correct answer is 24; a wrong one still submits.", shape: "{ type: 'game', subtype: 'viewer3d', guess: int, rotations: int }", h: 170 },
];

export const CHOICES = [
  { id: "a", text: "8 + 8 = 16", ok: true },
  { id: "b", text: "8 + 6 = 14", ok: false },
  { id: "c", text: "8 × 8 = 64", ok: false },
  { id: "d", text: "16 + 8 = 24", ok: false },
];

export const FLOW = ["video.story", "pbl.manipulative", "image.draw", "text.question", "audio.question", "game.brain"];

const BY_ID = Object.fromEntries(B.map((entry) => [entry.id, entry]));

export function byId(id: string): BlockEntry {
  const entry = BY_ID[id];
  if (!entry) throw new Error(`Unknown block ${id}`);
  return entry;
}

export function lessonBlocks(): BlockEntry[] {
  return FLOW.map(byId);
}
