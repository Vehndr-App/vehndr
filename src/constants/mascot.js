/**
 * Vehndr mascot animation assets (transparent GIFs in /public/mascot).
 * Drop welcome.gif / thinking.gif / responding.gif here when ready —
 * the launcher will pick them up via mood without redesigning the character.
 */
export const MASCOT_ANIMATIONS = {
  idle: "/mascot/idle.gif",
  idleStill: "/mascot/idle-still.png", // same artwork, first frame — for quiet/settled mode
  welcome: "/mascot/welcome.gif", // optional future
  thinking: "/mascot/thinking.gif", // optional future
  responding: "/mascot/responding.gif", // optional future
};

export const MASCOT_SPEECH = {
  idle: "Hi! Need a hand?",
};

/** Legacy localStorage key — cleared on load; permanent hide is no longer offered */
export const MASCOT_HIDDEN_KEY = "vehndr_mascot_hidden";

/** localStorage — bubble dismissed + animation paused (mascot still visible) */
export const MASCOT_SETTLED_KEY = "vehndr_mascot_settled";

/** Same-tab sync when hide/show/settle changes */
export const MASCOT_VISIBILITY_EVENT = "vehndr:mascot-visibility";

export function readMascotHidden() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MASCOT_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function readMascotSettled() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MASCOT_SETTLED_KEY) === "1";
  } catch {
    return false;
  }
}

function emitVisibility(detail) {
  try {
    window.dispatchEvent(new CustomEvent(MASCOT_VISIBILITY_EVENT, { detail }));
  } catch {
    /* ignore */
  }
}

export function writeMascotHidden(hidden) {
  if (typeof window === "undefined") return;
  try {
    if (hidden) window.localStorage.setItem(MASCOT_HIDDEN_KEY, "1");
    else window.localStorage.removeItem(MASCOT_HIDDEN_KEY);
  } catch {
    /* ignore quota / private mode */
  }
  emitVisibility({ hidden: !!hidden });
}

export function writeMascotSettled(settled) {
  if (typeof window === "undefined") return;
  try {
    if (settled) window.localStorage.setItem(MASCOT_SETTLED_KEY, "1");
    else window.localStorage.removeItem(MASCOT_SETTLED_KEY);
  } catch {
    /* ignore */
  }
  emitVisibility({ settled: !!settled });
}
