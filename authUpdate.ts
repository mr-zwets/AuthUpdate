import { Wallet, utf8ToBin, sha256, OpReturnData, TokenSendRequest, TestNetWallet, binToHex, toBch, type Utxo } from "mainnet-js";
import { queryAuthHead } from "./queryChainGraph.js";
// import { readFileSync } from "fs";
// const bcmrJsonFile = readFileSync("bitcoin-cash-metadata-registry.json", "utf8");
// let bcmrJsonString = bcmrJsonFile;

// note: when disabling 'fetchJsonFromUrl' uncomment the 3 lines above and comment out the line below
let bcmrJsonString: undefined | string

// Fill in these config variables

const tokenId = "";
// general config
const network = "mainnet"; // mainnet or chipnet
const fetchJsonFromUrl = true; // fetch the BCMR from https or IPFS
const keepReservedSupply = false; // keeps fungible tokens on AuthHead
// bcmrURL or bcmrIpfsCID
// note: when using 'fetchJsonFromUrl' this will be fetched and used as bcmrJsonString
const bcmrURL = ""; // https link 
const bcmrIpfsCID: string = "" // IPFS CID (baf...)
// wif or seedphase + derivationPathAddress
const wif = "";
const seedphase = "";
const derivationPathAddress = "m/44'/145'/0'/0/0"; // last number is the address index from electron cash

// start of the program code
const ipfsGateway = "https://w3s.link/ipfs/"
const blockexplorer = "https://explorer.electroncash.de/tx/"
const authHeadTxId = await queryAuthHead(tokenId);

const walletClass = network == "mainnet" ? Wallet : TestNetWallet;
if(!wif && !seedphase) throw new Error("provide either a wif or a seedphrase + derivationPathAddress");
let wallet: Wallet | undefined;
if(wif) {
  wallet = await walletClass.fromWIF(wif);
} else {
  // mainnet-js uses m/44'/0'/0'/0/0 by default so have to overwrite it
  wallet = await walletClass.fromSeed(seedphase, derivationPathAddress);
}
const walletAddress = wallet.getDepositAddress();
const balance = await wallet.getBalance();
console.log(`wallet address: ${walletAddress}`);
console.log(`Bch amount in walletAddress is ${toBch(balance)}bch or ${balance}sats`);
if(balance < 1000n) throw new Error("Not enough BCH to make the transaction!");

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
async function updateMetadata(
  authUtxo: Utxo, bcmrURL: string, bcmrIpfsCID: string
) {
  if(!wallet) throw new Error("Error creating wallet from wif or seedphrase");

  // Fetch the BCMR from https or IPFS if configured so
  if(fetchJsonFromUrl){
    let fetchLocation = bcmrURL? bcmrURL : bcmrIpfsCID;
    if(bcmrIpfsCID) fetchLocation = ipfsGateway + fetchLocation;
    if(bcmrURL && !bcmrURL.startsWith("https://")) fetchLocation = "https://"+fetchLocation;
    if(!bcmrURL.includes("/")) fetchLocation += "/.well-known/bitcoin-cash-metadata-registry.json";
    try {
      console.log("fetching the BCMR from "+fetchLocation)
      const response = await fetch(fetchLocation);
      bcmrJsonString = await response.text();
    } catch (error) {
      throw new Error("Error fetching the BCMR from "+fetchLocation);
    }
  }
  if(!bcmrJsonString) throw new Error("No bcmrJsonString available");

  try {
    // Construct opreturn output
    const hashContent = sha256.hash(utf8ToBin(bcmrJsonString));
    console.log("content hash: " + binToHex(hashContent))
    let onchainLocation = bcmrURL? bcmrURL : bcmrIpfsCID;
    if(bcmrIpfsCID) onchainLocation = "ipfs://"+onchainLocation;
    if(onchainLocation.startsWith("https://")) onchainLocation =onchainLocation.slice(8);
    console.log("onchain location: " + onchainLocation)
    const chunks = ["BCMR", hashContent, onchainLocation];
    let opreturnData = OpReturnData.fromArray(chunks);
    // Construct new AuthHead output
    let newAuthHead;
    const bchOnlyOutput = {cashaddr: walletAddress, value: 600n}
    const reservedSupplyOutput = new TokenSendRequest({
      cashaddr: walletAddress,
      value: 1000n,
      category: tokenId,
      amount: authUtxo?.token?.amount
    });
    newAuthHead = keepReservedSupply ? reservedSupplyOutput : bchOnlyOutput;
    const outputs = [ newAuthHead, opreturnData ];
    // Adding tokenChangeOutput prevents accidental token burning if authhead utxo holds tokens
    let tokenChangeOutput;
    if(authUtxo.token && !keepReservedSupply){
      tokenChangeOutput = authUtxo.token.amount? new TokenSendRequest({
        cashaddr: walletAddress,
        category: tokenId,
        amount: authUtxo.token.amount
      }) : new TokenSendRequest({
        cashaddr: walletAddress,
        category: tokenId,
        nft: {
          commitment: authUtxo.token.nft?.commitment,
          capability: authUtxo.token.nft?.capability
        }
      });
      outputs.push(tokenChangeOutput)
    }
    const { txId } = await wallet.send(outputs, { ensureUtxos: [authUtxo] });

    const displayId = `${authHeadTxId.slice(0, 20)}...${authHeadTxId.slice(-10)}`;
    console.log(`Published Auth update in tx ${displayId}, returned Auth to ${walletAddress} \n${blockexplorer + txId}`);
  } catch (error) {
    console.log(error);
  }
}
