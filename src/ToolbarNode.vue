<script setup>
import { Handle, Position } from '@vue-flow/core'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { QCard } from 'quasar'

defineProps(['data', 'isMain', 'label', 'otherData'])

</script>

<template>

  <NodeToolbar
    style="display: flex; gap: 0.5rem; align-items: center"
    :is-visible="data.toolbarVisible"
    :position="data.toolbarPosition"
  >

  <QCard style="padding:10px" >

    <div  style="font-size:12px; margin:auto;">
      <div>Name: {{otherData.Name}}</div>
      <div>Country: {{otherData.Country}}</div>
      <div v-if="!isMain" >Hegemony: {{otherData.HEGE.toFixed(5)}} %</div>
    </div>

  </QCard>

  </NodeToolbar>

  <div>
    {{ label }}
  </div>

  <Handle type="target" :position="Position.Left" />
  <Handle type="source" :position="Position.Right" />
</template>
