export interface SaveWatchActions {
  readonly onFirstSaved: () => void;
  readonly onFirstUnsaved: () => void;
}

export type SaveListener = (persisted: boolean) => void;

export function saveWatch({ onFirstSaved, onFirstUnsaved }: SaveWatchActions): SaveListener {
  const saved = once(onFirstSaved);
  const unsaved = once(onFirstUnsaved);
  return (persisted) => (persisted ? saved() : unsaved());
}

function once(action: () => void): () => void {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    action();
  };
}
