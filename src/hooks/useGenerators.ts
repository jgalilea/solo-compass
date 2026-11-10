import { useCallback, useEffect, useRef, useState } from "react";
import { forgetDeletions, recordDeletions } from "../lib/deletions";
import {
  createGenerator,
  GeneratorsStorageError,
  loadGenerators,
  saveGeneratorChanges,
  sortGenerators,
  type Generator,
  type GeneratorDraft,
} from "../lib/generators";
import { announceChange, onExternalChange } from "../lib/sync";
import { useLocaleContext } from "./useLocaleContext";
import { useStoredList } from "./useStoredList";

export type GeneratorsStatus = "idle" | "loading" | "ready" | "error";

/**
 * The player's generators (see src/lib/generators.ts). Like their
 * tables, read only once a screen with tables asks for them (`load`).
 */
export function useGenerators() {
  const { t } = useLocaleContext();
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState<GeneratorsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const failSave = useCallback(
    (err: unknown) => setError(err instanceof GeneratorsStorageError ? err.message : t.history.genericSaveError),
    [t],
  );
  const save = useCallback(
    (prev: Generator[], next: Generator[]) => saveGeneratorChanges(t, prev, next).then(() => announceChange("generators")),
    [t],
  );
  const { items, version, setLoaded, update: updateStored } = useStoredList(save, failSave);
  // Changes before the stored generators are in would overwrite them with an empty list.
  const readyRef = useRef(false);

  const load = useCallback(() => {
    setRequested(true);
    setStatus((prev) => (prev === "idle" ? "loading" : prev));
  }, []);

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    loadGenerators(t)
      .then((loaded) => {
        if (cancelled) return;
        readyRef.current = true;
        setLoaded(loaded);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof GeneratorsStorageError ? err.message : t.history.genericLoadError);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [requested, setLoaded, t]);

  // Another tab changed them: read them again, if they're loaded here.
  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    function refresh() {
      if (!readyRef.current) return;
      const started = version.current;
      loadGenerators(t)
        .then((loaded) => {
          if (cancelled) return;
          if (version.current !== started) return refresh();
          setLoaded(loaded);
        })
        .catch(() => {
          // What's on screen stays.
        });
    }
    const stop = onExternalChange("generators", refresh);
    return () => {
      cancelled = true;
      stop();
    };
  }, [requested, setLoaded, t, version]);

  const update = useCallback(
    (updater: (prev: Generator[]) => Generator[]) => {
      if (readyRef.current) updateStored((prev) => sortGenerators(updater(prev)));
    },
    [updateStored],
  );

  const addGenerator = useCallback(
    (draft: GeneratorDraft): Generator => {
      const created = createGenerator(draft);
      update((prev) => [...prev, created]);
      return created;
    },
    [update],
  );

  const updateGenerator = useCallback(
    (id: string, draft: GeneratorDraft) => {
      update((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, name: draft.name.trim(), tableIds: [...new Set(draft.tableIds)], updatedAt: Date.now() } : x,
        ),
      );
    },
    [update],
  );

  const removeGenerator = useCallback(
    (id: string) => {
      update((prev) => prev.filter((x) => x.id !== id));
      recordDeletions([id]);
    },
    [update],
  );

  /** Puts a deleted generator (Undo) back. */
  const restoreGenerator = useCallback(
    (generator: Generator) => {
      forgetDeletions([generator.id]);
      update((prev) => (prev.some((x) => x.id === generator.id) ? prev : [...prev, generator]));
    },
    [update],
  );

  return { status, error, generators: items, load, addGenerator, updateGenerator, removeGenerator, restoreGenerator };
}
