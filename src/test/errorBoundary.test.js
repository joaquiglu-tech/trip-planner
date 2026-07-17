import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import ErrorBoundary from "../shared/components/ErrorBoundary";

describe("ErrorBoundary.getDerivedStateFromError", () => {
  it("flags hasError and captures an Error's message", () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error("boom"))).toEqual({
      hasError: true,
      message: "boom",
    });
  });
  it("stringifies a non-Error throw", () => {
    expect(ErrorBoundary.getDerivedStateFromError("nope")).toEqual({
      hasError: true,
      message: "nope",
    });
  });
});

describe("ErrorBoundary render", () => {
  it("renders children when there is no error", () => {
    const html = renderToStaticMarkup(
      createElement(
        ErrorBoundary,
        null,
        createElement("p", null, "hello-child"),
      ),
    );
    expect(html).toContain("hello-child");
  });
});
