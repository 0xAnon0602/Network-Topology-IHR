<script setup>
import { ref, onMounted } from 'vue'
import { Background } from '@vue-flow/background'
import { Position, VueFlow, MarkerType } from '@vue-flow/core'
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

const edges = ref([])

const as_info_query = ref({
  loading: true,
  query: `MATCH (a:AS {asn: $asn})-[d:DEPENDS_ON]->(b:AS)
          WHERE a<>b 
          RETURN d.hege*100 AS Hege, b.asn AS B`,
})

const searchASN = async() => {

  let response = await axios_base.post('', {
    statements: [{statement: as_info_query.value.query, parameters:{ asn: Number(asn.value) }}]
  })

  const rows = response.data.results
  const res = []
  for (let i=0; i<rows.length; i++) {
    res.push(formatResponse(rows[i]))
  }

  sortNodes(res[0])

}

const sortEdges = (res) => {

  let index = 1
  while(index != nodes.value.length) {
      edges.value.push({ id: `e1-${nodes.value[index].id}`, label: `${res[index-1].Hege.toFixed(2)}%`, source: '1', target: nodes.value[index].id, animated: true, markerEnd: MarkerType.ArrowClosed})
      index++
  } 

}

const sortNodes = (res) => {

  if(res.length > 0) {

    nodes.value = []
    edges.value = []

    nodes.value.push( {id: '1', type: 'input', label: `AS${asn.value}`, position: { x: -100, y: calculate(res.length) } , sourcePosition: Position.Right, dimensions: {"height":0, "width":0}})
  
    let y_axis = 0
    let id = 2

    for(const node of res) {
      nodes.value.push( {id: String(id), type: 'output',label: `AS${String(node.B)}`, position: { x: 400, y: y_axis } , targetPosition: Position.Left})
      y_axis+=50
      id++
    }

    sortEdges(res)

}

}

onMounted(() => {
  asn.value = "2497"
  searchASN()
})

</script>

<template>


  <div class="search-div row">
    <q-input class="search-asn" filled v-model="asn" label="ASN"  />
    <q-btn @click=searchASN() color="primary" label="Search"  style="min-width: 120px; margin-left:20px;"/>
  </div>

  <VueFlow style="width: 900px; height: 600px"  class="vueTest" :nodes="nodes" :edges="edges" fit-view-on-init>
    <Background   :gap=6  />
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
  
}



</style>
