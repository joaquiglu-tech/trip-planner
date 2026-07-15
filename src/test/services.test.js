import { describe, it, expect } from "vitest";
import { extractXoteloKey } from "../services/xotelo";
import { fileExt, storagePath } from "../services/storage";

// M48 — extract the Xotelo key from a TripAdvisor URL.
describe("extractXoteloKey (M48)", () => {
  it("extracts the full g#-d# key", () => {
    expect(
      extractXoteloKey(
        "https://tripadvisor.com/Hotel_Review-g187791-d123456-Reviews",
      ),
    ).toBe("g187791-d123456");
  });
  it("falls back to a standalone d# key when there is no g#", () => {
    expect(
      extractXoteloKey("https://tripadvisor.com/Hotel_Review-d123456-Reviews"),
    ).toBe("d123456");
  });
  it("returns null when no key is present", () => {
    expect(extractXoteloKey("https://example.com/hotel")).toBeNull();
    expect(extractXoteloKey("")).toBeNull();
    expect(extractXoteloKey(null)).toBeNull();
  });
});

// M50 — safe filename/extension handling for storage paths.
describe("fileExt (M50)", () => {
  it("returns the extension", () => {
    expect(fileExt("receipt.pdf")).toBe("pdf");
    expect(fileExt("a.b.jpg")).toBe("jpg");
  });
  it('returns "" when there is no real extension', () => {
    expect(fileExt("noext")).toBe("");
    expect(fileExt("trailingdot.")).toBe("");
    expect(fileExt("")).toBe("");
  });
});

describe("storagePath (M50)", () => {
  it("appends the extension when present", () => {
    expect(storagePath("item-1", "receipt.pdf", 1000)).toBe("item-1/1000.pdf");
  });
  it("omits the dot when there is no extension (no malformed path)", () => {
    expect(storagePath("item-1", "noext", 1000)).toBe("item-1/1000");
  });
});
