import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { Adventure } from "../lib/journal";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "../lib/journalUi";
import {
  IconCheck,
  IconChevronRight,
  IconClose,
  IconFeather,
  IconGripVertical,
  IconPlus,
  IconSearch,
  IconStar,
  IconUpload,
} from "./icons/Icons";

/**
 * Lista de aventuras del diario. El contenido de cada una (sesiones,
 * composer…) vive en AdventureDetailView (/diario/:adventureId) — así
 * esta pantalla se queda ligera aunque haya muchas aventuras, y nunca
 * desplaza nada fuera de sitio.
 */
export function JournalListView() {
  const {
    status,
    error,
    adventures,
    activeAdventureId,
    setActiveAdventureId,
    createAdventure,
    reorderAdventures,
    toggleAdventureFavorite,
    importAdventure,
    retry,
  } = useJournalContext();
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [newAdventureName, setNewAdventureName] = useState("");
  const [showNewAdventureForm, setShowNewAdventureForm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Orden de visualización manual (drag and drop), solo para
  // aventuras no archivadas. Se sincroniza con `adventures` pero
  // preserva el orden manual — los ids nuevos se añaden al principio.
  const [order, setOrder] = useState<string[]>(() =>
    adventures.filter((c) => c.status !== "archived").map((c) => c.id),
  );
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);
  useEffect(() => {
    setOrder((prev) => {
      const ids = adventures.filter((c) => c.status !== "archived").map((c) => c.id);
      const idSet = new Set(ids);
      const kept = prev.filter((id) => idSet.has(id));
      const added = ids.filter((id) => !prev.includes(id));
      const next = [...added, ...kept];
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      return next;
    });
  }, [adventures]);

  const byId = useMemo(() => new Map(adventures.map((c) => [c.id, c])), [adventures]);

  const query = search.trim().toLowerCase();
  function matchesQuery(c: Adventure): boolean {
    return !query || c.name.toLowerCase().includes(query);
  }

  const orderedActive = order
    .map((id) => byId.get(id))
    .filter((c): c is Adventure => !!c && c.status !== "archived" && matchesQuery(c));
  const pinned = orderedActive.filter((c) => c.favorite);
  const rest = orderedActive.filter((c) => !c.favorite);

  const archivedAdventures = adventures.filter((c) => c.status === "archived" && matchesQuery(c));
  const showArchivedContents = archivedExpanded || query !== "";

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (!draggingId) return;
    // Una aventura solo cambia de posición dentro de su propio grupo
    // (favoritas / resto) — así "pineadas al principio" es siempre
    // cierto, arrastrar nunca puede sacarla de su grupo.
    const draggingFavorite = byId.get(draggingId)?.favorite ?? false;

    function handleMove(e: PointerEvent) {
      const y = e.clientY;
      let targetId: string | null = null;
      for (const [id, el] of rowRefs.current) {
        if (id === draggingId) continue;
        if ((byId.get(id)?.favorite ?? false) !== draggingFavorite) continue;
        const rect = el.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          targetId = id;
          break;
        }
      }
      if (targetId) {
        const current = orderRef.current;
        const from = current.indexOf(draggingId as string);
        const to = current.indexOf(targetId);
        if (from !== -1 && to !== -1 && from !== to) {
          const next = [...current];
          next.splice(from, 1);
          next.splice(to, 0, draggingId as string);
          orderRef.current = next;
          setOrder(next);
        }
      }
    }

    function handleUp() {
      setDraggingId(null);
      reorderAdventures(orderRef.current);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingId, byId, reorderAdventures]);

  function handleCreateAdventure() {
    if (!newAdventureName.trim()) return;
    const adventure = createAdventure(newAdventureName);
    setActiveAdventureId(adventure.id);
    setNewAdventureName("");
    setShowNewAdventureForm(false);
    navigate(`/diario/${adventure.id}`);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const name = file.name.replace(/\.md$/i, "");
      const adventure = importAdventure(name, text);
      setActiveAdventureId(adventure.id);
      navigate(`/diario/${adventure.id}`);
      setImportError(null);
    } catch {
      setImportError(t.journal.importError);
    }
  }

  const hasAnyAdventures = adventures.length > 0;
  const hasVisibleResults = pinned.length > 0 || rest.length > 0 || archivedAdventures.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="text-center">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">
          {t.journal.title}
        </h1>
        <p className="mt-2 text-sm text-parchment-dim">{t.journal.subtitle}</p>
      </header>

      {status === "loading" && <LoadingState label={t.journal.loading} />}

      {status === "error" && (
        <ErrorState title={t.journal.loadErrorTitle} description={error ?? undefined} onRetry={retry} />
      )}

      {status === "ready" && (
        <>
          {hasAnyAdventures && (
            <div className="relative flex">
              <IconSearch
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-dim/50"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.journal.searchPlaceholder}
                aria-label={t.journal.searchLabel}
                className={`${INPUT_CLASS} w-full pl-10 ${search ? "pr-10" : ""}`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label={t.common.close}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-parchment-dim/60 transition hover:text-parchment"
                >
                  <IconClose size={15} />
                </button>
              )}
            </div>
          )}

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
                {t.journal.adventuresHeading}
              </h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="-m-2 flex items-center gap-1.5 p-2 text-sm text-parchment-dim transition hover:text-gold"
              >
                <IconUpload size={16} />
                {t.journal.importButton}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,text/markdown,text/plain"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>

            {importError && <p className="text-sm text-no">{importError}</p>}

            {!hasAnyAdventures && !showNewAdventureForm && (
              <EmptyState
                icon={<IconFeather size={24} />}
                title={t.journal.noAdventuresTitle}
                description={t.journal.noAdventuresDescription}
                compact
              />
            )}

            {hasAnyAdventures && !hasVisibleResults && (
              <EmptyState
                icon={<IconSearch size={22} />}
                title={t.journal.noSearchResultsTitle}
                description={interpolate(t.journal.noSearchResultsDescription, { query: search.trim() })}
                compact
              />
            )}

            {(pinned.length > 0 || rest.length > 0) && (
              <ul className="flex flex-col gap-2.5">
                {[...pinned, ...rest].map((adventure) => (
                  <AdventureRow
                    key={adventure.id}
                    adventure={adventure}
                    isActive={adventure.id === activeAdventureId}
                    isDragging={draggingId === adventure.id}
                    rowRef={(el) => {
                      if (el) rowRefs.current.set(adventure.id, el);
                      else rowRefs.current.delete(adventure.id);
                    }}
                    onDragStart={() => setDraggingId(adventure.id)}
                    onToggleFavorite={() => toggleAdventureFavorite(adventure.id)}
                    t={t}
                  />
                ))}
              </ul>
            )}

            {showNewAdventureForm ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newAdventureName}
                  onChange={(e) => setNewAdventureName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateAdventure()}
                  placeholder={t.journal.newAdventurePlaceholder}
                  className={INPUT_CLASS}
                />
                <button type="button" onClick={handleCreateAdventure} className={PRIMARY_BUTTON_CLASS}>
                  {t.journal.createButton}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewAdventureForm(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-ink-border py-3 text-base text-parchment-dim transition hover:border-gold/50 hover:text-gold"
              >
                <IconPlus size={16} />
                {t.journal.newAdventure}
              </button>
            )}

            {hasAnyAdventures && !activeAdventureId && (
              <p className="text-center text-sm text-parchment-dim/70">
                {t.journal.noActiveAdventureNote}
              </p>
            )}
          </section>

          {archivedAdventures.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setArchivedExpanded((v) => !v)}
                aria-expanded={showArchivedContents}
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim transition hover:text-parchment"
              >
                <IconChevronRight
                  size={14}
                  className={`shrink-0 transition-transform ${showArchivedContents ? "rotate-90" : ""}`}
                />
                {t.journal.archivedHeading}
                <span className="text-parchment-dim/50">{archivedAdventures.length}</span>
              </button>
              {showArchivedContents && (
                <ul className="flex flex-col gap-2.5">
                  {archivedAdventures.map((adventure) => (
                    <li key={adventure.id}>
                      <Link
                        to={`/diario/${adventure.id}`}
                        className="flex items-center gap-2 rounded-2xl border border-ink-border bg-ink-800/30 p-4 opacity-70 transition hover:opacity-100"
                      >
                        <span className="min-w-0 flex-1 truncate text-base font-medium text-parchment">
                          {adventure.name}
                        </span>
                        <StatusBadge isArchived t={t} />
                        <IconChevronRight size={16} className="shrink-0 text-parchment-dim/40" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// "Pausada" no es un estado guardado: es solo cómo se ve cualquier
// aventura en curso que no es la activa ahora mismo — de ahí que este
// componente reciba booleanos ya calculados, no el status en crudo.
function StatusBadge({
  isPaused = false,
  isArchived = false,
  t,
}: {
  isPaused?: boolean;
  isArchived?: boolean;
  t: { journal: { statusPaused: string; statusArchived: string } };
}) {
  if (!isPaused && !isArchived) return null;
  return (
    <span className="shrink-0 rounded-full border border-ink-border px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-parchment-dim">
      {isArchived ? t.journal.statusArchived : t.journal.statusPaused}
    </span>
  );
}

function AdventureRow({
  adventure,
  isActive,
  isDragging,
  rowRef,
  onDragStart,
  onToggleFavorite,
  t,
}: {
  adventure: Adventure;
  isActive: boolean;
  isDragging: boolean;
  rowRef: (el: HTMLLIElement | null) => void;
  onDragStart: () => void;
  onToggleFavorite: () => void;
  t: ReturnType<typeof useLocaleContext>["t"];
}) {
  return (
    <li
      ref={rowRef}
      style={isDragging ? { opacity: 0.5 } : undefined}
      className={[
        "flex items-center gap-1 rounded-2xl border p-2",
        isActive ? "border-gold/50 bg-gold/[0.06]" : "border-ink-border bg-ink-800/50",
      ].join(" ")}
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          onDragStart();
        }}
        aria-label={t.journal.dragHandle}
        style={{ touchAction: "none" }}
        className="-m-1 shrink-0 cursor-grab p-3 text-parchment-dim/40 active:cursor-grabbing"
      >
        <IconGripVertical size={18} />
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={adventure.favorite}
        aria-label={adventure.favorite ? t.journal.favoriteRemove : t.journal.favoriteAdd}
        className={[
          "-m-1 shrink-0 p-3 transition",
          adventure.favorite ? "text-gold" : "text-parchment-dim/40 hover:text-gold",
        ].join(" ")}
      >
        <IconStar size={16} filled={adventure.favorite} />
      </button>
      <Link
        to={`/diario/${adventure.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 px-1 py-2.5"
      >
        <span className="min-w-0 flex-1 truncate text-base font-medium text-parchment">
          {adventure.name}
        </span>
        <StatusBadge isPaused={!isActive} t={t} />
        {isActive && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-gold">
            <IconCheck size={12} />
            {t.journal.activeLabel}
          </span>
        )}
        <IconChevronRight size={16} className="shrink-0 text-parchment-dim/40" />
      </Link>
    </li>
  );
}
