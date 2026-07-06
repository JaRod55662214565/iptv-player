<template>
  <player-optimized :value="value" :track="track" />
</template>

<script setup>
import PlayerOptimized from "./PlayerOptimized.vue";

defineProps(["value", "track"]);
</script>
