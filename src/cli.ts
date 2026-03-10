import { Command } from "commander";
import { compareGas } from "./estimator.js";
import { buildPresetTx, allPresets } from "./presets.js";
import { formatPresetTable, formatComparison, formatJson } from "./reporter.js";
import { presetDescriptions } from "./presets.js";
import type { PresetType, RpcConfig } from "./types.js";

const BASE_MAINNET_RPC = "https://mainnet.base.org";
const BASE_TESTNET_RPC = "https://sepolia.base.org";
const ETHEREUM_RPC = "https://ethereum-rpc.publicnode.com";

const program = new Command();

program
  .name("base-gas")
  .description(
    "Gas estimator for Base (OP Stack L2). Shows L2 execution gas, L1 data fees, and compares Base vs Ethereum costs."
  )
  .version("0.1.0");

program
  .option("--rpc <url>", "Base RPC endpoint", BASE_MAINNET_RPC)
  .option("--testnet", "Use Base Sepolia testnet")
  .option("--eth-rpc <url>", "Ethereum RPC for comparison", ETHEREUM_RPC)
  .option("--no-compare", "Skip Ethereum comparison")
  .option("--json", "Output as JSON")
  .option("--eth-price <usd>", "ETH price in USD for cost estimation")
  .option(
    "-p, --preset <type>",
    "Estimate a specific preset: transfer, erc20-transfer, erc20-approve, swap, nft-mint, deploy"
  )
  .option("--to <address>", "Target contract address for custom estimation")
  .option("--data <hex>", "Calldata for custom estimation")
  .option("--from <address>", "Sender address for custom estimation")
  .option("--value <hex>", "Value in wei (hex) for custom estimation")
  .action(async (opts) => {
    try {
      const rpcUrl = opts.testnet ? BASE_TESTNET_RPC : opts.rpc;
      const config: RpcConfig = {
        baseRpc: rpcUrl,
        ethereumRpc: opts.compare === false ? undefined : opts.ethRpc,
        ethPriceUsd: opts.ethPrice ? parseFloat(opts.ethPrice) : undefined,
      };

      // Custom transaction
      if (opts.to || opts.data) {
        if (!opts.to) {
          console.error("Error: --to is required for custom estimation");
          process.exit(1);
        }
        const tx = {
          from: opts.from || "0x0000000000000000000000000000000000000000",
          to: opts.to,
          data: opts.data,
          value: opts.value,
        };
        const comparison = await compareGas(tx, config);
        if (opts.json) {
          console.log(
            formatJson([{ preset: "transfer" as PresetType, comparison }])
          );
        } else {
          console.log(formatComparison(comparison, "Custom Transaction"));
        }
        return;
      }

      // Single preset
      if (opts.preset) {
        const preset = opts.preset as PresetType;
        if (!allPresets.includes(preset)) {
          console.error(
            `Error: Unknown preset "${preset}". Available: ${allPresets.join(", ")}`
          );
          process.exit(1);
        }
        const tx = buildPresetTx(preset);
        const comparison = await compareGas(tx, config);
        if (opts.json) {
          console.log(formatJson([{ preset, comparison }]));
        } else {
          console.log(
            formatComparison(comparison, presetDescriptions[preset])
          );
        }
        return;
      }

      // All presets
      const results: Array<{
        preset: PresetType;
        comparison: ReturnType<typeof compareGas> extends Promise<infer T>
          ? T
          : never;
      }> = [];

      for (const preset of allPresets) {
        const tx = buildPresetTx(preset);
        try {
          const comparison = await compareGas(tx, config);
          results.push({ preset, comparison });
        } catch {
          // Skip presets that fail (e.g. deploy may not work on all RPCs)
        }
      }

      if (opts.json) {
        console.log(formatJson(results));
      } else {
        console.log(formatPresetTable(results));
      }
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  });

program.parse();
