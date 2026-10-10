/**
 * Shared contracts for Clairvoyance client lanes.
 *
 * RULE: UI (Lane A) only calls these functions. Do not invent parallel APIs
 * in components — extend these types/modules instead so merges stay clean.
 *
 * See docs/TEAM.md for ownership and "done when" criteria.
 */

/** Result of poking the necklace camera */
export type CameraTestResult = {
  ok: boolean;
  /** Human-readable detail for status UI / speech */
  detail: string;
};

/** High-level session states for the guide loop */
export type GuidePhase =
  | "idle"
  | "listening"
  | "transcribing"
  | "capturing"
  | "analyzing"
  | "speaking"
  | "error";

export type GuideSession = {
  phase: GuidePhase;
  /** Camera base URL, e.g. http://192.168.4.1 */
  cameraUrl: string;
  cameraOk: boolean | null;
  /** Last STT / typed question */
  question: string;
  /** Last AI (or stub) answer */
  answer: string;
  /** Error message when phase === "error" */
  error: string | null;
  /** Object URL or path for last snapshot preview */
  previewUrl: string | null;
};
