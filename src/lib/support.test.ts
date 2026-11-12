import { describe, expect, it } from "vitest";
import { FEEDBACK_FORMS, feedbackUrl } from "./support";

describe("feedbackUrl", () => {
  it("opens the form in the player's language with the version and browser", () => {
    const url = new URL(feedbackUrl("en", "1.0.1 (abc1234)", "Mozilla/5.0 (X11; Linux) Firefox/150.0"));
    expect(`${url.origin}${url.pathname}`).toBe(FEEDBACK_FORMS.en);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      version: "1.0.1 (abc1234)",
      browser: "Mozilla/5.0 (X11; Linux) Firefox/150.0",
    });
  });

  it("has a form for each language", () => {
    expect(new URL(feedbackUrl("es", "1.0.1", "x")).pathname).toBe(new URL(FEEDBACK_FORMS.es).pathname);
    expect(FEEDBACK_FORMS.es).not.toBe(FEEDBACK_FORMS.en);
  });
});
