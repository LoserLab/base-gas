import { describe, it, expect } from "vitest";
import { formatEstimate, formatComparison, formatJson } from "../src/reporter.js";
import type { GasEstimate, GasComparison } from "../src/types.js";

const mockEstimate: GasEstimate = {
  l2Gas: 21000n,
  l2GasPrice: 1000000n,
  l2Fee: 21000000000n,
  l1DataFee: 50000000000n,
  totalFee: 71000000000n,
  estimatedCostEth: "0.00000007",
  estimatedCostUsd: "$0.00",
  l1BaseFee: 5000000000n,
};

const mockComparison: GasComparison = {
  base: mockEstimate,
  ethereum: {
    gasEstimate: 21000n,
    gasPrice: 30000000000n,
    estimatedCostEth: "0.00063000",
    estimatedCostUsd: "$1.26",
  },
  savings: {
    percentage: "99.9%",
    absoluteEth: "0.00062993",
  },
};

describe("formatEstimate", () => {
  it("includes L2 execution gas", () => {
    const output = formatEstimate(mockEstimate);
    expect(output).toContain("21,000");
  });

  it("includes L2 gas price", () => {
    const output = formatEstimate(mockEstimate);
    expect(output).toContain("L2 gas price");
  });

  it("includes L1 data fee", () => {
    const output = formatEstimate(mockEstimate);
    expect(output).toContain("L1 data fee");
  });

  it("includes estimated cost", () => {
    const output = formatEstimate(mockEstimate);
    expect(output).toContain("0.00000007 ETH");
  });

  it("includes label when provided", () => {
    const output = formatEstimate(mockEstimate, "Test Label");
    expect(output).toContain("Test Label");
  });
});

describe("formatComparison", () => {
  it("includes Base section", () => {
    const output = formatComparison(mockComparison);
    expect(output).toContain("Base");
    expect(output).toContain("21,000");
  });

  it("includes Ethereum section", () => {
    const output = formatComparison(mockComparison);
    expect(output).toContain("Ethereum L1");
    expect(output).toContain("21,000");
  });

  it("includes savings", () => {
    const output = formatComparison(mockComparison);
    expect(output).toContain("99.9%");
    expect(output).toContain("cheaper on Base");
  });

  it("handles no ethereum comparison", () => {
    const cmp: GasComparison = {
      base: mockEstimate,
      ethereum: null,
      savings: null,
    };
    const output = formatComparison(cmp);
    expect(output).toContain("Base");
    expect(output).not.toContain("Ethereum L1");
  });
});

describe("formatJson", () => {
  it("returns valid JSON", () => {
    const output = formatJson([
      { preset: "transfer", comparison: mockComparison },
    ]);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].preset).toBe("transfer");
  });

  it("serializes bigints as strings", () => {
    const output = formatJson([
      { preset: "transfer", comparison: mockComparison },
    ]);
    const parsed = JSON.parse(output);
    expect(parsed[0].base.l2Gas).toBe("21000");
    expect(parsed[0].ethereum.gasEstimate).toBe("21000");
  });

  it("includes savings", () => {
    const output = formatJson([
      { preset: "transfer", comparison: mockComparison },
    ]);
    const parsed = JSON.parse(output);
    expect(parsed[0].savings.percentage).toBe("99.9%");
  });

  it("handles null ethereum", () => {
    const cmp: GasComparison = {
      base: mockEstimate,
      ethereum: null,
      savings: null,
    };
    const output = formatJson([{ preset: "transfer", comparison: cmp }]);
    const parsed = JSON.parse(output);
    expect(parsed[0].ethereum).toBeNull();
  });
});
