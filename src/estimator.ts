import type {
  TransactionCall,
  GasEstimate,
  GasComparison,
  RpcConfig,
} from "./types.js";
import {
  ethEstimateGas,
  ethGasPrice,
  getL1FeeUpperBound,
  getL1BaseFee,
} from "./rpc.js";

/** Format wei to ETH string with 8 decimal places */
export function weiToEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return "0.00000000";
  if (eth < 0.00000001) return "<0.00000001";
  return eth.toFixed(8);
}

/** Format ETH to USD string */
export function ethToUsd(ethStr: string, ethPrice: number): string {
  const eth = parseFloat(ethStr);
  if (eth === 0) return "$0.00";
  const usd = eth * ethPrice;
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

/** Format gwei */
export function weiToGwei(wei: bigint): string {
  const gwei = Number(wei) / 1e9;
  if (gwei < 0.001) return "<0.001";
  return gwei.toFixed(3);
}

/**
 * Estimate the approximate serialized tx size for L1 fee estimation.
 * A typical transaction is ~100-200 bytes. We estimate based on calldata size.
 */
function estimateTxSize(tx: TransactionCall): number {
  // Base overhead: 68 bytes (nonce, gas, to, value, v, r, s fields)
  let size = 68;
  if (tx.data) {
    // Remove 0x prefix, each 2 hex chars = 1 byte
    const dataBytes = (tx.data.length - 2) / 2;
    size += dataBytes;
  }
  return Math.max(size, 100); // Minimum 100 bytes (Fjord minTransactionSize)
}

/** Estimate gas for a transaction on Base */
export async function estimateGas(
  tx: TransactionCall,
  config: RpcConfig
): Promise<GasEstimate> {
  const [l2GasHex, l2PriceHex, l1FeeHex, l1BaseFeeHex] = await Promise.all([
    ethEstimateGas(config.baseRpc, tx),
    ethGasPrice(config.baseRpc),
    getL1FeeUpperBound(config.baseRpc, estimateTxSize(tx)),
    getL1BaseFee(config.baseRpc).catch(() => null),
  ]);

  const l2Gas = BigInt(l2GasHex);
  const l2GasPrice = BigInt(l2PriceHex);
  const l2Fee = l2Gas * l2GasPrice;
  const l1DataFee = BigInt(l1FeeHex);
  const l1BaseFee = l1BaseFeeHex ? BigInt(l1BaseFeeHex) : null;
  const totalFee = l2Fee + l1DataFee;

  const estimatedCostEth = weiToEth(totalFee);
  const estimatedCostUsd = config.ethPriceUsd
    ? ethToUsd(estimatedCostEth, config.ethPriceUsd)
    : null;

  return {
    l2Gas,
    l2GasPrice,
    l2Fee,
    l1DataFee,
    totalFee,
    estimatedCostEth,
    estimatedCostUsd,
    l1BaseFee,
  };
}

/** Compare gas costs between Base and Ethereum */
export async function compareGas(
  tx: TransactionCall,
  config: RpcConfig
): Promise<GasComparison> {
  const baseEstimate = await estimateGas(tx, config);

  let ethereum: GasComparison["ethereum"] = null;
  let savings: GasComparison["savings"] = null;

  if (config.ethereumRpc) {
    try {
      const [ethGasHex, ethPriceHex] = await Promise.all([
        ethEstimateGas(config.ethereumRpc, tx),
        ethGasPrice(config.ethereumRpc),
      ]);

      const gasEstimate = BigInt(ethGasHex);
      const gasPrice = BigInt(ethPriceHex);
      const totalCostWei = gasEstimate * gasPrice;
      const estimatedCostEth = weiToEth(totalCostWei);
      const estimatedCostUsd = config.ethPriceUsd
        ? ethToUsd(estimatedCostEth, config.ethPriceUsd)
        : null;

      ethereum = { gasEstimate, gasPrice, estimatedCostEth, estimatedCostUsd };

      const ethCost = gasEstimate * gasPrice;

      if (ethCost > 0n) {
        const saved = ethCost - baseEstimate.totalFee;
        const pct = (Number(saved) / Number(ethCost)) * 100;
        savings = {
          percentage: `${pct.toFixed(1)}%`,
          absoluteEth: weiToEth(saved > 0n ? saved : -saved),
        };
      }
    } catch {
      // Ethereum estimation failed
    }
  }

  return { base: baseEstimate, ethereum, savings };
}
