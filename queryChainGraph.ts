import { graphql, ChaingraphClient } from "chaingraph-ts";

const chaingraphUrl = "https://gql.chaingraph.pat.mn/v1/graphql";
const chaingraphClient = new ChaingraphClient(chaingraphUrl);

export async function queryAuthHead(tokenId:string){
  const queryReqAuthHead = graphql(`query authHead(
    $tokenId: bytea!
  ){
    transaction(
      where: {
        hash: {
          _eq: $tokenId
        }
      }
    ) {
      authchains {
        authhead {
          hash
        }
      }
    }
  }`);
  const result = await chaingraphClient.query(queryReqAuthHead, {tokenId: `\\x${tokenId}`});
  if(!result.data) throw new Error("No data returned from chaingraph");
  const resultTxId = result.data?.transaction[0].authchains[0].authhead?.hash;
  if(!resultTxId) throw new Error("No TxId returned from chaingraph");
  return resultTxId.slice(2);
}
