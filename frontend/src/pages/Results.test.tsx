import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Results from "./Results";
import { demoResponse, featuresFixture } from "../test/fixtures";

const inputs = { age: 45, sex: "female", blood_pressure: 120, cholesterol: 200, bmi: 27.5, smoker: false, physical_activity: 4, family_history: true, stress_level: 6, heart_disease: false };

const at = (response: typeof demoResponse) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/results", state: { response, inputs, features: featuresFixture.features } }]}>
      <Results />
    </MemoryRouter>,
  );

describe("Results page", () => {
  it("asks to start a prediction when opened directly", () => {
    render(<MemoryRouter><Results /></MemoryRouter>);
    expect(screen.getByText("No result to show")).toBeInTheDocument();
  });

  it("handles a missing probability without inventing one", () => {
    at({ ...demoResponse, prediction: { label: "no_diabetes", positive_class: false, probability: null } });
    expect(screen.getByText("No diabetes", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText(/does not provide a probability/)).toBeInTheDocument();
    expect(screen.queryByRole("meter")).toBeNull();
  });

  it("does not show the demonstration banner for real model output, and gives no treatment advice", () => {
    at({ ...demoResponse, model: { ...demoResponse.model, mode: "real", is_demonstration: false, name: "Pipeline" } });
    expect(screen.queryByText(/Demonstration result/)).toBeNull();
    expect(screen.getByText("Predicted class")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b(medication|insulin|treatment plan|you should take)\b/i);
  });

  it("shows the entered values with friendly labels", () => {
    at(demoResponse);
    expect(screen.getByText("Family history of diabetes").nextSibling).toHaveTextContent("Yes");
    expect(screen.getByText("Body mass index (BMI)").nextSibling).toHaveTextContent("27.5 kg/m²");
  });
});
