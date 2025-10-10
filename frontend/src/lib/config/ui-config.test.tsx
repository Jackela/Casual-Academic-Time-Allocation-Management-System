import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const MODULE_PATH = "./ui-config";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../validation/ajv");
  vi.clearAllMocks();
});

describe("ui-config", () => {
  it("falls back to defaults when schema loading fails", async () => {
    vi.doMock("../validation/ajv", () => ({
      getTimesheetUiConstraints: vi.fn(() => {
        throw new Error("schema failure");
      }),
    }));

    const uiConfig = await import(MODULE_PATH);
    const { useUiConstraints } = uiConfig;

    expect(uiConfig.HOURS_MIN).toBe(0.25);
    expect(uiConfig.HOURS_MAX).toBe(60);
    expect(uiConfig.HOURS_STEP).toBe(0.25);
    expect(uiConfig.CURRENCY).toBe("AUD");
    expect(uiConfig.MONDAY_ONLY).toBe(true);

    const { result } = renderHook(() => useUiConstraints());
    expect(result.current).toEqual({
      HOURS_MIN: 0.25,
      HOURS_MAX: 60,
      HOURS_STEP: 0.25,
      CURRENCY: "AUD",
      WEEK_START_DAY: 1,
      mondayOnly: true,
    });
  });

  it("returns memoized constraints sourced from schema", async () => {
    const schemaConstraints = {
      hours: {
        min: 1,
        max: 40,
        step: 1,
      },
      weekStart: {
        mondayOnly: false,
      },
      currency: "AUD",
    } as const;

    const getTimesheetUiConstraints = vi.fn(() => schemaConstraints);

    vi.doMock("../validation/ajv", () => ({
      getTimesheetUiConstraints,
    }));

    const uiConfig = await import(MODULE_PATH);
    const { useUiConstraints } = uiConfig;

    const { result, rerender } = renderHook(() => useUiConstraints());
    const firstRenderValue = result.current;
    rerender();

    expect(result.current).toBe(firstRenderValue);
    expect(result.current).toEqual({
      HOURS_MIN: 1,
      HOURS_MAX: 40,
      HOURS_STEP: 1,
      CURRENCY: "AUD",
      WEEK_START_DAY: 1,
      mondayOnly: false,
    });
    expect(getTimesheetUiConstraints).toHaveBeenCalledTimes(1);
  });
});
