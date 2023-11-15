import { Wallet, TokenSendRequest, TestNetWallet } from "mainnet-js";
import { queryAuthHead } from "./queryChainGraph.js";

// Fill in this variables
const tokenId = "";
const network = "mainnet"; // mainnet or chipnet
const seedphase = "";
const derivationPathAddress = "m/44'/145'/0'/0/0"; // last number is the address index from electron cash

// start of the program code
const chaingraphUrl = "https://demo.chaingraph.cash/v1/graphql";
const authHeadTxId = await queryAuthHead(tokenId, chaingraphUrl);

// mainnet-js generates m/44'/0'/0'/0/0 by default so have to switch it
const walletClass = network == "mainnet" ? Wallet : TestNetWallet;
const wallet = await walletClass.fromSeed(seedphase, derivationPathAddress);
const walletAddress = wallet.getDepositAddress();
const balance = await wallet.getBalance();
const tokenBalance = await wallet.getTokenBalance(tokenId);
console.log(`wallet address: ${walletAddress}`);
console.log(`Bch amount in walletAddress is ${balance.bch}bch or ${balance.sat}sats`);
if(balance.sat < 1000) throw new Error("Not enough BCH to make the transaction!");
console.log(`Balance of configured token is ${tokenBalance}`);

let authUtxo;
const utxosWallet = await wallet.getUtxos();
utxosWallet.forEach(utxo => {
  if(utxo.txid == authHeadTxId && utxo.vout == 0) authUtxo = utxo;
})
console.log(`The authHead is the first output of the transaction with id ${authHeadTxId}`);
console.log(`The tokenBalance on the authHead is ${authUtxo.token.amount}`)

if(authUtxo) {
  console.log(authUtxo)
  addAllToReserves(authUtxo, tokenBalance);
} else {
  throw new Error("wallet does not hold the authority to update the authChain")
}

// Function to add all tokens with configure tokenId on the single address wallet to the authHead
async function addAllToReserves(authUtxo, newReservedSupply) {
  try {
    // Construct new reservedSupply output
    const reservedSupplyOutput = new TokenSendRequest({
      cashaddr: walletAddress,
      value: 1000,
      tokenId: tokenId,
      amount: newReservedSupply
    });
    const outputs = [ reservedSupplyOutput ];
    const { txId } = await wallet.send(outputs, { ensureUtxos: [authUtxo] });

    const displayId = `${authHeadTxId.slice(0, 20)}...${authHeadTxId.slice(-10)}`;
    console.log(`Published Auth update in tx ${displayId}, returned Auth to ${walletAddress} \n$https://explorer.bitcoinunlimited.info/tx/${txId}`);
  } catch (error) {
    console.log(error);
  }
}
