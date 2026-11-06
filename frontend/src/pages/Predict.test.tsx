import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Predict from "./Predict";
import Results from "./Results";
import { demoResponse, featuresFixture, jsonResponse } from "../test/fixtures";

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/predict"]}>
      <Routes>
        <Route path="/predict" element={<Predict />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Age/), "45");
  await user.click(screen.getByLabelText("Female"));
  await user.type(screen.getByLabelText(/^Blood pressure/), "120");
  await user.type(screen.getByLabelText(/^Cholesterol/), "200");
  await user.type(screen.getByLabelText(/^Body mass index/), "27.5");
  await user.type(screen.getByLabelText(/^Physical activity score/), "4");
  await user.type(screen.getByLabelText(/^Stress level score/), "6");
  for (const group of ["Smoker", "Family history of diabetes", "Heart disease"]) {
    const fs = screen.getByRole("group", { name: group });
    await user.click(within(fs).getByLabelText(group === "Family history of diabetes" ? "Yes" : "No"));
  }
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("Prediction page", () => {
  it("renders the ten inputs and no diabetes field", async () => {
    fetchMock.mockImplementation(() => jsonResponse(featuresFixture));
    renderApp();
    await screen.findByRole("button", { name: "Get prediction" });
    expect(screen.queryByLabelText(/^diabetes$/i)).toBeNull();
    expect(document.querySelectorAll("input[type=text]").length).toBe(6);
    expect(screen.getByText(/Provisional input definitions/)).toBeInTheDocument();
  });

  it("shows an error summary and does not call the API when the form is invalid", async () => {
    fetchMock.mockImplementation(() => jsonResponse(featuresFixture));
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Get prediction" }));
    const summary = screen.getByRole("alert");
    expect(summary).toHaveTextContent("Please fix the following");
    expect(summary).toHaveTextContent("Age: Enter a value.");
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the features request
    expect(screen.getByLabelText(/^Age/)).toHaveAttribute("aria-invalid", "true");
  });

  it("shows inline range errors on blur", async () => {
    fetchMock.mockImplementation(() => jsonResponse(featuresFixture));
    const user = userEvent.setup();
    renderApp();
    await user.type(await screen.findByLabelText(/^Age/), "200");
    await user.tab();
    expect(await screen.findByText("Must be at most 120.")).toBeInTheDocument();
  });

  it("submits typed JSON, shows a loading state, then the results page labelled as demonstration", async () => {
    let release: (r: Response) => void = () => {};
    fetchMock.mockImplementation((url: string) =>
      url.includes("/features")
        ? jsonResponse(featuresFixture)
        : new Promise<Response>((res) => (release = res)),
    );
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("button", { name: "Get prediction" });
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Get prediction" }));

    const busy = await screen.findByRole("button", { name: /Getting prediction/ });
    expect(busy).toBeDisabled();

    const [, init] = fetchMock.mock.calls.find((c) => String(c[0]).includes("/predict"))!;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      age: 45, sex: "female", blood_pressure: 120, cholesterol: 200, bmi: 27.5,
      smoker: false, physical_activity: 4, family_history: true, stress_level: 6, heart_disease: false,
    });

    release(new Response(JSON.stringify(demoResponse), { status: 200 }));
    expect(await screen.findByRole("heading", { name: "Your result" })).toBeInTheDocument();
    expect(screen.getByText(/Demonstration result/)).toBeInTheDocument();
    expect(screen.getByText("Diabetes", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText("64.5%", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/This is not a diagnosis/)).toBeInTheDocument();
  });

  it("maps backend validation errors back onto fields", async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes("/features")
        ? jsonResponse(featuresFixture)
        : jsonResponse({ error: { code: "VALIDATION_ERROR", message: "Some inputs are missing or invalid.", fields: [{ field: "bmi", message: "Must be at most 80." }] } }, 422),
    );
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("button", { name: "Get prediction" });
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Get prediction" }));
    expect(await screen.findByText("Must be at most 80.", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Body mass index/)).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the explicit model-unavailable error from the server", async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes("/features")
        ? jsonResponse(featuresFixture)
        : jsonResponse({ error: { code: "MODEL_UNAVAILABLE", message: "MODEL_MODE is 'real' but the model could not be loaded.", fields: [] } }, 503),
    );
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("button", { name: "Get prediction" });
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Get prediction" }));
    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your result" })).toBeNull();
    expect(screen.getByRole("button", { name: "Get prediction" })).toBeEnabled();
  });

  it("shows a helpful message and retry when the backend is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderApp();
    expect(await screen.findByText(/Could not reach the prediction service/)).toBeInTheDocument();
    fetchMock.mockImplementation(() => jsonResponse(featuresFixture));
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Get prediction" })).toBeInTheDocument());
  });
});
