/** A user counts as "online" if their last heartbeat is newer than this. */
export const ONLINE_WINDOW_SECONDS = 150;

/** How often a signed-in, visible tab pings the server (20s for real-time god-mode radar). */
export const HEARTBEAT_INTERVAL_MS = 20_000;

const PATH_LABELS: [prefix: string, label: string][] = [
  ["/grade", "Essay Grader (Marking Script)"],
  ["/essay/", "Reviewing Graded Essay"],
  ["/live-examiner", "Live Examiner (Drafting Essay)"],
  ["/response-structure", "Response Structure Planner"],
  ["/practice", "AO Skills Coach"],
  ["/essay-generator", "Essay Model Generator"],
  ["/diagrams", "Diagram Library"],
  ["/question-bank", "Question Bank"],
  ["/mcq-live", "MCQ Exam Live Session"],
  ["/mcq", "MCQ Past Papers"],
  ["/classes", "Classrooms & Assignments"],
  ["/review", "Teacher Review Panel"],
  ["/dashboard", "Student Dashboard"],
  ["/knowledge", "Knowledge Base"],
  ["/calibration", "Examiner Calibration"],
  ["/content-admin", "Content Admin"],
  ["/mcq-papers-admin", "MCQ Paper Library"],
  ["/admin", "Admin God Mode Console"],
  ["/settings", "User Settings"],
  ["/pricing", "Pricing & Plans"],
  ["/showcase", "Exemplar Showcase"],
];

/** Turns a route path into a human "what are they doing" label. */
export function describePath(path: string | null | undefined): string {
  if (!path) return "—";
  const hit = PATH_LABELS.find(([prefix]) => path.startsWith(prefix));
  return hit ? hit[1] : path;
}
