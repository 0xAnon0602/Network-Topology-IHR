
<script setup>
import { ref, inject } from 'vue'
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


const nodes = ref([
  { id: '1', type: 'input', label: 'Node 1', position: { x: 100, y: 100 } , sourcePosition: Position.Right},
  { id: '2', type: 'output',label: 'Node 2', position: { x: 400, y: 0 } , targetPosition: Position.Left},
  { id: '3', type: 'output',label: 'Node 3', position: { x: 400, y: 100 } , targetPosition: Position.Left},
  { id: '4', type: 'output',label: 'Node 4', position: { x: 400, y: 200 } , targetPosition: Position.Left},

])

const edges = ref([
  { id: 'e1-2', source: '1', target: '2', animated: true, markerEnd: MarkerType.ArrowClosed},
  { id: 'e1-3', source: '1', target: '3', animated: true, markerEnd: MarkerType.ArrowClosed},
  { id: 'e3-4', source: '1', target: '4', animated: true, markerEnd: MarkerType.ArrowClosed},
])

// const nodes = ref([])

// const edges = ref([])

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

  console.log(res)

  return res


}


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
