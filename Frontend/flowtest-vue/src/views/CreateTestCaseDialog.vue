<template>
  <v-dialog v-bind:model-value="dialog" @update:model-value="$emit('update:dialog', $event)" max-width="500px">
    <v-card>
      <v-card-title>Создать тест-кейс</v-card-title>
      <v-card-text>
        <v-text-field label="Название тест-кейса" v-model="testCaseTitle" />
        <v-textarea label="Описание" v-model="testCaseDescription" rows="4" />
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="createTestCase">Создать</v-btn>
        <v-btn text @click="$emit('update:dialog', false)">Отмена</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import axios from '../plugins/axios';

export default {
  props: {
    dialog: {
      type: Boolean,
      required: true,
    },
    folderId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      testCaseTitle: '',
      testCaseDescription: '',
    };
  },
  methods: {
    createTestCase() {
      if (!this.testCaseTitle || !this.folderId) {
        console.warn('Название тест-кейса и папка обязательны.');
        return;
      }

      axios
        .post('/api/testcases/', {
          title: this.testCaseTitle,
          description: this.testCaseDescription,
          folder_id: this.folderId,
        })
        .then(() => {
          this.$emit('refresh');
          this.$emit('update:dialog', false);
        })
        .catch((error) => {
          console.error('Ошибка создания тест-кейса:', error);
        });
    },
  },
};
</script>
