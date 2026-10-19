export {};

declare global {
  interface UniSatProvider {
    requestAccounts(): Promise<string[]>;
    getAccounts(): Promise<string[]>;
    getChain?: () => Promise<{ enum?: string; name?: string; network?: string }>;
    switchChain?: (chain: string) => Promise<{ enum?: string; name?: string; network?: string }>;
    getNetwork?: () => Promise<string | number>;
    switchNetwork?: (network: string) => Promise<string | number>;
    signPsbt(psbtHex: string, options?: {
      autoFinalized?: boolean;
      toSignInputs?: Array<{ index: number; address?: string; publicKey?: string; sighashTypes?: number[]; disableTweakSigner?: boolean }>;
    }): Promise<string>;
    pushPsbt(psbtHex: string): Promise<string>;
    on(event: "accountsChanged", listener: (accounts: string[]) => void): void;
    on(event: "networkChanged", listener: (network: string | number) => void): void;
    removeListener?(event: "accountsChanged" | "networkChanged", listener: (...args: never[]) => void): void;
  }

  interface Window {
    unisat?: UniSatProvider;
  }
}
