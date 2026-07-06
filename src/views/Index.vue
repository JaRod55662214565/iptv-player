<template>
  <player-optimized :value="value" :track="track" :visitInfo="visitInfo" />
</template>

<script setup>
import PlayerOptimized from "./PlayerOptimized.vue";

defineProps(["value", "track", "visitInfo"]);
</script>
