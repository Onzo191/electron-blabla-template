import { describe, expect, it } from "vitest";
import { ipcContract } from "./ipc-contract";

describe("ipcContract structure", () => {
  const channels = Object.keys(ipcContract) as (keyof typeof ipcContract)[];

  it("names every channel domain:action", () => {
    for (const channel of channels) {
      expect(channel).toMatch(/^[a-z]+:[a-zA-Z]+$/);
    }
  });

  it("declares request and response schemas for every channel", () => {
    for (const channel of channels) {
      expect(ipcContract[channel].request).toBeDefined();
      expect(ipcContract[channel].response).toBeDefined();
    }
  });
});

describe("app:getVersion", () => {
  const { request, response } = ipcContract["app:getVersion"];

  it("accepts a void request", () => {
    expect(() => request.parse(undefined)).not.toThrow();
  });

  it("rejects a non-void request", () => {
    expect(() => request.parse({ junk: 1 })).toThrow();
  });

  it("accepts a valid response", () => {
    expect(response.parse({ version: "1.0.0", platform: "darwin" })).toEqual({
      version: "1.0.0",
      platform: "darwin",
    });
  });

  it("rejects a response missing fields", () => {
    expect(() => response.parse({ version: "1.0.0" })).toThrow();
  });
});

describe("auth:setToken", () => {
  const { request, response } = ipcContract["auth:setToken"];

  it("accepts a non-empty token", () => {
    expect(request.parse({ token: "secret" })).toEqual({ token: "secret" });
  });

  it("rejects an empty token", () => {
    expect(() => request.parse({ token: "" })).toThrow();
  });

  it("rejects a missing token", () => {
    expect(() => request.parse({})).toThrow();
  });

  it("rejects a non-string token", () => {
    expect(() => request.parse({ token: 42 })).toThrow();
  });

  it("only accepts saved: true as response", () => {
    expect(response.parse({ saved: true })).toEqual({ saved: true });
    expect(() => response.parse({ saved: false })).toThrow();
  });
});

describe("auth:getToken", () => {
  const { request, response } = ipcContract["auth:getToken"];

  it("accepts a void request", () => {
    expect(() => request.parse(undefined)).not.toThrow();
  });

  it("accepts a string or null token in the response", () => {
    expect(response.parse({ token: "secret" })).toEqual({ token: "secret" });
    expect(response.parse({ token: null })).toEqual({ token: null });
  });

  it("rejects an undefined token in the response", () => {
    expect(() => response.parse({})).toThrow();
  });
});

describe("log:write", () => {
  const { request, response } = ipcContract["log:write"];

  it("accepts a valid log entry without meta", () => {
    expect(request.parse({ level: "info", message: "hello" })).toEqual({
      level: "info",
      message: "hello",
    });
  });

  it("accepts a valid log entry with meta", () => {
    expect(
      request.parse({ level: "error", message: "boom", meta: "{}" }),
    ).toEqual({ level: "error", message: "boom", meta: "{}" });
  });

  it("rejects an invalid level", () => {
    expect(() =>
      request.parse({ level: "verbose", message: "hello" }),
    ).toThrow();
  });

  it("rejects an empty message", () => {
    expect(() => request.parse({ level: "info", message: "" })).toThrow();
  });

  it("only accepts ok: true as response", () => {
    expect(response.parse({ ok: true })).toEqual({ ok: true });
    expect(() => response.parse({ ok: false })).toThrow();
  });
});

describe("app:getUpdateStatus", () => {
  const { request, response } = ipcContract["app:getUpdateStatus"];

  const validStatus = {
    state: "available",
    currentVersion: "1.0.0",
    latestVersion: "1.1.0",
    releaseNotesUrl: null,
    downloadProgress: null,
    isForced: false,
    errorMessage: null,
  };

  it("accepts a void request", () => {
    expect(() => request.parse(undefined)).not.toThrow();
  });

  it("accepts a valid update status", () => {
    expect(response.parse(validStatus)).toEqual(validStatus);
  });

  it("rejects an unknown state", () => {
    expect(() =>
      response.parse({ ...validStatus, state: "installing" }),
    ).toThrow();
  });

  it("rejects a missing field", () => {
    const { isForced: _isForced, ...incomplete } = validStatus;
    expect(() => response.parse(incomplete)).toThrow();
  });
});

describe("app:quitAndInstall", () => {
  const { request, response } = ipcContract["app:quitAndInstall"];

  it("accepts a void request", () => {
    expect(() => request.parse(undefined)).not.toThrow();
  });

  it("only accepts started: true as response", () => {
    expect(response.parse({ started: true })).toEqual({ started: true });
    expect(() => response.parse({ started: false })).toThrow();
  });
});

describe("auth:clearToken", () => {
  const { request, response } = ipcContract["auth:clearToken"];

  it("accepts a void request", () => {
    expect(() => request.parse(undefined)).not.toThrow();
  });

  it("only accepts cleared: true as response", () => {
    expect(response.parse({ cleared: true })).toEqual({ cleared: true });
    expect(() => response.parse({ cleared: false })).toThrow();
  });
});
