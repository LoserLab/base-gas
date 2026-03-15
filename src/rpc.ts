import type { TransactionCall } from "./types.js";

const GAS_PRICE_ORACLE = "0x420000000000000000000000000000000000000F";

async function rpcCall<T>(
  url: string,
  method: string,
  params: unknown[]
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!res.ok) {
    throw new Error(`RPC request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as {
    result?: T;
    error?: { code: number; message: string };
  };

  if (json.error) {
    throw new Error(`RPC error: ${json.error.message} (code ${json.error.code})`);
  }

  if (json.result === undefined) {
    throw new Error("RPC returned no result");
  }

  return json.result;
}

export async function ethEstimateGas(
  rpcUrl: string,
  tx: TransactionCall
): Promise<string> {
  return rpcCall<string>(rpcUrl, "eth_estimateGas", [tx]);
}

export async function ethGasPrice(rpcUrl: string): Promise<string> {
  return rpcCall<string>(rpcUrl, "eth_gasPrice", []);
}

/**
 * Call GasPriceOracle.getL1FeeUpperBound(uint256)
 * Contract: 0x420000000000000000000000000000000000000F
 * Selector: 0xd22a6484 (getL1FeeUpperBound(uint256))
 */
export async function getL1FeeUpperBound(
  rpcUrl: string,
  txSizeBytes: number
): Promise<string> {
  const selector = "0xd22a6484";
  const sizeHex = txSizeBytes.toString(16).padStart(64, "0");

  return rpcCall<string>(rpcUrl, "eth_call", [
    { to: GAS_PRICE_ORACLE, data: selector + sizeHex },
    "latest",
  ]);
}

/**
 * Call GasPriceOracle.l1BaseFee()
 * Selector: 0x519b4bd3
 */
export async function getL1BaseFee(rpcUrl: string): Promise<string> {
  return rpcCall<string>(rpcUrl, "eth_call", [
    { to: GAS_PRICE_ORACLE, data: "0x519b4bd3" },
    "latest",
  ]);
}
