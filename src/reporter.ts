import type { GasEstimate, GasComparison, PresetType } from "./types.js";
import { weiToGwei, weiToEth } from "./estimator.js";
import { presetDescriptions } from "./presets.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const WHITE = "\x1b[37m";

function line(label: string, value: string, color = WHITE): string {
  return `  ${DIM}${label.padEnd(24)}${RESET}${color}${value}${RESET}`;
}

/** Format a single Base gas estimate */
export function formatEstimate(est: GasEstimate, label?: string): string {
  const lines: string[] = [];

  if (label) {
    lines.push(`${BOLD}${BLUE}${label}${RESET}`);
    lines.push("");
  }

  lines.push(`${BOLD}${WHITE}  Base (OP Stack L2)${RESET}`);
  lines.push(line("L2 execution gas", est.l2Gas.toLocaleString(), CYAN));
  lines.push(line("L2 gas price", `${weiToGwei(est.l2GasPrice)} gwei`, CYAN));
  lines.push(line("L2 execution fee", `${weiToEth(est.l2Fee)} ETH`, DIM));
  lines.push(line("L1 data fee", `${weiToEth(est.l1DataFee)} ETH`, DIM));
  if (est.l1BaseFee !== null) {
    lines.push(line("L1 base fee", `${weiToGwei(est.l1BaseFee)} gwei`, DIM));
  }
  lines.push("");
  lines.push(line("Estimated cost", `${est.estimatedCostEth} ETH`, GREEN));
  if (est.estimatedCostUsd) {
    lines.push(line("", est.estimatedCostUsd, GREEN));
  }

  return lines.join("\n");
}

/** Format a full gas comparison */
export function formatComparison(cmp: GasComparison, label?: string): string {
  const lines: string[] = [];

  if (label) {
    lines.push(`${BOLD}${BLUE}${label}${RESET}`);
    lines.push("");
  }

  // Base section
  lines.push(`${BOLD}${WHITE}  Base (OP Stack L2)${RESET}`);
  lines.push(line("L2 execution gas", cmp.base.l2Gas.toLocaleString(), CYAN));
  lines.push(line("L2 gas price", `${weiToGwei(cmp.base.l2GasPrice)} gwei`, CYAN));
  lines.push(line("L2 execution fee", `${weiToEth(cmp.base.l2Fee)} ETH`, DIM));
  lines.push(line("L1 data fee", `${weiToEth(cmp.base.l1DataFee)} ETH`, DIM));
  lines.push(line("Estimated cost", `${cmp.base.estimatedCostEth} ETH`, GREEN));
  if (cmp.base.estimatedCostUsd) {
    lines.push(line("", cmp.base.estimatedCostUsd, GREEN));
  }

  // Ethereum section
  if (cmp.ethereum) {
    lines.push("");
    lines.push(`${BOLD}${WHITE}  Ethereum L1${RESET}`);
    lines.push(line("Gas estimate", cmp.ethereum.gasEstimate.toLocaleString(), CYAN));
    lines.push(line("Gas price", `${weiToGwei(cmp.ethereum.gasPrice)} gwei`, CYAN));
    lines.push(line("Estimated cost", `${cmp.ethereum.estimatedCostEth} ETH`, YELLOW));
    if (cmp.ethereum.estimatedCostUsd) {
      lines.push(line("", cmp.ethereum.estimatedCostUsd, YELLOW));
    }
  }

  // Savings section
  if (cmp.savings) {
    lines.push("");
    const pct = parseFloat(cmp.savings.percentage);
    if (pct > 0) {
      lines.push(`  ${BOLD}${GREEN}\u2193 ${cmp.savings.percentage} cheaper on Base${RESET} ${DIM}(${cmp.savings.absoluteEth} ETH saved)${RESET}`);
    } else {
      lines.push(`  ${BOLD}${YELLOW}\u2191 ${cmp.savings.percentage.replace("-", "")} more expensive on Base${RESET}`);
    }
  }

  return lines.join("\n");
}

/** Format preset comparison table */
export function formatPresetTable(
  results: Array<{ preset: PresetType; comparison: GasComparison }>
): string {
  const lines: string[] = [];

  lines.push(`${BOLD}${BLUE}base-gas${RESET} ${DIM}v0.1.0${RESET}`);
  lines.push("");

  for (const { preset, comparison } of results) {
    const desc = presetDescriptions[preset];
    lines.push(formatComparison(comparison, desc));
    lines.push("");
    lines.push(`${DIM}${"─".repeat(50)}${RESET}`);
    lines.push("");
  }

  return lines.join("\n");
}

/** Format results as JSON */
export function formatJson(
  results: Array<{ preset: PresetType; comparison: GasComparison }>
): string {
  const serializable = results.map(({ preset, comparison }) => ({
    preset,
    description: presetDescriptions[preset],
    base: {
      l2Gas: comparison.base.l2Gas.toString(),
      l2GasPrice: comparison.base.l2GasPrice.toString(),
      l2Fee: comparison.base.l2Fee.toString(),
      l1DataFee: comparison.base.l1DataFee.toString(),
      totalFee: comparison.base.totalFee.toString(),
      estimatedCostEth: comparison.base.estimatedCostEth,
      estimatedCostUsd: comparison.base.estimatedCostUsd,
      l1BaseFee: comparison.base.l1BaseFee?.toString() ?? null,
    },
    ethereum: comparison.ethereum
      ? {
          gasEstimate: comparison.ethereum.gasEstimate.toString(),
          gasPrice: comparison.ethereum.gasPrice.toString(),
          estimatedCostEth: comparison.ethereum.estimatedCostEth,
          estimatedCostUsd: comparison.ethereum.estimatedCostUsd,
        }
      : null,
    savings: comparison.savings,
  }));

  return JSON.stringify(serializable, null, 2);
}
