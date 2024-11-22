<template>
  <v-app>
    <router-view></router-view>
  </v-app>
</template>

<script setup>
  import { ref } from 'vue';

  const isDarkTheme = ref(false);

  // Функция переключения темы
  const toggleTheme = () => {
    isDarkTheme.value = !isDarkTheme.value;
    if (isDarkTheme.value) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };
</script>
