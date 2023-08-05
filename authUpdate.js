import { Wallet, utf8ToBin, sha256, OpReturnData } from "mainnet-js";
import { queryAuthHead } from "./queryChainGraph";

// Fill in this variables
const tokenId = "";
// bcmrURL or bcmrIpfsCID
const bcmrURL = ""; // https link 
const bcmrIpfsCID = "" // IPFS CID (baf...)

const seedphase = "";
const derivationPathAddress = "m/44'/145'/0'/0/0"; // default for cashonize

// start of the program code
const chaingraphUrl = "https://gql.chaingraph.pat.mn/v1/graphql";
const authHeadTxId = await queryAuthHead(tokenId, chaingraphUrl);

// mainnet-js generates m/44'/0'/0'/0/0 by default so have to switch it
const wallet = await Wallet.fromSeed(seedphase, derivationPathAddress);
const walletAddress = wallet.getDepositAddress();
const balance = await wallet.getBalance();
console.log(`wallet address: ${walletAddress}`);
console.log(`Bch amount on server is ${balance.bch}bch or ${balance.sat}sats`);

let authUtxo;
const utxosWallet = await wallet.getUtxos();
utxosWallet.forEach(utxo => {
  if(utxo.txid == authHeadTxId && utxo.vout == 0) authUtxo = utxo;
})

if(!bcmrURL && !bcmrIpfsCID) throw new Error("provide the BCMR location on https or IPFS");
if(bcmrURL && bcmrIpfsCID) throw new Error("provide either a https or an IPFS location for the BCMR!");
if(bcmrIpfsCID & !bcmrIpfsCID.startsWith("baf")) throw new Error("the IPFS CID shold start with baf...");
if(!authUtxo) {
  console.log(authUtxo)
  updateMetadata(authUtxo, bcmrURL, bcmrIpfsCID);
} else {
  throw new Error("wallet does not hold the authority to update the metadata")
}

// Function sending the onchain metadata update transaction
async function updateMetadata(autUtxo, bcmrURL, bcmrIpfsCID) {
  try {
    let fetchLocation = bcmrURL? bcmrURL : bcmrIpfsCID;
    if(bcmrIpfsCID) "https://ipfs.io/ipfs/"+fetchLocation;
    if(bcmrURL & !bcmrURL.startsWith("https://")) "https://"+fetchLocation;
    const reponse = await fetch(fetchLocation);
    const bcmrContent = await reponse.text();
    const hashContent = sha256.hash(utf8ToBin(bcmrContent));
    let onchainLocation = "";
    if(bcmrIpfsCID) "ipfs://"+onchainLocation;
    if(bcmrURL & bcmrURL.startsWith("https://")) fetchLocation.slice(8);
    const chunks = ["BCMR", hashContent, onchainLocation];
    let opreturnData = OpReturnData.fromArray(chunks);

    const { txId } = await wallet.send([
      {
        cashaddr: walletAddress,
        value: 1000,
        unit: 'sats',
      },
      opreturnData
    ], { ensureUtxos: [autUtxo] });

    const displayId = `${authHeadTxId.slice(0, 20)}...${authHeadTxId.slice(-10)}`;
    console.log(`Published Auth update in tx ${displayId}, returned Auth to ${walletAddress} \n$https://explorer.bitcoinunlimited.info/tx/${txId}`);
  } catch (error) {
    console.log(error);
  }
}
