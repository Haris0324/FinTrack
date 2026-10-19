# FinTrack Bitcoin trading (separate feature)

This feature lives in the `/dashboard/trade` and `/dashboard/bitcoin-quote` routes. It does not add entries to the existing dashboard navigation.

## Current scope

- The quote preview requests fresh ETH/BTC quotes from THORChain.
- BTC-to-ETH quotes require the Ethereum receive address to have no deployed code on Ethereum mainnet; the quote and final wallet readiness checks fail closed for contract or EIP-7702 delegated addresses. This is a point-in-time check and cannot prevent code from appearing after the Bitcoin transaction is broadcast.
- Bitcoin deposit quotes are checked against the current THORChain Bitcoin inbound vault and halt flags; if the quote address differs from the active vault or deposits are paused, FinTrack will not prepare the deposit.
- Bitcoin mainnet receive addresses are checksum-validated. FinTrack accepts legacy Base58, SegWit v0, and Taproot v1 formats; it rejects future witness versions until wallet and protocol support is explicitly added.
- Bitcoin-to-Ethereum swaps can prepare a Bitcoin PSBT, ask UniSat to sign it, and require a separate user action to broadcast it.
- UTXO and fee information comes from mempool.space. Its public API is rate-limited.
- Ethereum-to-Bitcoin swaps can prepare a native ETH router transaction and ask the connected EVM wallet to approve and submit it.
- Submitted swaps can be saved to the signed-in user's account as public transaction hashes and manually checked for source-chain confirmation, THORChain processing, and destination transaction confirmation.
- Trade-history retries return the existing account-scoped record, and conflicting reuse of a transaction hash is rejected. Existing retries do not consume the write limit.
- Trade-history reads and edits are rate-limited per account and across the application. Entries remain scoped to the signed-in account.
- Quotes require a user-selected THORChain liquidity tolerance from 0.50% to 10.00%. FinTrack requires the quote's recommended minimum input amount and rejects amounts below it, which helps cover swap and potential refund fees. It also reads the minimum destination amount from the quote memo, rejects invalid or zero minima, and shows both the estimate and the protocol-enforced output minimum before the wallet is asked to sign or submit. The memo carrying this output minimum is included in the Bitcoin OP_RETURN or Ethereum router call.
- FinTrack does not store keys, seed phrases, signed transactions, or receive addresses. Account trade history keeps at most 25 source transaction hashes per user.
- Each prepared trade snapshots the selected amount, wallet address, destination, and slippage setting. FinTrack rechecks these values and the active wallet/network before signing, broadcasting, or submitting; if a form value or wallet selection changes, the user must prepare again.
- Before signing or sending, FinTrack also asks the server to recheck that the relevant mainnet switch remains enabled and the current server-side amount cap still permits the trade. This lets an operator disable trading or lower a cap after preparation and block the pending wallet action. The server checks the prepared inbound address against current THORChain data and blocks halted or paused chains. For ETH-to-BTC, it also confirms that the prepared router still matches the configured allowlist and that the live Ethereum mainnet router bytecode hash still matches the approved hash. Verification failure blocks the wallet request.

## Mainnet switch

Operators can set server-only per-swap input caps. These values are decimal BTC/ETH amounts, limited to 8 decimal places, and are enforced by the quote API before either wallet flow can prepare a transaction:

```env
FINTRACK_MAX_BTC_SWAP=0.05
FINTRACK_MAX_ETH_SWAP=1
```

Set both caps to deployment-specific values before enabling the corresponding mainnet trading switch. A missing or invalid cap makes quote preparation and the final wallet readiness check fail closed while that switch is enabled. Choose conservative values for the deployment and review them before launch.

Use [`.env.trading.example`](.env.trading.example) as a disabled-by-default template; it is not loaded automatically. For a deployment, set the caps and independently verified ETH router settings in the hosting provider's server-only environment, deploy with both mainnet switches set to `false`, then sign in as an active administrator and request `/api/trading/preflight`. Enable one trading pair only after its checks pass and the operator has completed transaction review, documented risk approval, and independent security review. Re-run preflight after deployment. Never put these settings in `NEXT_PUBLIC_` variables or commit real deployment values.

An active administrator can request `GET /api/trading/preflight` for a read-only, rate-limited deployment check. It reports whether the caps are valid, the current Bitcoin inbound is active and has a valid Bitcoin mainnet address checksum, and the configured Ethereum router still matches THORChain and its deployed Ethereum mainnet code hash. The response does not include configured cap, router, or hash values. `readyToEnable` means these automated checks passed; it does not replace testnet rehearsal, independent verification of the configured router hash, protocol monitoring, or an independent security review. The endpoint never changes the mainnet switches.

Bitcoin transaction preparation is disabled unless the **server-side** environment variable below is set:

```env
FINTRACK_ENABLE_MAINNET_BTC_TRADES=true
```

Do not prefix this variable with `NEXT_PUBLIC_`. Keep it disabled until the operator has reviewed the Bitcoin output, OP_RETURN memo, fee selection, wallet prompt, and broadcast flow. The code currently has no testnet trading route; this switch enables Bitcoin mainnet only.

After enabling it, users must sign in, connect UniSat on Bitcoin mainnet, request a quote, prepare a fresh transaction, review the address/amount/memo/fee, sign the transaction in UniSat, and click the separate broadcast button. Before storing a wallet signature and again before broadcast, FinTrack checks that the PSBT is finalized, its transaction and fee still match the reviewed version, and the extracted transaction remains identical. After broadcast, FinTrack checks that UniSat's returned transaction ID matches the ID computed from the signed transaction before recording it. If UniSat may have broadcast the transaction but returns no matching ID, FinTrack shows the locally computed transaction ID and requires the user to check it before retrying the same signed transaction. Quote expiry is checked before preparation, signing, and broadcast.

Ethereum transaction preparation is independently disabled unless the **server-side** environment variable below is set:

```env
FINTRACK_ENABLE_MAINNET_ETH_TRADES=true
```

Do not prefix this variable with `NEXT_PUBLIC_`. ETH-to-BTC transaction preparation also requires a server-side expected-router address:

```env
FINTRACK_EXPECTED_THORCHAIN_ETH_ROUTER=0x...
FINTRACK_EXPECTED_THORCHAIN_ETH_ROUTER_CODE_HASH=0x...
```

Set the address and the keccak-256 hash of the deployed runtime bytecode after independently verifying both against THORChain's official deployment information and Ethereum mainnet. Do not copy these values from a quote response. FinTrack compares the address with the live THORNode inbound router and checks the bytecode hash against Ethereum mainnet. ETH trading stays disabled if either value is absent, malformed, mismatched, or cannot be checked. A router rotation or code change therefore requires an operator to verify and update the allowlist. Keep trading disabled until the operator has reviewed the live ETH router call and wallet approval screen. FinTrack fetches current ETH vault/router details and chain halt flags from THORNode each time it returns an ETH-to-BTC quote. The transaction contains the fresh quote memo and current vault; the native ETH value equals the quoted input amount. Wallet gas is extra and estimated by the wallet.

For ETH-to-BTC, users must sign in, connect an EIP-1193 wallet on Ethereum mainnet, connect UniSat or enter a Bitcoin mainnet receive address, request a quote, prepare a fresh transaction, review the router/vault/memo/amount and approximate gas fee, and explicitly open the wallet approval prompt. FinTrack estimates gas and checks the balance during preparation and again before approval; if the estimate rises by more than 20%, the user must prepare again. The wallet remains authoritative for the final fee. Before opening that prompt, FinTrack checks the quoted router has deployed contract code, calls `eth_call` with the exact transaction, and checks the account and network again. This catches an empty-code address but does not prove that deployed code is authentic or safe. A failed simulation stops submission; a successful simulation is only a point-in-time check and cannot reserve a quote or guarantee a later transaction will execute. If an error occurs after the wallet request starts and FinTrack does not receive a transaction hash, the user must check wallet activity before explicitly enabling another preparation; blindly retrying could create a second swap. FinTrack does not receive or store keys. The wallet sends the transaction; FinTrack only shows the returned transaction hash and an Etherscan link.

## Important limits

- UniSat handles Bitcoin transactions. An injected EIP-1193 wallet handles Ethereum transactions.
- Quote, readiness, and status routes cap JSON responses from THORChain and Ethereum RPC providers at 512 KiB before parsing; the Bitcoin block-height response and status-tracker payload are bounded as well. The wallet flow also caps quote and Bitcoin explorer responses at 512 KiB before processing; oversized Bitcoin previous-transaction data is rejected during preparation. Status tracking checks public source-chain receipts, THORChain stages, and known destination transactions. It refreshes manually; there is no background polling. Bitcoin is reported confirmed after six blocks; Ethereum is reported confirmed only once its transaction block is at or below the node's finalized block, after the RPC confirms it is serving Ethereum mainnet. A swap is reported complete only when the source transaction is confirmed, THORChain has observed and confirmed the inbound and finalized the swap, and every expected outbound is confirmed. FinTrack verifies Ethereum JSON-RPC response version and request ID, and verifies that Bitcoin, Ethereum, and THORChain status responses refer to the exact transaction hash being checked; mismatched or malformed responses make status unavailable. The tracker also reports status unavailable instead of complete when outbound transaction data is malformed or unexpected. A source-chain transaction hash does not mean the swap has completed or that the destination asset has arrived.
- Mainnet feature flags are not a substitute for testnet rehearsal, protocol monitoring, or an independent security review.
- THORChain, mempool.space, and the public Ethereum RPC are external services. Quotes and status refreshes send public addresses or transaction hashes to the relevant providers.
