<template>
  <v-container class="login-container" fluid>
    <v-row align="center" justify="center" class="fill-height">
      <v-col cols="12" md="6" lg="4" class="d-flex justify-center">
        <v-card class="pa-4 login-card" elevation="10">
          <v-card-title class="text-h6 mb-1">{{ t('welcome') }}</v-card-title>
          <v-card-subtitle class="mb-4 text-subtitle-1">{{ t('login_prompt') }}</v-card-subtitle>

          <v-form>
            <v-text-field
              :label="t('username')"
              prepend-inner-icon="mdi-account"
              outlined
              dense
              v-model="username"
              class="mb-3"
            ></v-text-field>
            <v-text-field
              :label="t('password')"
              type="password"
              prepend-inner-icon="mdi-lock"
              outlined
              dense
              v-model="password"
              class="mb-3"
            ></v-text-field>
            <v-checkbox
              v-model="rememberMe"
              :label="t('remember_me')"
              dense
              class="mb-3 checkbox-align"
            ></v-checkbox>
            <v-btn color="darkgreen" block @click="login" class="mb-3">{{ t('login') }}</v-btn>
          </v-form>

          <v-divider></v-divider>

          <v-card-actions class="d-flex justify-center mt-3">
            <a href="#" @click="forgotPassword" class="green-text">{{ t('forgot_password') }}</a>
            <span>&nbsp;|&nbsp;</span>
            <a href="#" @click="register" class="green-text">{{ t('no_account') }}</a>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import axios from '../plugins/axios';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const username = ref('');
const password = ref('');
const rememberMe = ref(false);

function forgotPassword() {
  console.log('Redirect to forgot password page');
}

function register() {
  console.log('Redirect to registration page');
}

function login() {
  axios.post('http://localhost:8000/api/token/', {
    username: username.value,
    password: password.value
  })
  .then(response => {
    if (response.status === 200) {
      localStorage.setItem('authToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      window.location.href = '/mainlayout';  // Перенаправление на MainLayout
    }
  })
  .catch(error => {
    if (error.response && error.response.status === 401) {
      alert(t('invalid_credentials'));
    } else {
      alert(t('login_error'));
    }
  });
}

</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom right, #ffffff, #ffffff); /* Бело-зеленый градиент с более темным зеленым */
}

.login-card {
  border-radius: 12px;
  max-width: 360px;
  padding: 16px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.v-btn {
  margin-top: 8px;
  background-color: #357a38; /* Темный зеленый цвет */
  color: white;
}

.v-btn.text {
  color: #357a38;
}

.green-text {
  color: #357a38; /* Использование темно-зеленого цвета для гиперссылок */
  text-decoration: none;
}

.green-text:hover {
  text-decoration: underline;
}

.checkbox-align {
  display: flex;
  align-items: center;
}
</style>
