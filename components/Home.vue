<script setup>
const tab = ref(null);
</script>
<template>
  <v-card>
    <v-tabs fixed-tabs v-model="tab" bg-color="primary">
      <v-tab value="one">Donate Data</v-tab>
      <v-tab value="two">Setting</v-tab>
    </v-tabs>
    <v-card-text>
      <v-window v-model="tab">
        <v-window-item value="one"> <Donate /></v-window-item>
        <v-window-item value="two"> <Account /> </v-window-item>
      </v-window>
    </v-card-text>
  </v-card>
</template>
