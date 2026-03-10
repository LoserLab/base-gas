/** Transaction call object for estimation */
export interface TransactionCall {
  from?: string;
  to: string;
  data?: string;
  value?: string;
}

/** Breakdown of gas estimate for Base */
export interface GasEstimate {
  /** L2 execution gas */
  l2Gas: bigint;
  /** L2 gas price (wei) */
  l2GasPrice: bigint;
  /** L2 execution cost (wei) */
  l2Fee: bigint;
  /** L1 data fee (wei) */
  l1DataFee: bigint;
  /** Total estimated cost (wei) */
  totalFee: bigint;
  /** Total cost in ETH */
  estimatedCostEth: string;
  /** Total cost in USD (if ethPrice provided) */
  estimatedCostUsd: string | null;
  /** L1 base fee as reported by GasPriceOracle */
  l1BaseFee: bigint | null;
}

/** Comparison between Base and Ethereum gas costs */
export interface GasComparison {
  base: GasEstimate;
  ethereum: {
    gasEstimate: bigint;
    gasPrice: bigint;
    estimatedCostEth: string;
    estimatedCostUsd: string | null;
  } | null;
  savings: {
    percentage: string;
    absoluteEth: string;
  } | null;
}

/** RPC configuration */
export interface RpcConfig {
  baseRpc: string;
  ethereumRpc?: string;
  ethPriceUsd?: number;
}

/** Preset transaction types */
export type PresetType =
  | "transfer"
  | "erc20-transfer"
  | "erc20-approve"
  | "swap"
  | "nft-mint"
  | "deploy";
