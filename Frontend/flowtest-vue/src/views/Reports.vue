<template>
    <v-container>
      <v-row>
        <v-col cols="12">
          <h1>{{ t('reports') }}</h1>
        </v-col>
      </v-row>
  
      <!-- Таблица с отчетами -->
      <v-row>
        <v-col cols="12">
          <v-data-table
            :headers="headers"
            :items="reports"
            class="elevation-1"
          >
            <template v-slot:item.actions="{ item }">
              <v-btn icon @click="viewReport(item)">
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-col>
      </v-row>
    </v-container>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  
  const { t } = useI18n();
  
  const headers = [
    { text: t('report_id'), value: 'id' },
    { text: t('report_name'), value: 'name' },
    { text: t('created_date'), value: 'created_date' },
    { text: t('actions'), value: 'actions', sortable: false },
  ];
  
  const reports = ref([
    { id: 'RP-001', name: 'Report 1', created_date: '2024-09-01' },
    { id: 'RP-002', name: 'Report 2', created_date: '2024-09-05' },
  ]);
  
  const viewReport = (report) => {
    // Логика просмотра отчёта
  };
  </script>
  