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

export function weiToEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return "0.00000000";
  if (eth < 0.00000001) return "<0.00000001";
  return eth.toFixed(8);
}

export function ethToUsd(ethStr: string, ethPrice: number): string {
  const eth = parseFloat(ethStr);
  if (eth === 0) return "$0.00";
  const usd = eth * ethPrice;
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

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
    // Normalize: remove 0x prefix if present, each 2 hex chars = 1 byte
    const normalizedData = tx.data.startsWith('0x') ? tx.data.slice(2) : tx.data;
    const dataBytes = normalizedData.length / 2;
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
  const estimatedCostUsd = ethToUsd(estimatedCostEth, config.ethPrice);

  return {
    l2Gas,
    l2GasPrice,
    l2Fee,
    l1DataFee,
    l1BaseFee,
    totalFee,
    estimatedCostEth,
    estimatedCostUsd,
  };
}

/** Compare gas costs between two transactions */
export async function compareGas(
  tx1: TransactionCall,
  tx2: TransactionCall,
  config: RpcConfig
): Promise<GasComparison> {
  const [estimate1, estimate2] = await Promise.all([
    estimateGas(tx1, config),
    estimateGas(tx2, config),
  ]);

  const diff = estimate2.totalFee - estimate1.totalFee;
  const percentDiff = Number(diff) / Number(estimate1.totalFee) * 100;

  return {
    tx1: estimate1,
    tx2: estimate2,
    difference: diff,
    percentDifference: percentDiff,
    cheaper: diff < 0 ? 2 : 1,
  };
}
