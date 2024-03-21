<script setup>
import { ref, onMounted } from 'vue'
import { Background } from '@vue-flow/background'
import { Position, VueFlow, MarkerType, useVueFlow } from '@vue-flow/core'
import axios from 'axios'


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

const edges = ref([])

const as_info_query = ref({
  loading: true,
  query:`MATCH (a:AS {asn: $asn})-[h:DEPENDS_ON {af:4}]->(d:AS)
          WITH a, COLLECT(DISTINCT d) AS dependencies
          UNWIND dependencies as d
          MATCH p = allShortestPaths((a)-[:PEERS_WITH*]-(d))
          WHERE a.asn <> d.asn AND all(r IN relationships(p) WHERE r.af = 4) AND all(n IN nodes(p) WHERE n IN dependencies)
          RETURN p`
})    

const searchASN = async() => {

  allNodes.value = []
  allNodesPosition.value = []
  nodes.value = []
  allRelation.value = []
  edges.value = []

  let response = await axios_base.post('', {
    statements: [{statement: as_info_query.value.query, parameters:{ asn: Number(asn.value) }}]
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

  sortNodes(indexOfLargest)

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

}

const sortNodes = (index) => {

  nodes.values = []
  nodes.value.push({id: asn.value, type: 'input', label: `AS${asn.value}`, position: { x: 0, y: calculate(allNodes.value[index].length) } , sourcePosition: Position.Right})

  let x_index = 300

  for(let i=0 ; i!= allNodes.value.length ; i++) {

    if(allNodes.value[i].length  == 1){

      for(let j=0 ; j!= allNodes.value[i].length ; j++) {
        nodes.value.push({id: String(allNodes.value[i][j]), type: 'default', label: `AS${allNodes.value[i][j]}`, position: { x: x_index, y: calculate(allNodes.value[index].length) }, sourcePosition: Position.Right, targetPosition: Position.Left})
      }

    }else{

      for(let j=0 ; j!= allNodes.value[i].length ; j++) {
        nodes.value.push({id: String(allNodes.value[i][j]), type: 'default', label: `AS${allNodes.value[i][j]}`, position: { x: x_index, y: allNodesPosition.value[i][j] }, sourcePosition: Position.Right, targetPosition: Position.Left})
      }


    }

    x_index += 300

  }

  sortEdges()

}

onMounted(() => {
  asn.value = "55836"
  searchASN()
})

</script>

<template>


  <div class="search-div row">
    <q-input class="search-asn" filled v-model="asn" label="ASN"  />
    <q-btn @click=searchASN() color="primary" label="Search"  style="min-width: 120px; margin-left:20px;"/>
  </div>

  <VueFlow style="width: 900px; height: 600px" class="vueTest" :nodes="nodes" :edges="edges" fit-view-on-init>
    <Background patternColor="black" :gap=7 />
  </VueFlow>


      
</template>

<style>

.search-div {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 30px;
}

.vueTest{
  margin: 0 auto;
  margin-top: 30px;
  min-width: 400px;
  border: black solid 4px;
  
}



</style>

