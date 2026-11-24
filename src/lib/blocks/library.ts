export const FACE = {
  start: { bg: "var(--pin-hook)", ink: "#2b2302", kicker: "Start" },
  try: { bg: "var(--pin-try)", ink: "#04243b", kicker: "Try" },
  check: { bg: "var(--pin-check)", ink: "#032b17", kicker: "Check" },
  next: { bg: "var(--pin-next)", ink: "#2a0b45", kicker: "Next" },
} as const;

export type BlockRole = keyof typeof FACE;

export type BlockEntry = {
  id: string;
  type: "text" | "image" | "video" | "audio" | "pbl" | "game";
  sub: string;
  role: BlockRole;
  title: string;
  instr: string;
  cta: string;
};

export const B: BlockEntry[] = [
  { id: "text.question", type: "text", sub: "Answer a question", role: "check", title: "Which shot count is right?", instr: "Pick the answer that matches equal parts.", cta: "Lock in my answer" },
  { id: "text.write", type: "text", sub: "Write out an answer", role: "check", title: "Say how you split it", instr: "Write how you know the parts are equal.", cta: "Turn it in" },
  { id: "text.read", type: "text", sub: "Read a section", role: "start", title: "Two rows at the arcade", instr: "Read the passage before moving on.", cta: "I read it" },
  { id: "text.instructions", type: "text", sub: "Instructions", role: "start", title: "Before you start", instr: "Tap each step as you get ready.", cta: "Ready" },
  { id: "image.draw", type: "image", sub: "Draw", role: "try", title: "Split the Moon", instr: "Draw a line to split the shape into 2 equal halves.", cta: "Save my drawing" },
  { id: "image.display", type: "image", sub: "Display", role: "start", title: "Look at the fuel cells", instr: "Notice how each side matches.", cta: "Got it" },
  { id: "image.art", type: "image", sub: "Art", role: "next", title: "Design your own patch", instr: "Pick a color and draw your Station Luna crest.", cta: "Add to the gallery" },
  { id: "image.meme", type: "image", sub: "Meme", role: "next", title: "Caption the mission", instr: "Type a top line and bottom line.", cta: "Post it" },
  { id: "video.reference", type: "video", sub: "Reference", role: "try", title: "How equal halves work", instr: "Watch as much as you need.", cta: "That helped" },
  { id: "video.instructions", type: "video", sub: "Instructions", role: "start", title: "Set up your board", instr: "Follow the three setup steps.", cta: "I'm set up" },
  { id: "video.story", type: "video", sub: "Story", role: "start", title: "Sunny and her sister on Station Luna", instr: "Watch the story hook to launch today's mission.", cta: "Start the lesson" },
  { id: "video.lesson", type: "video", sub: "Lesson", role: "try", title: "Equal parts in action", instr: "Watch and check along the way.", cta: "Finish the lesson" },
  { id: "audio.story", type: "audio", sub: "Story", role: "start", title: "Listen: Station Luna", instr: "Press play to hear the story.", cta: "I listened" },
  { id: "audio.question", type: "audio", sub: "Question", role: "check", title: "Explain your half", instr: "Say how you checked equal parts.", cta: "Send my answer" },
  { id: "audio.instructions", type: "audio", sub: "Instructions", role: "start", title: "What to get out", instr: "Listen to the setup cues.", cta: "Ready" },
  { id: "audio.music", type: "audio", sub: "Music", role: "try", title: "Work music", instr: "Loop calm focus music while you work.", cta: "Keep going" },
  { id: "pbl.social", type: "pbl", sub: "Social", role: "try", title: "Compare with your partner", instr: "One minute each. Share how you split your shape.", cta: "We both went" },
  { id: "pbl.manipulative", type: "pbl", sub: "Manipulative", role: "try", title: "Fold paper strips", instr: "Fold a strip into 2 equal halves.", cta: "Done folding" },
  { id: "pbl.project", type: "pbl", sub: "Project", role: "next", title: "Build the fuel counter", instr: "Check off your kit parts and build.", cta: "Turn in my build" },
  { id: "game.brain", type: "game", sub: "Brain game", role: "next", title: "Match the halves", instr: "Pair matching halves together.", cta: "Done playing" },
  { id: "game.viewer3d", type: "game", sub: "3D viewer", role: "try", title: "Count the cubes", instr: "Turn the block and count.", cta: "Submit my count" },
];

export const CHOICES = [
  { id: "a", text: "2 equal halves (same size)", ok: true },
  { id: "b", text: "2 unequal parts (one big, one small)", ok: false },
  { id: "c", text: "3 random pieces", ok: false },
];

const BY_ID = Object.fromEntries(B.map((entry) => [entry.id, entry]));

export function byId(id: string): BlockEntry {
  const entry = BY_ID[id];
  if (!entry) throw new Error(`Unknown block ${id}`);
  return entry;
}
