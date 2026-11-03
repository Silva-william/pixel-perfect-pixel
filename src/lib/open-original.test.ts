import { afterEach, describe, expect, it, vi } from "vitest";
import { openOriginalInBrowser } from "./open-original";

afterEach(() => vi.unstubAllGlobals());

describe("opening the original from a mobile tap", () => {
  it("opens the tab synchronously before waiting for the original URL and removes opener access", async () => {
    const replace = vi.fn();
    const tab = { opener: {}, closed: false, location: { replace }, close: vi.fn() };
    const open = vi.fn(() => tab);
    vi.stubGlobal("window", { open });
    let resolve: (url: string) => void = () => {};
    const pending = new Promise<string>((done) => { resolve = done; });
    const resolveUrl = vi.fn(() => {
      expect(open).toHaveBeenCalledWith("about:blank", "_blank");
      return pending;
    });
    const opening = openOriginalInBrowser(resolveUrl);
    expect(tab.opener).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    resolve("https://fmu-content.s3.us-east-1.amazonaws.com/ebook/index.html");
    await opening;
    expect(replace).toHaveBeenCalledWith("https://fmu-content.s3.us-east-1.amazonaws.com/ebook/index.html");
  });

  it("opens in the current tab when the browser blocks a new tab", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { open: () => null, location: { assign } });
    await openOriginalInBrowser(async () => "https://example.com/original.pdf");
    expect(assign).toHaveBeenCalledWith("https://example.com/original.pdf");
  });

  it("closes the reserved tab and reports an error if the original cannot be retrieved", async () => {
    const close = vi.fn();
    const replace = vi.fn();
    vi.stubGlobal("window", { open: () => ({ closed: false, opener: {}, close, location: { replace } }) });
    await expect(openOriginalInBrowser(async () => { throw new Error("Arquivo indisponível"); }))
      .rejects.toThrow("Arquivo indisponível");
    expect(close).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });
});