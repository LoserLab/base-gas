import { describe, it, expect, vi } from "vitest";
import { ethEstimateGas, ethGasPrice, getL1FeeUpperBound, getL1BaseFee } from "../src/rpc.js";

describe("rpc functions", () => {
  it("ethEstimateGas sends correct JSON-RPC method", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "0x5208" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await ethEstimateGas("https://rpc.test", {
      from: "0x00",
      to: "0x01",
    });

    expect(result).toBe("0x5208");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.method).toBe("eth_estimateGas");

    vi.unstubAllGlobals();
  });

  it("ethGasPrice sends correct JSON-RPC method", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "0x3b9aca00" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await ethGasPrice("https://rpc.test");
    expect(result).toBe("0x3b9aca00");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.method).toBe("eth_gasPrice");

    vi.unstubAllGlobals();
  });

  it("getL1FeeUpperBound sends correct eth_call to GasPriceOracle", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "0x00000000000000000000000000000000000000000000000000000000000f4240" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await getL1FeeUpperBound("https://rpc.test", 100);
    expect(result).toBe("0x00000000000000000000000000000000000000000000000000000000000f4240");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.method).toBe("eth_call");
    const callParams = body.params[0];
    expect(callParams.to).toBe("0x420000000000000000000000000000000000000F");
    expect(callParams.data.startsWith("0xd22a6484")).toBe(true);

    vi.unstubAllGlobals();
  });

  it("getL1BaseFee sends correct eth_call to GasPriceOracle", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "0x12a05f200" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await getL1BaseFee("https://rpc.test");
    expect(result).toBe("0x12a05f200");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.method).toBe("eth_call");
    const callParams = body.params[0];
    expect(callParams.to).toBe("0x420000000000000000000000000000000000000F");
    expect(callParams.data).toBe("0x519b4bd3");

    vi.unstubAllGlobals();
  });

  it("throws on HTTP error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      ethGasPrice("https://rpc.test")
    ).rejects.toThrow("RPC request failed: 500 Internal Server Error");

    vi.unstubAllGlobals();
  });

  it("throws on RPC error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          error: { code: -32000, message: "execution reverted" },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      ethEstimateGas("https://rpc.test", { to: "0x00" })
    ).rejects.toThrow("RPC error: execution reverted (code -32000)");

    vi.unstubAllGlobals();
  });

  it("throws on missing result", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      ethGasPrice("https://rpc.test")
    ).rejects.toThrow("RPC returned no result");

    vi.unstubAllGlobals();
  });
});
