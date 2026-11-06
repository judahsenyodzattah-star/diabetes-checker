import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Performance from "./Performance";
import { jsonResponse } from "../test/fixtures";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());
const mockMetrics = (body: unknown) => (fetch as ReturnType<typeof vi.fn>).mockImplementation(() => jsonResponse(body));

describe("Model performance page", () => {
  it("shows an informative empty state and no scores when none are supplied", async () => {
    mockMetrics({ available: false, error: null, metrics: null });
    render(<Performance />);
    expect(await screen.findByText("No evaluation results yet")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    // the explanations are still available
    expect(screen.getByText("False positive (FP)")).toBeInTheDocument();
    expect(screen.getByText("True negative (TN)")).toBeInTheDocument();
  });

  it("shows an invalid file as a problem, not as data", async () => {
    mockMetrics({ available: false, error: "metrics file is invalid (accuracy: too big)", metrics: null });
    render(<Performance />);
    expect(await screen.findByText("The metrics file has a problem")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders supplied confusion matrix and scores exactly", async () => {
    mockMetrics({
      available: true, error: null,
      metrics: { model_name: "Test model", evaluated_on: "test fixture", notes: null,
        confusion_matrix: { tn: 50, fp: 10, fn: 5, tp: 35 }, accuracy: 0.85, precision: 0.7778, recall: 0.875, f1: null },
    });
    render(<Performance />);
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByText("85.0%")).toBeInTheDocument();
    expect(screen.getByText("77.8%")).toBeInTheDocument();
    expect(screen.getByText("87.5%")).toBeInTheDocument();
    expect(screen.getByText("Not supplied")).toBeInTheDocument(); // f1 missing, not computed
    expect(screen.getByText("True positives (TP)").nextSibling).toHaveTextContent("35");
    expect(screen.getByText("False negatives (FN)").nextSibling).toHaveTextContent("5");
  });

  it("reports a network failure with retry", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError("fail"));
    render(<Performance />);
    expect(await screen.findByText(/Could not reach the prediction service/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
