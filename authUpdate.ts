import { Wallet, utf8ToBin, sha256, OpReturnData, TokenSendRequest, TestNetWallet } from "mainnet-js";
import { queryAuthHead } from "./queryChainGraph.js";

// Fill in this variables
const tokenId = "";
// bcmrURL or bcmrIpfsCID
const bcmrURL = ""; // https link 
const bcmrIpfsCID: string = "" // IPFS CID (baf...)
const network = "mainnet"; // mainnet or chipnet
const seedphase = "";
const derivationPathAddress = "m/44'/145'/0'/0/0"; // last number is the address index from electron cash
const keepReservedSupply = false; // keeps fungible tokens on AuthHead

// start of the program code
const chaingraphUrl = "https://gql.chaingraph.pat.mn/v1/graphql";
const authHeadTxId = await queryAuthHead(tokenId, chaingraphUrl);

// mainnet-js generates m/44'/0'/0'/0/0 by default so have to switch it
const walletClass = network == "mainnet" ? Wallet : TestNetWallet;
const wallet = await walletClass.fromSeed(seedphase, derivationPathAddress);
const walletAddress = wallet.getDepositAddress();
const balance = await wallet.getBalance();
if(typeof balance == "number" || !balance?.sat) throw new Error("Error in getBalance")
console.log(`wallet address: ${walletAddress}`);
console.log(`Bch amount in walletAddress is ${balance.bch}bch or ${balance.sat}sats`);
if(balance.sat < 1000) throw new Error("Not enough BCH to make the transaction!");

let authUtxo;
const utxosWallet = await wallet.getUtxos();
utxosWallet.forEach(utxo => {
  if(utxo.txid == authHeadTxId && utxo.vout == 0) authUtxo = utxo;
})
console.log(`The authHead is the first output of the transaction with id ${authHeadTxId}`);

if(!bcmrURL && !bcmrIpfsCID) throw new Error("provide the BCMR location on https or IPFS");
if(bcmrURL && bcmrIpfsCID) throw new Error("provide either a https or an IPFS location for the BCMR!");
if(bcmrIpfsCID && !bcmrIpfsCID.startsWith("baf")) throw new Error("the IPFS CID shold start with baf...");
if(authUtxo) {
  console.log(authUtxo)
  updateMetadata(authUtxo, bcmrURL, bcmrIpfsCID);
} else {
  throw new Error("wallet does not hold the authority to update the metadata")
}

// Function sending the onchain metadata update transaction
async function updateMetadata(authUtxo, bcmrURL, bcmrIpfsCID) {
  try {
    // Construct opreturn output
    let fetchLocation = bcmrURL? bcmrURL : bcmrIpfsCID;
    if(bcmrIpfsCID) fetchLocation = "https://ipfs.io/ipfs/"+fetchLocation;
    if(bcmrURL && !bcmrURL.startsWith("https://")) fetchLocation = "https://"+fetchLocation;
    const reponse = await fetch(fetchLocation);
    const bcmrContent = await reponse.text();
    const hashContent = sha256.hash(utf8ToBin(bcmrContent));
    let onchainLocation = bcmrURL? bcmrURL : bcmrIpfsCID;
    if(bcmrIpfsCID) onchainLocation = "ipfs://"+onchainLocation;
    if(onchainLocation.startsWith("https://")) onchainLocation =onchainLocation.slice(8);
    const chunks = ["BCMR", hashContent, onchainLocation];
    let opreturnData = OpReturnData.fromArray(chunks);
    // Construct new AuthHead output
    let newAuthHead;
    const bchOnlyOutput = {cashaddr: walletAddress, value: 600, unit: 'sats'}
    const reservedSupplyOutput = new TokenSendRequest({
      cashaddr: walletAddress,
      value: 1000,
      tokenId: tokenId,
      amount: authUtxo?.token?.amount
    });
    newAuthHead = keepReservedSupply ? reservedSupplyOutput : bchOnlyOutput;
    const outputs = [ newAuthHead, opreturnData ];
    // Adding tokenChangeOutput prevents accidental token burning if authhead utxo holds tokens
    let tokenChangeOutput;
    if(authUtxo.token && !keepReservedSupply){
      tokenChangeOutput = authUtxo.token.amount? new TokenSendRequest({
        cashaddr: walletAddress,
        tokenId: tokenId,
        amount: authUtxo.token.amount
      }) : new TokenSendRequest({
        cashaddr: walletAddress,
        tokenId: tokenId,
        commitment: authUtxo.token.commitment,
        capability: authUtxo.token.capability
      });
      outputs.push(tokenChangeOutput)
    }
    const { txId } = await wallet.send(outputs, { ensureUtxos: [authUtxo] });

    const displayId = `${authHeadTxId.slice(0, 20)}...${authHeadTxId.slice(-10)}`;
    console.log(`Published Auth update in tx ${displayId}, returned Auth to ${walletAddress} \n$https://explorer.bitcoinunlimited.info/tx/${txId}`);
  } catch (error) {
    console.log(error);
  }
}
