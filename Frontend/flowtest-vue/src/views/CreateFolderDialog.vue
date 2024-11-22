<template>
  <v-dialog v-bind:model-value="dialog" @update:model-value="$emit('update:dialog', $event)" max-width="400px">
    <v-card>
      <v-card-title>Создать папку</v-card-title>
      <v-card-text>
        <v-text-field label="Название папки" v-model="folderName" />
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="createFolder">Создать</v-btn>
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
    projectId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      folderName: '',
    };
  },
  methods: {
    createFolder() {
      if (!this.folderName.trim()) {
        console.warn('Название папки не может быть пустым.');
        return;
      }

      axios
        .post('/api/folders/', {
          name: this.folderName,
          project: this.projectId,
        })
        .then(() => {
          this.$emit('refresh'); // Обновление списка папок
          this.$emit('update:dialog', false); // Закрытие диалога
        })
        .catch((error) => {
          console.error('Ошибка создания папки:', error);
        });
    },
  },
};
</script>
