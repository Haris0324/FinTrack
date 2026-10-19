export {};

declare global {
  interface Eip1193Provider {
    request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
    on(event: "accountsChanged", listener: (accounts: unknown) => void): void;
    on(event: "chainChanged", listener: (chainId: unknown) => void): void;
    removeListener?(event: "accountsChanged" | "chainChanged", listener: (...args: never[]) => void): void;
  }

  interface Window {
    ethereum?: Eip1193Provider;
  }
}
