<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>{{ t('scheduler') }}</h1>
      </v-col>
    </v-row>

    <!-- Список запланированных запусков -->
    <v-row>
      <v-col cols="12">
        <v-data-table
          :headers="headers"
          :items="schedules"
          class="elevation-1"
        >
          <template v-slot:item.actions="{ item }">
            <v-btn icon @click="editSchedule(item)">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon @click="deleteSchedule(item)">
              <v-icon color="red">mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-col>
    </v-row>

    <!-- Кнопка для добавления нового расписания -->
    <v-row>
      <v-col cols="12">
        <v-btn color="green" @click="addSchedule">{{ t('add_schedule') }}</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const headers = [
  { text: t('schedule_id'), value: 'id' },
  { text: t('schedule_name'), value: 'name' },
  { text: t('start_date'), value: 'start_date' },
  { text: t('actions'), value: 'actions', sortable: false },
];

const schedules = ref([
  { id: 'SC-001', name: 'Schedule 1', start_date: '2024-10-01' },
  { id: 'SC-002', name: 'Schedule 2', start_date: '2024-10-05' },
]);

const addSchedule = () => {
  // Логика добавления расписания
};

const editSchedule = (schedule) => {
  // Логика редактирования расписания
};

const deleteSchedule = (schedule) => {
  // Логика удаления расписания
};
</script>
