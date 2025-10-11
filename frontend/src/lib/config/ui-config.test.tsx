import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const MODULE_PATH = "./ui-config";

const mockServerModule = (factory?: () => Promise<unknown>) => {
  const fetchMock = vi.fn(factory ?? (() => Promise.resolve(null)));
  vi.doMock("./server-config", () => ({
    fetchTimesheetConstraints: fetchMock,
  }));
  return fetchMock;
};

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../validation/ajv");
  vi.doUnmock("./server-config");
  vi.clearAllMocks();
});

describe("ui-config", () => {
  it("falls back to defaults when schema loading fails", async () => {
    mockServerModule();
    vi.doMock("../validation/ajv", () => ({
      getTimesheetUiConstraints: vi.fn(() => {
        throw new Error("schema failure");
      }),
      setTimesheetValidatorConstraints: vi.fn(),
    }));

    const uiConfig = await import(MODULE_PATH);
    const { useUiConstraints } = uiConfig;

    expect(uiConfig.HOURS_MIN).toBe(0.25);
    expect(uiConfig.HOURS_MAX).toBe(60);
    expect(uiConfig.HOURS_STEP).toBe(0.25);
    expect(uiConfig.CURRENCY).toBe("AUD");
    expect(uiConfig.MONDAY_ONLY).toBe(true);

    const { result } = renderHook(() => useUiConstraints());

    await waitFor(() =>
      expect(result.current).toEqual({
        HOURS_MIN: 0.25,
        HOURS_MAX: 60,
        HOURS_STEP: 0.25,
        CURRENCY: "AUD",
        WEEK_START_DAY: 1,
        mondayOnly: true,
      }),
    );
  });

  it("returns memoized constraints sourced from schema", async () => {
    mockServerModule();

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
      setTimesheetValidatorConstraints: vi.fn(),
    }));

    const uiConfig = await import(MODULE_PATH);
    const { useUiConstraints } = uiConfig;

    const { result, rerender } = renderHook(() => useUiConstraints());
    await waitFor(() =>
      expect(result.current).toEqual({
        HOURS_MIN: 1,
        HOURS_MAX: 40,
        HOURS_STEP: 1,
        CURRENCY: "AUD",
        WEEK_START_DAY: 1,
        mondayOnly: false,
      }),
    );
    const firstRenderValue = result.current;
    rerender();

    expect(result.current).toBe(firstRenderValue);
    expect(getTimesheetUiConstraints).toHaveBeenCalledTimes(1);
  });

  it("applies server overrides when available", async () => {
    const fetchMock = mockServerModule(() =>
      Promise.resolve({
        hours: { max: 48 },
        weekStart: { mondayOnly: true },
      }),
    );

    vi.doMock("../validation/ajv", () => ({
      getTimesheetUiConstraints: vi.fn(() => ({
        hours: { min: 0.5, max: 60, step: 0.5 },
        weekStart: { mondayOnly: false },
        currency: "AUD",
      })),
      setTimesheetValidatorConstraints: vi.fn(),
    }));

    const uiConfig = await import(MODULE_PATH);
    const { useUiConstraints } = uiConfig;

    const { result } = renderHook(() => useUiConstraints());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.HOURS_MAX).toBe(48));
    expect(result.current.mondayOnly).toBe(true);

    await waitFor(() => expect(uiConfig.HOURS_MAX).toBe(48));
    expect(uiConfig.MONDAY_ONLY).toBe(true);
  });
});
