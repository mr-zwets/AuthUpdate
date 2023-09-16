# AuthUpdate

**A handy Javascript program to update your BCMR metadata on-chain!**

## What it is

A program to import a single-address wallet for creating an OP_RETURN output in the authchain to publish a BCMR metadata update for a token or identity. 

## Disclaimer

Be careful with any program asking you to fill in your seedphrase!
Verify the source of the program and that is doing what it claims to be doing!

## How to use it

Before starting, it is expected that you hold the AuthHead in either a dedicated wallet used for no other purpose or a wallet with coin-control to prevent accidental burning.

Clone this repo locally & have Node-js installed to run javascript programs.
Install the npm dependency (mainnet-js) in the command line with

```
npm install
```

Next, fill in the 5 variables at the top of the `authUpdate.js` file
- the `tokenId` (or authbase)
- either the `bcmrURL` or the `bcmrIpfsCID`
- the `seedphase` 
- the `derivationPathAddress`
- `keepReservedSupply` boolean

For the `derivationPathAddress`: if your authHead is at address index 4 in your Electron Cash, change `m/44'/145'/0'/0/0` to `m/44'/145'/0'/0/4`.

Finally run the program from the command line with
```
node authUpdate.js
```

to broadcast the onchain metadata update.
To use this program you need enough BCH in the single-address wallet to cover the network fees of the transaction.

## How it works

The program imports a one-address wallet from the provided seedphrase and creates a transaction to publish an on-chain BCMR update in the authchain. More specifically, it sends the authhead back to the same address and has an OP_RETURN as second output to put data for the BCMR update on-chain according to the BCMR spec:
```
OP_RETURN <'BCMR'> <hash> <uri>
```