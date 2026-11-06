import type { FeaturesResponse, PredictionResponse } from "../api/types";

const yn = [{ value: true, label: "Yes" }, { value: false, label: "No" }];

export const featuresFixture: FeaturesResponse = {
  provisional: true,
  notice: "Units, category values and input limits are provisional.",
  features: [
    { name: "age", label: "Age", type: "integer", unit: "years", min: 0, max: 120, step: 1, help: "Age in whole years." },
    { name: "sex", label: "Sex", type: "category", help: "Sex.", options: [{ value: "female", label: "Female" }, { value: "male", label: "Male" }] },
    { name: "blood_pressure", label: "Blood pressure", type: "number", min: 30, max: 300, step: 1, help: "bp" },
    { name: "cholesterol", label: "Cholesterol", type: "number", min: 50, max: 600, step: 1, help: "chol" },
    { name: "bmi", label: "Body mass index (BMI)", type: "number", unit: "kg/m²", min: 10, max: 80, step: 0.1, help: "bmi" },
    { name: "smoker", label: "Smoker", type: "boolean", options: yn, help: "smoker" },
    { name: "physical_activity", label: "Physical activity score", type: "number", unit: "score", min: 0, max: 10, step: 1, help: "pa" },
    { name: "family_history", label: "Family history of diabetes", type: "boolean", options: yn, help: "fh" },
    { name: "stress_level", label: "Stress level score", type: "number", unit: "score", min: 0, max: 10, step: 1, help: "stress" },
    { name: "heart_disease", label: "Heart disease", type: "boolean", options: yn, help: "hd" },
  ],
};

export const demoResponse: PredictionResponse = {
  request_id: "11111111-2222-3333-4444-555555555555",
  prediction: { label: "diabetes", positive_class: true, probability: 0.6454 },
  model: { mode: "mock", name: "Mock demonstration adapter (not a trained model)", version: "mock", is_demonstration: true },
  disclaimer: "DEMONSTRATION ONLY: sample. It is not a medical diagnosis.",
};

export function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}
