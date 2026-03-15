# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AuthUpdate is a TypeScript toolkit for managing Bitcoin Cash (BCH) on-chain BCMR (Bitcoin Cash Metadata Registry) updates and fungible token operations via the authchain mechanism. It supports both mainnet and chipnet (testnet).

## Commands

```bash
pnpm install                # Install dependencies (uses pnpm, not npm)
pnpm run authUpdate         # Publish BCMR metadata update on-chain
pnpm run reservedSupply     # Add tokens to authchain reserved supply
pnpm run issueSupply        # Issue fungible tokens from authchain
pnpm run typecheck          # TypeScript type checking (tsc --noEmit)
```

Files are executed directly via `tsx` (no build step). There are no tests or linting configured.

## Architecture

Four TypeScript files, all at the repo root:

- **`queryChainGraph.ts`** — Shared module exporting `queryAuthHead(tokenId)`. Queries the Chaingraph GraphQL endpoint (`cg3.cashflow.dev`) to find the current authchain head transaction for a given token ID.

- **`authUpdate.ts`** — Main program. Imports wallet from WIF or seedphrase, fetches BCMR JSON from HTTPS/IPFS, constructs an `OP_RETURN <'BCMR'> <hash> <uri>` output, and sends the authhead back to the same address. Handles reserved supply preservation and token change outputs.

- **`issueSupply.ts`** — Issues fungible tokens from the authchain to a destination address. Creates two outputs: reserved supply (authchain) and issuance amount.

- **`reservedSupply.ts`** — Aggregates all fungible tokens in the wallet and adds them to the authchain's reserved supply.

All three programs follow the same flow: query authhead → create wallet → locate authUtxo → construct outputs → broadcast transaction with `ensureUtxos: [authUtxo]`.

## Key Dependencies

- **mainnet-js** — BCH wallet library (wallet creation, transactions, broadcasting)
- **chaingraph-ts** — Type-safe GraphQL client for blockchain queries
- **tsx** — TypeScript executor (runs .ts files directly)

## Configuration

Each program uses hardcoded variables at the top of the file (tokenId, seedphrase/WIF, derivation path, network, BCMR URL/CID). Configuration is edited directly in the source files before running. The project uses ES modules (`"type": "module"` in package.json).
