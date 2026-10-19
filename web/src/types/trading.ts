export type SwapDirection = "BTC_TO_ETH" | "ETH_TO_BTC";

export type SwapTrackingRecord = {
  id: string;
  direction: SwapDirection;
  sourceChain: "BTC" | "ETH";
  txHash: string;
  createdAt: number;
};
