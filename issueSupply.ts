import { Wallet, TokenSendRequest, toBch, type Utxo } from "mainnet-js";
import { queryAuthHead } from "./queryChainGraph.js";

const seedphase = "";
const derivationPathAddress = "m/44'/145'/0'/0/0"; // last number is the address index from electron cash
const tokenId = ""
const destinationAddress = ""
const issueAmount = 100_000_000n

// start of the program code
const authHeadTxId = await queryAuthHead(tokenId);

const wallet = await Wallet.fromSeed(seedphase, derivationPathAddress);
const walletAddress = wallet.getDepositAddress();
const balance = await wallet.getBalance();
console.log(`wallet address: ${walletAddress}`);
console.log(`Bch amount in walletAddress is ${toBch(balance)}bch or ${balance}sats`);
if(balance < 1000n) throw new Error("Not enough BCH to make the transaction!");

let authUtxo: Utxo | undefined;
const utxosWallet = await wallet.getUtxos();
utxosWallet.forEach(utxo => {
  if(utxo.txid == authHeadTxId && utxo.vout == 0) authUtxo = utxo;
})
console.log(`The authHead is the first output of the transaction with id ${authHeadTxId}`);
if(!authUtxo) throw new Error("wallet does not hold the authUtxo");
if(!authUtxo?.token?.amount) throw new Error("wallet does not hold the authUtxo");

const newReservedSupply = authUtxo?.token?.amount - issueAmount;

const reservedSupplyOutput = new TokenSendRequest({
    cashaddr: walletAddress,
    value: 1000n,
    category: tokenId,
    amount: newReservedSupply
  });
const issuedSupplyOutput = new TokenSendRequest({
    cashaddr: destinationAddress,
    value: 1000n,
    category: tokenId,
    amount: issueAmount
  });
const outputs = [ reservedSupplyOutput, issuedSupplyOutput ];
console.log(outputs)

const { txId } = await wallet.send(outputs, { ensureUtxos: [authUtxo] });
console.log(txId)