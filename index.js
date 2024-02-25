const axios = require('axios');
const IYP_URL = "https://iyp.iijlab.net/iyp/db/neo4j/tx/"
const ASN = 2501

const main = async() => {

  let CYPHER_QUERY = {
    "statements": [{
				"statement":
        ` 
        MATCH (n:AS {asn: $asn})--(p:Prefix)
        WITH COLLECT(DISTINCT p.prefix) AS prefixes
        MATCH (n:AS)--(p:Prefix)
        WHERE p.prefix IN prefixes AND n.asn <> $asn
        WITH p.prefix AS Prefix, COLLECT(DISTINCT n.asn) AS ASNs
        RETURN Prefix, ASNs
        `,
  			"parameters": {"asn": ASN}
  	}]
  }

  let response = await axios.post(IYP_URL, CYPHER_QUERY)

  let uniquePrefix = []
  let uniqueASN = []
  let asnNames = {}

  for(const data of response.data.results[0].data){
    
    uniquePrefix.push(data.row[0])
    for(const asn of data.row[1]){
    
      if(!(uniqueASN.includes(asn))){
        uniqueASN.push(asn)
      }

    }

  }

  CYPHER_QUERY = {
    "statements": [{
				"statement":
        ` 
        MATCH (a:AS)
        WHERE a.asn IN $asns
        OPTIONAL MATCH (a)-[:NAME {reference_org:'PeeringDB'}]->(pdbn:Name)
        OPTIONAL MATCH (a)-[:NAME {reference_org:'BGP.Tools'}]->(btn:Name)
        OPTIONAL MATCH (a)-[:NAME {reference_org:'RIPE NCC'}]->(ripen:Name)
        WITH a.asn AS asn,
             COALESCE(pdbn.name, btn.name, ripen.name) AS PreferredName
        RETURN asn, PreferredName
        `,
  			"parameters": {"asns": uniqueASN}
  	}]
  }

  response = await axios.post(IYP_URL, CYPHER_QUERY)
  for(const data of response.data.results[0].data){
    asnNames[data.row[0]] = data.row[1]
  }

  console.log(asnNames)
  

}

main()