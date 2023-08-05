# AuthUpdate

**A handy Javascript program to update your BCMR metadata on-chain!**

## What it is

A program to import a one-address wallet for creating an OP_RETURN output in the authchain to publish a BCMR metadata update for a token or identity. 

## How to use it

Install the npm dependency (mainnet-js) with

```
npm install
```
then fill in 4 variables at the top of the `authUpdate.js` file.
`tokenId`, either the `bcmrURL` or the `bcmrIpfsCID`, the `seedphase` and lastly the `derivationPathAddress`.

Be careful with any program asking you to fill in your seedphrase!
Verify the source of the program and that is doing what it claims to be doing!

Finally run
```
node authUpdate.js
```

to broadcast the onchain metadata update.

## How it works

The program imports a one-address wallet from the provided seedphrase and creates a transaction to publish an on-chain BCMR update in the authchain. More specifically, it sends the authhead back to the same address and has an OP_RETURN as second output to put data for the BCMR update on-chain according to the BCMR spec:
```
OP_RETURN <'BCMR'> <hash> <uri>
```
