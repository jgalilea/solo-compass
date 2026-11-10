import { useSyncExternalStore } from "react";
import { currentAnnouncement, subscribeAnnouncement } from "../lib/announce";

/** The live region that reads out each roll's result (see announce.ts). */
export function Announcer() {
  const message = useSyncExternalStore(subscribeAnnouncement, currentAnnouncement);
  return (
    <div role="status" className="sr-only">
      {message && <span key={message.id}>{message.text}</span>}
    </div>
  );
}
