<template>
  <v-app :class="{'dark-theme': isDark}">
    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12" md="8" offset-md="2">
            <v-card class="settings-card">
              <v-card-title class="settings-title">
                <v-icon large class="mr-3">mdi-cog</v-icon>Настройки
                <v-icon @click="closeSettings" class="close-button" role="button" tabindex="0">mdi-close</v-icon>
              </v-card-title>
              <v-card-subtitle class="settings-subtitle">
                Настройте параметры вашего приложения для персонализации опыта использования.
              </v-card-subtitle>
              <v-card-text>
                <v-row>
                  <v-col cols="12">
                    <div class="custom-switch stylish-field">
                      <label for="isDark" class="custom-label">Темная тема</label>
                      <input type="checkbox" id="isDark" v-model="isDark" class="custom-checkbox" />
                      <span class="slider"></span>
                    </div>
                    <v-divider class="my-4"></v-divider>
                    <div class="custom-select stylish-field">
                      <label for="language" class="custom-label">Язык интерфейса</label>
                      <select id="language" v-model="language" class="custom-dropdown">
                        <option v-for="lang in languages" :key="lang" :value="lang">{{ lang }}</option>
                      </select>
                    </div>
                    <div class="custom-select stylish-field">
                      <label for="timezone" class="custom-label">Часовой пояс</label>
                      <select id="timezone" v-model="timezone" class="custom-dropdown">
                        <option v-for="zone in timezones" :key="zone" :value="zone">{{ zone }}</option>
                      </select>
                    </div>
                    <div class="custom-switch stylish-field">
                      <label for="notifications" class="custom-label">Уведомления</label>
                      <input type="checkbox" id="notifications" v-model="notifications" class="custom-checkbox" />
                      <span class="slider"></span>
                    </div>
                    <v-divider class="my-4"></v-divider>
                    <div class="custom-select stylish-field">
                      <label for="defaultProject" class="custom-label">Проект по умолчанию</label>
                      <select id="defaultProject" v-model="defaultProject" class="custom-dropdown">
                        <option v-for="project in projects" :key="project" :value="project">{{ project }}</option>
                      </select>
                    </div>
                    <v-divider class="my-4"></v-divider>
                    <div class="custom-text stylish-field">
                      <label for="gitIntegration" class="custom-label">Интеграция с Git (URL)</label>
                      <input type="text" id="gitIntegration" v-model="gitIntegration" class="custom-input" />
                    </div>
                    <div class="custom-switch stylish-field">
                      <label for="autoTestExecution" class="custom-label">Автоматическое выполнение тестов</label>
                      <input type="checkbox" id="autoTestExecution" v-model="autoTestExecution" class="custom-checkbox" />
                      <span class="slider"></span>
                    </div>
                  </v-col>
                </v-row>
                <v-btn color="success" @click="saveSettings" class="mt-4 modern-button stylish-button" block>
                  Сохранить изменения
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  methods: {
    closeSettings() {
      this.$emit('close-settings');
      this.$router.back();
    },    saveSettings() {
      console.log('Настройки сохранены:', {
        isDark: this.isDark,
        language: this.language,
        timezone: this.timezone,
        notifications: this.notifications,
        defaultProject: this.defaultProject,
        gitIntegration: this.gitIntegration,
        autoTestExecution: this.autoTestExecution
      });
    }
  }
};
</script>

<style scoped>
.settings-card {
  margin-top: 40px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  background-color: #ffffff;
}
.settings-title {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: 24px;
  justify-content: space-between;
}
.settings-subtitle {
  font-size: 16px;
  color: #6b6b6b;
  margin-bottom: 16px;
}
.dark-theme {
  background-color: #121212;
  color: #ffffff;
}
.my-4 {
  margin-top: 16px;
  margin-bottom: 16px;
}
.v-btn.modern-button {
  border-radius: 12px;
  font-weight: bold;
  text-transform: uppercase;
  transition: background-color 0.3s;
}
.v-btn.modern-button:hover {
  background-color: #3e8e41;
}
.custom-switch {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
}
.custom-label {
  margin-right: auto;
  font-weight: 500;
}
.custom-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  background-color: #ccc;
  border-radius: 34px;
  transition: 0.4s;
}
.custom-checkbox:checked + .slider {
  background-color: #2196f3;
}
.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}
.custom-checkbox:checked + .slider:before {
  transform: translateX(26px);
}
.custom-select {
  margin-bottom: 20px;
}
.custom-dropdown {
  width: 100%;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: box-shadow 0.3s ease;
}
.custom-dropdown:focus {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  outline: none;
}
.custom-text {
  margin-bottom: 20px;
}
.custom-input {
  width: 100%;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: box-shadow 0.3s ease;
}
.custom-input:focus {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  outline: none;
}
.stylish-field {
  padding: 10px;
}
.stylish-button {
  border-radius: 16px;
  font-size: 16px;
  background-color: #007bff;
  color: #ffffff;
  transition: all 0.3s ease;
}
.stylish-button:hover {
  background-color: #0056b3;
}
.close-button {
  margin-left: auto;
}
</style>