<script setup>
import { ref, onMounted } from 'vue'
import { Background } from '@vue-flow/background'
import { Position, VueFlow, MarkerType, useVueFlow, Panel } from '@vue-flow/core'
import ToolbarNode from './ToolbarNode.vue'
import axios from 'axios'
import { QSpinner, QSelect } from 'quasar'

const { onNodeClick , onNodeMouseEnter, onNodeMouseLeave} = useVueFlow()
const IYP_API_BASE = 'https://iyp.iijlab.net/iyp/db/neo4j/tx/'
const DEFAULT_TIMEOUT = 180000

const axios_base = axios.create({
  baseURL: IYP_API_BASE,
  timeout: DEFAULT_TIMEOUT,
})

const asn = ref()

const formatResponse = (results) => {
  const list = []
  const keys = results.columns
  for (let i=0; i<results.data.length; i++) {
    const obj = {}
    for (let j=0; j<keys.length; j++) {
      obj[keys[j]] = results.data[i].row[j]
    }
    list.push(obj)
  }
  return list
}

function calculate(input) {
  let sum = 0;
  for (let i = 1; i <= input; i++) {
    sum += 50 * (i - 1);
  }
  return sum / input;
}

const nodes = ref([])
const allNodes = ref([])
const allNodesPosition = ref([])
const allRelation = ref([])
const asInfo = ref({})
const edges = ref([])

const ipVersionOptions = ref(["IPv4","IPv6"])
const ipVersion = ref("IPv4")


const as_info_query = ref({
  loading: false,
  query:`MATCH (a:AS {asn: $asn})-[h:DEPENDS_ON {af:$af}]->(d:AS)
          WITH a, COLLECT(DISTINCT d) AS dependencies
          UNWIND dependencies as d
          MATCH p = allShortestPaths((a)-[:PEERS_WITH*]-(d))
          WHERE a.asn <> d.asn AND all(r IN relationships(p) WHERE r.af = $af) AND all(n IN nodes(p) WHERE n IN dependencies)
          RETURN p`,

  query2:`MATCH (a:AS)
          WHERE a.asn in $asns
          OPTIONAL MATCH (a)-[:NAME {reference_org:'PeeringDB'}]->(pdbn:Name)
          OPTIONAL MATCH (a)-[:NAME {reference_org:'BGP.Tools'}]->(btn:Name)
          OPTIONAL MATCH (a)-[:NAME {reference_org:'RIPE NCC'}]->(ripen:Name)
          OPTIONAL MATCH (a)-[:NAME]->(n:Name)
          OPTIONAL MATCH (a)-[:MEMBER_OF]->(ixp:IXP)-[:COUNTRY]-(ixp_country:Country)
          OPTIONAL MATCH (a)-[:COUNTRY {reference_name: 'nro.delegated_stats'}]->(c:Country)
          RETURN a.asn AS ASN ,c.country_code AS CC, c.name AS Country, COALESCE(pdbn.name, btn.name, ripen.name) AS Name, count(DISTINCT ixp) as nb_ixp`,
 
  query3:`MATCH  (a:AS {asn:$asn})-[d:DEPENDS_ON {af: $af}]-> (b:AS)
          WHERE a<>b 
          RETURN a.asn AS ASN1,d.hege*100 AS HEGE,b.asn AS ASN2`

})    

const searchASN = async() => {

  allNodes.value = []
  allNodesPosition.value = []
  nodes.value = []
  allRelation.value = []
  edges.value = []
  asInfo.value = {}
  as_info_query.value.loading = true

  let uniqueASNs = []

  const response = await axios_base.post('', {
    statements: [{statement: as_info_query.value.query, parameters:{ asn: Number(asn.value), af:Number(ipVersion.value[3])}}]
  })

  const rows = response.data.results
  const res = []
  for (let i=0; i<rows.length; i++) {
    res.push(formatResponse(rows[i]))
  }

  for(const result of res){

    for(const connection of result) {

      let nodeCount = 0
      let previousASN = Number(asn.value)
      
      for(const finalConnection of connection.p) {

        if((Object.keys(finalConnection)).length != 1 ){
          
          if(!(uniqueASNs.includes(finalConnection.asn1))){
            uniqueASNs.push(finalConnection.asn1);
          }

          if(!(uniqueASNs.includes(finalConnection.asn2))){
            uniqueASNs.push(finalConnection.asn2);
          }

          allRelation.value.push([finalConnection.asn1, finalConnection.asn2])

          if(allNodes.value[nodeCount] == undefined) {allNodes.value[nodeCount] = []}
          
            if (finalConnection.asn1 !== previousASN) {

              if(!(allNodes.value[nodeCount].includes(finalConnection.asn1))){

                if(nodeCount!=0){
                  if(!(allNodes.value[nodeCount-1].includes(finalConnection.asn1))){
                    allNodes.value[nodeCount].push(finalConnection.asn1);
                    previousASN = finalConnection.asn1
                  }
                }else {
                    allNodes.value[nodeCount].push(finalConnection.asn1);
                    previousASN = finalConnection.asn1
                }
              
              }
            
            }

            else if (finalConnection.asn2 !== previousASN) {

              if(!(allNodes.value[nodeCount].includes(finalConnection.asn2))){

                if(nodeCount!=0){
                  if(!(allNodes.value[nodeCount-1].includes(finalConnection.asn2))){
                    allNodes.value[nodeCount].push(finalConnection.asn2);
                    previousASN = finalConnection.asn2
                  }
                }else {
                    allNodes.value[nodeCount].push(finalConnection.asn2);
                    previousASN = finalConnection.asn2
                }

              }            
            }


          nodeCount++;

        }

      }

    }

  }

  try{

    const indexOfLargest = allNodes.value.reduce((maxIndex, currentElement, currentIndex, array) => {
    return currentElement.length > array[maxIndex].length ? currentIndex : maxIndex;}, 0); 

    allNodesPosition.value = Array.from({ length: allNodes.value.length }, () => []);

    let position_y = 0
    
    for(let i=0; i!= allNodes.value[indexOfLargest].length; i++) {
      allNodesPosition.value[indexOfLargest].push(position_y)
      position_y += 50
    }

    for(let i=0; i!=allNodesPosition.value.length; i++) {

      if(i != indexOfLargest) {

        const increase = position_y /( allNodes.value[i].length + 1)
        let inital_y = increase

        for(let j=0; j!= allNodes.value[i].length; j++) {
          allNodesPosition.value[i].push(inital_y)
          inital_y += increase
        }      

      }

    }

    const response2 = await axios_base.post('', {
        statements: [{statement: as_info_query.value.query2, parameters:{ asns: uniqueASNs }}]
    })

    const rows2 = response2.data.results
    const res2 = []
    for (let i=0; i<rows2.length; i++) {
      res2.push(formatResponse(rows2[i]))
    }

    for(const result of res2[0]){
      asInfo.value[result.ASN] = result
    }

    const  response3 = await axios_base.post('', {
        statements: [{statement: as_info_query.value.query3, parameters:{ asn: Number(asn.value),af:Number(ipVersion.value[3]) }}]
    })

    const rows3 = response3.data.results
    const res3 = []
    for (let i=0; i<rows3.length; i++) {
      res3.push(formatResponse(rows3[i]))
    }

    for(const result of res3[0]){
      asInfo.value[result.ASN2].HEGE = result.HEGE
    }

    sortNodes(indexOfLargest)

    let nodesString = []

    for(const nodes of allNodes.value){
        for(const node of nodes){
          nodesString.push(String(node))
        }
    }

  }catch(e){
    as_info_query.value.loading = false
  }

}

const sortEdges = () => {

  for(const rel of allRelation.value) {

    let index1 = 0
    let index2 = 0

    for(let i=0;i!=allNodes.value.length;i++){

      if(allNodes.value[i].includes(rel[0])){
        index1 = i+1
      }

      if(allNodes.value[i].includes(rel[1])){
        index2 = i+1
      }

    }


    if(index2 > index1){
      edges.value.push({ id: `${rel[0]}-${rel[1]}`, style: { stroke: 'orange' }, source: String(rel[0]), target: String(rel[1]), animated: true})
    }
    else if(index1 > index2){
      edges.value.push({ id: `${rel[1]}-${rel[0]}`, style: { stroke: 'orange' }, source: String(rel[1]), target: String(rel[0]), animated: true})
    }

  
  }

  as_info_query.value.loading = false

}

const sortNodes = (index) => {

  nodes.values = []
  nodes.value.push({id: asn.value, type: 'default', label: `AS${asn.value}`, position: { x: 0, y: calculate(allNodes.value[index].length) }, data: { toolbarPosition: Position.Top, toolbarVisible: false }})

  let x_index = 300

  for(let i=0 ; i!= allNodes.value.length ; i++) {

    if(allNodes.value[i].length  == 1){

      for(let j=0 ; j!= allNodes.value[i].length ; j++) {
        nodes.value.push({id: String(allNodes.value[i][j]), type: 'default', label: `AS${allNodes.value[i][j]}`, position: { x: x_index, y: calculate(allNodes.value[index].length) }, data: { toolbarPosition: Position.Top, toolbarVisible: false }})
      }

    }else{

      for(let j=0 ; j!= allNodes.value[i].length ; j++) {
        nodes.value.push({id: String(allNodes.value[i][j]), type: 'default', label: `AS${allNodes.value[i][j]}`, position: { x: x_index, y: allNodesPosition.value[i][j] }, data: { toolbarPosition: Position.Top, toolbarVisible: false }})
      }

    }

    x_index += 300

  }

  sortEdges()

}

onNodeClick(({ node }) => {
  asn.value = node.id
  searchASN()
})

onNodeMouseEnter(({ node }) => {
  node.data.toolbarVisible = true;
  }
)

onNodeMouseLeave(({ node }) => {
  node.data.toolbarVisible = false;
  }
)


onMounted(() => {
  asn.value = "55836"
  searchASN()
})

</script>

<template>


  <div class="search-div row">
    <q-input class="search-asn" filled v-model="asn" label="ASN"  />
    <q-select style="margin-left:20px;"filled v-model="ipVersion" :options="ipVersionOptions" label="IP" />
    <q-btn @click=searchASN() color="primary" label="Search"  style="min-width: 120px; margin-left:20px;"/>
  </div>
  <h6> Network Topology Overview </h6>


  <VueFlow v-if="allNodes.length != 0 && !as_info_query.loading"  class="vueTest" :nodes="nodes" :edges="edges" fit-view-on-init>
    
    <template #node-default="nodeProps">
      <ToolbarNode :data="nodeProps.data" :otherData="asInfo[Number(nodeProps.id)]" :label="nodeProps.label"  :isMain="nodeProps.id == asn ? true:false" />
    </template>
    
    <Background patternColor="black" :gap=7 />

  </VueFlow>

  <div v-if="as_info_query.loading" class="loading-spinner">
    <QSpinner color="secondary" size="5em" />
  </div>


  <div v-if="!as_info_query.loading && allNodes.length == 0" class="loading-spinner">
    <h4> No Data Found </h4>
  </div>

      
</template>

<style>

.search-div {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 30px;
}

h6 {
  text-decoration: underline;
  margin-top: 20px;
  margin-bottom: 25px;
}

.vueTest{
  margin: 0 auto;
  border: black solid 4px;
  width: 75%;
  height: 75%;
}

.loading-spinner{
  margin-top: 200px;
}

.vue-flow__node:hover  {
  fill: red;
}




</style>

