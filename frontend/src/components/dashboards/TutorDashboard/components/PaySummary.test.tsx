import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import PaySummary from "./PaySummary";
import { messages } from "../../../../i18n/messages";

describe("PaySummary", () => {
  it("renders Total Earnings label with AUD formatted value", () => {
    render(
      <PaySummary
        totalEarned={1234}
        thisWeekPay={250}
        averagePerTimesheet={123}
        paymentStatus={{}}
      />
    );

    const labelText = `${messages.tutorDashboard.totalEarnings}:`;
    const totalEarningsLabel = screen.getByText(labelText);

    expect(totalEarningsLabel).toBeInTheDocument();
    const totalEarningsRow = totalEarningsLabel.closest("div");

    expect(totalEarningsRow).not.toBeNull();
    expect(totalEarningsRow?.textContent).toMatch(/AUD/);
  });

  it("shows N/A when next payment date is not provided", () => {
    render(
      <PaySummary
        totalEarned={0}
        thisWeekPay={0}
        averagePerTimesheet={0}
        paymentStatus={{}}
      />,
    );

    expect(screen.getByText(/Next Payment Date: N\/A/i)).toBeInTheDocument();
  });

  it("formats next payment date when provided", () => {
    render(
      <PaySummary
        totalEarned={0}
        thisWeekPay={0}
        averagePerTimesheet={0}
        paymentStatus={{}}
        nextPaymentDate="2025-01-31"
      />,
    );

    expect(screen.getByText(/Next Payment Date:/i).textContent).toContain('31 Jan 2025');
  });
});
