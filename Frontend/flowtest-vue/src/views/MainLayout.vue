<template>
  <v-app :class="{'dark-theme': isDark}">
    <div class="green-background">
      <v-navigation-drawer v-model="drawer" app :mini-variant="mini" permanent class="sidebar-drawer">
        <v-list-item class="logo-container">
          <v-img src="/path/to/logo.png" alt="Logo" contain height="80"></v-img>
        </v-list-item>
        <v-list>
          <v-list-item v-for="item in items" :key="item.route" @click="goToPage(item.route)" class="hover-rounded">
            <v-btn :prepend-icon="item.icon" text class="button-transparent" style="border-radius: 0; color: #9e9e9e;">
              {{ item.title }}
            </v-btn>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>
    </div>

    <transition name="fade-in">
      <v-main class="main-content" style="height: 100vh; width: 85%; margin-left: 15%;">
        <div class="top-bar">
          <div class="custom-search-wrapper">
            <v-icon class="search-icon">mdi-magnify</v-icon>
            <input type="text" class="custom-search-field" placeholder="Поиск" />
          </div>
          <div class="actions">
            <!-- Добавляем кнопку для создания проекта -->
            <v-btn color="primary" @click="openCreateProjectDialog">
              <v-icon left>mdi-plus-box</v-icon>
              Создать проект
            </v-btn>
            <div class="avatar-menu">
              <v-menu offset-y>
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" dark icon>
                    <v-avatar size="40">
                      <v-img src="https://randomuser.me/api/portraits/men/85.jpg"></v-img>
                    </v-avatar>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item @click="goToPage('/profile-settings')">
                    <v-list-item-title style="color: black;">Настройки профиля</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="openSettings">
                    <v-list-item-title style="color: black;">Настройки</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="logout">
                    <v-list-item-title style="color: black;">Выход</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </div>
        </div>
        <v-container fluid>
          <router-view></router-view>
        </v-container>
      </v-main>
    </transition>

    <!-- Диалог создания проекта -->
    <create-project-dialog :dialog="showCreateDialog" @update:dialog="val => showCreateDialog = val"
      @refresh="refreshProjects"
      @create="createProject"
    />
  </v-app>
</template>

<script>
import CreateProjectDialog from '../views/CreateProjectDialog.vue';

export default {
  components: {
    CreateProjectDialog,
  },
  data() {
    return {
      showCreateDialog: false,
      drawer: true,
      mini: false,
      isDark: false,
      items: [
        { title: 'Тест-кейсы', icon: 'mdi-file-document', iconColor: 'green', route: '/test-cases' },
        { title: 'Отчеты', icon: 'mdi-chart-bar', iconColor: 'red', route: '/reports' },
        { title: 'Планировщик', icon: 'mdi-calendar', iconColor: 'purple', route: '/scheduler' }
      ]
    };
  },
  methods: {
    createProject() {
      // Логика для создания проекта, например, запрос к API для создания проекта
      const newProject = {
        name: 'Новый проект',
        description: 'Описание нового проекта'
      };
      // Пример использования axios для создания проекта
      this.$axios.post('/api/projects/', newProject)
        .then(response => {
          this.refreshProjects();
          this.showCreateDialog = false;
        })
        .catch(error => {
          console.error('Ошибка при создании проекта:', error);
        });
    },
    openCreateProjectDialog() {
      console.log('Диалог создания проекта открыт');
      this.showCreateDialog = true;
    },
    openSettings() {
      this.$router.push('/settings');
    },
    goToPage(route) {
      this.$router.push(route);
    },
    logout() {
      console.log('Logout');
    },
    refreshProjects() {
      // Логика для обновления списка проектов, например, запрос к API для актуализации данных.
    }
  }
};
</script>

<style scoped>
.search-field-wrapper {
  width: 50%;
  border-radius: 24px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
}
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  margin-top: 24px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.custom-search-wrapper {
  margin: 0 auto;
  display: flex;
  align-items: center;
  background-color: white;
  padding: 8px;
  border-radius: 24px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
}
.custom-search-field {
  border: none;
  outline: none;
  width: 100%;
  padding: 8px;
  border-radius: 24px;
  font-size: 16px;
}
.search-icon {
  color: #9e9e9e;
  margin-right: 8px;
}

.avatar-menu {
  display: flex;
  align-items: center;
  z-index: 4;
}
.green-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #459A7D;
  z-index: 1;
}

.sidebar-drawer {
  width: 280px;
  height: 100%;
  background-color: transparent;
  z-index: 2;
}

.main-content {
  margin: 0;
  position: relative;
  z-index: 3;
  border-top-left-radius: 24px;
  border-bottom-left-radius: 24px;
  overflow: hidden;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  background: #f4f7f5;
  padding: 24px;
}

.hover-rounded:hover {
  background-color: rgba(255, 255, 255, 0.2);
  outline: none;
  box-shadow: none;
  border-radius: 0;
  border-left: 4px solid white;
  color: #f1f1f1;
}

.button-transparent {
  background-color: transparent;
  color: #f1f1f1 !important;
}

.v-app-bar {
  display: flex;
  align-items: center;
  background-color: var(--v-app-bar-background);
}

.v-list-item {
  display: flex;
  align-items: center;
}

.v-list-item-title {
  margin-left: 16px;
  color: #9e9e9e;
}

.dark-theme {
  background-color: #121212;
  color: #ffffff;
  --v-app-bar-background: #1b5e20;
  --v-app-bar-text: #ffffff;
  --v-background-base: #121212;
  --v-navigation-background: #459A7D;
  --v-theme-on-surface: #ffffff;
}

.settings-blur {
  backdrop-filter: blur(8px) !important;
  background-color: transparent !important;
}

.v-overlay--active {
  backdrop-filter: blur(8px);
  background-color: transparent;
}
.fade-in-enter-active,
.fade-in-leave-active {
  transition: opacity 0.5s ease;
}
.fade-in-enter,
.fade-in-leave-to {
  opacity: 0;
}
</style>
