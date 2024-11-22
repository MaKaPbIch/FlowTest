<template>
  <v-dialog v-model="internalDialog" max-width="600px">
    <v-card>
      <v-card-title>
        <span class="headline">Создать новый проект</span>
      </v-card-title>
      <v-card-text>
        <v-form ref="form">
          <v-text-field
            label="Название проекта"
            v-model="name"
            required
          />
          <v-textarea
            label="Описание проекта"
            v-model="description"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="close">Отмена</v-btn>
        <v-btn color="blue darken-1" text @click="createProject">Создать</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Snackbar для уведомлений -->
  <v-snackbar v-model="snackbar.visible" :color="snackbar.color" :timeout="snackbar.timeout" @timeout="snackbar.visible = false">
    {{ snackbar.message }}
  </v-snackbar>
</template>

<script>
import axios from '../plugins/axios';

export default {
  emits: ['update:dialog', 'refresh', 'create'],
  props: {
    dialog: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      internalDialog: this.dialog,
      name: '',
      description: '',
      snackbar: {
        visible: false,
        message: '',
        color: 'success',
        timeout: 3000
      }
    };
  },
  watch: {
    dialog(val) {
      this.internalDialog = val;
    },
    internalDialog(val) {
      this.$emit('update:dialog', val);
    }
  },
  methods: {
    close() {
      this.internalDialog = false;
      this.resetForm();
    },
    createProject() {
      if (this.name) {
        console.log('Создание проекта начато');
        const newProject = {
          name: this.name,
          description: this.description
        };
        
        // Получаем токен из локального хранилища или другого места
        const token = localStorage.getItem('authToken');
        
        axios.post('/api/projects/', newProject, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          console.log('Проект успешно создан:', response.data);
          this.$emit('refresh');
          this.close();
          this.showNotification('Проект успешно создан', 'success');
        })
        .catch(error => {
          console.error('Ошибка при создании проекта:', error.response ? error.response.data : error);
          this.showNotification('Ошибка при создании проекта', 'error');
        });
      } else {
        console.warn('Название проекта не указано');
        this.showNotification('Название проекта не указано', 'warning');
      }
    },
    resetForm() {
      this.name = '';
      this.description = '';
    },
    showNotification(message, type) {
      this.snackbar.message = message;
      this.snackbar.color = type === 'success' ? 'green' : type === 'error' ? 'red' : 'orange';
      this.snackbar.visible = true;
    }
  },
};
</script>
