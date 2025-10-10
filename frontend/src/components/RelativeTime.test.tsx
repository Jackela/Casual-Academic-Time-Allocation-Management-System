import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

import RelativeTime from "./RelativeTime";

describe("RelativeTime", () => {
  const fixedNow = new Date("2025-01-10T12:00:00.000Z");

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("renders relative text with ISO tooltip and aria label", () => {
    const timestamp = "2025-01-10T09:00:00.000Z";

    render(<RelativeTime timestamp={timestamp} />);

    const element = screen.getByTitle((title) => title.includes(timestamp));
    const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
      numeric: "auto",
    });

    expect(element).toBeInTheDocument();
    expect(element).toHaveAttribute("tabindex", "0");
    expect(element.getAttribute("title")).toContain(timestamp);
    expect(element.getAttribute("data-tooltip")).toContain(timestamp);
    expect(element).toHaveAttribute("aria-label");
    expect(element).toHaveTextContent(relativeFormatter.format(-3, "hour"));
  });

  it("renders fallback for invalid timestamp", () => {
    render(<RelativeTime timestamp="invalid" fallback="--" />);

    expect(screen.getByText("--")).toBeInTheDocument();
  });
});
