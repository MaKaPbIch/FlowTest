<template>
    <v-container>
      <v-row>
        <v-col cols="12" md="8" class="profile-settings">
          <v-card elevation="3" class="rounded-card">
            <v-card-title class="card-title">
              <v-icon color="primary" class="mr-3">mdi-account-circle</v-icon>
              <span class="text-h5">Настройки профиля</span>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text>
              <v-form>
                <v-text-field
                  v-model="user.name"
                  label="Имя"
                  outlined
                  required
                  color="primary"
                  class="input-field"
                />
                <v-text-field
                  v-model="user.email"
                  label="Электронная почта"
                  outlined
                  required
                  color="primary"
                  class="input-field"
                />
                <v-text-field
                  v-model="user.phone"
                  label="Телефон"
                  outlined
                  color="primary"
                  class="input-field"
                />
                <v-file-input
                  v-model="user.avatar"
                  label="Аватар"
                  accept="image/*"
                  outlined
                  color="primary"
                  class="input-field"
                />
                <v-btn color="primary" @click="saveSettings" class="save-btn" elevation="2">
                  <v-icon left>mdi-content-save</v-icon>Сохранить настройки
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </template>
  
  <script>
  export default {
    data() {
      return {
        projects: [],
        user: {
          name: '',
          email: '',
          phone: '',
          avatar: null,
        },
      };
    },
    methods: {
      saveSettings() {
        // TODO: Реализовать логику сохранения настроек пользователя
        console.log('Настройки сохранены', this.user);
      },
    },
  };
  </script>
  
  <style scoped>
  .profile-settings {
    margin: 40px auto;
    max-width: 600px;
  }
  .rounded-card {
    border-radius: 12px;
  }
  .card-title {
    display: flex;
    align-items: center;
    padding-bottom: 0;
  }
  .input-field {
    margin-bottom: 20px;
  }
  .save-btn {
    width: 100%;
    margin-top: 20px;
    border-radius: 8px;
  }
  </style>