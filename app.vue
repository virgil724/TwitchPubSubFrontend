<script setup>
const user = useSupabaseUser();
</script>

<template>
  <v-container style="padding: 50px 0 100px 0">
    <Account v-if="user" />
    <Auth v-else />
  </v-container>
</template>
