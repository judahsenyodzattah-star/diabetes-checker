import { describe, expect, it } from "vitest";
import { featuresFixture } from "../test/fixtures";
import { validateField, validateForm } from "./validation";

const f = (name: string) => featuresFixture.features.find((x) => x.name === name)!;

const valid = {
  age: "45", sex: "female", blood_pressure: "120", cholesterol: "200", bmi: "27.5",
  smoker: "false", physical_activity: "4", family_history: "true", stress_level: "6", heart_disease: "false",
};

describe("validateField", () => {
  it("requires a value", () => expect(validateField(f("age"), "  ")).toBe("Enter a value."));
  it("rejects non-numeric text", () => {
    for (const bad of ["abc", "1e3", "12,5", "0x10", "--3", "4.", ".5"]) expect(validateField(f("bmi"), bad)).toMatch(/number/);
  });
  it("rejects decimals for integer fields", () => expect(validateField(f("age"), "40.5")).toBe("Enter a whole number."));
  it("enforces bounds inclusively", () => {
    expect(validateField(f("age"), "-1")).toBe("Must be at least 0.");
    expect(validateField(f("age"), "121")).toBe("Must be at most 120.");
    expect(validateField(f("age"), "0")).toBeNull();
    expect(validateField(f("age"), "120")).toBeNull();
    expect(validateField(f("bmi"), "80.1")).toBe("Must be at most 80.");
  });
  it("requires a choice for yes/no and category fields", () => {
    expect(validateField(f("smoker"), "")).toBe("Please choose an option.");
    expect(validateField(f("sex"), "other")).toMatch(/listed options/);
    expect(validateField(f("sex"), "male")).toBeNull();
  });
});

describe("validateForm", () => {
  it("builds a typed payload with exactly the model inputs", () => {
    const { errors, payload } = validateForm(featuresFixture.features, valid);
    expect(errors).toEqual({});
    expect(payload).toEqual({
      age: 45, sex: "female", blood_pressure: 120, cholesterol: 200, bmi: 27.5,
      smoker: false, physical_activity: 4, family_history: true, stress_level: 6, heart_disease: false,
    });
    expect(payload).not.toHaveProperty("diabetes");
  });
  it("reports every problem at once and builds no payload", () => {
    const { errors, payload } = validateForm(featuresFixture.features, { ...valid, age: "", smoker: "", bmi: "900" });
    expect(payload).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(["age", "bmi", "smoker"]);
  });
});
