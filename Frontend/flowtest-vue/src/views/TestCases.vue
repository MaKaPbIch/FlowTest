<template>
  <v-container ref="contextMenuContainer" @click.self="closeContextMenu">
    <!-- Хедер -->
    <v-app-bar app color="#f4f5fa" flat style="z-index: 10; position: sticky; top: 0;">
      <v-row align-center class="pl-4">
        <v-img src="/images/logo.png" alt="FlowTest" height="32"></v-img>
        <v-toolbar-title class="ml-3" style="color: #3c3c3c; font-weight: 600;">FlowTest</v-toolbar-title>
        <v-menu v-model="menuVisible" offset-y @click:outside="menuVisible = false">
          <template #activator="{ props }">
            <v-btn v-bind="props" color="primary" variant="outlined" class="rounded-pill" style="width: auto; min-width: 200px;">
              {{ selectedProjectName || "Выберите проект" }}
              <v-icon end>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-card>
            <v-list>
              <v-list-item
                v-for="project in projects"
                :key="project.id"
                @click="selectProject(project)"
              >
                <v-list-item-title>{{ project.name }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
        <v-spacer></v-spacer>
        <v-btn icon>
          <v-icon color="#3c3c3c">mdi-bell</v-icon>
        </v-btn>
        <v-avatar size="36" class="v-avatar-custom" @click="handleAvatarClick" style="cursor: pointer; align-items: center;">
          <img src="https://cdn.vuetifyjs.com/images/john.jpg" alt="Аватар пользователя">
        </v-avatar>
      </v-row>
    </v-app-bar>

    <!-- Основной макет -->
    <v-row class="mt-4" style="overflow: hidden; height: calc(100vh - 64px); margin: 0; padding: 0;">
      <!-- Левая панель -->
      <v-col cols="2" class="left-panel" style="padding: 0; margin: 0; overflow: auto; border-right: 1px solid #e0e0e0;">
        <v-card flat>
          <v-card-title>
            Структура тест-кейсов
            <v-spacer />
            <v-btn small color="primary" @click="openAddFolderPanel(null)">Добавить папку</v-btn>
          </v-card-title>
          <v-divider />
          <div style="flex-grow: 1; overflow-y: auto;">
            <TreeNode
              v-if="Array.isArray(folders) && folders.length"
              v-for="folder in folders"
              :key="folder.id"
              :node="folder"
              @addFolder="openAddFolderPanel"
              @addTestCase="openAddTestCasePanel"
              @selectTestCase="handleSelectTestCase"
              @contextMenu="openContextMenu"
            />
          </div>
        </v-card>
      </v-col>

      <!-- Правая панель -->
      <v-col cols="10" style="padding: 0; overflow: auto;">
        <v-card flat>
          <v-card-title>
            {{ selectedFolder?.name || selectedTestCase?.title || "Выберите элемент" }}
          </v-card-title>
          <v-divider />
          <v-card-text>
            <!-- Форма добавления папки -->
            <div v-if="addFolderPanel">
              <v-text-field label="Название папки" v-model="newFolder.name" required />
              <v-text-field label="Описание" v-model="newFolder.description" />
              <v-select
                label="Статус"
                v-model="newFolder.status"
                :items="['active', 'archived']"
                required
              />
              <v-btn color="primary" @click="confirmAddFolder" :disabled="!newFolder.name">Добавить</v-btn>
              <v-btn text @click="addFolderPanel = false">Отмена</v-btn>
            </div>

            <!-- Форма добавления тест-кейса -->
            <div v-else-if="addTestCasePanel">
              <v-text-field label="Название тест-кейса" v-model="newTestCase.title" required />
              <v-text-field label="Описание" v-model="newTestCase.description" />
              <div v-for="(step, index) in newTestCase.steps" :key="index" class="mb-3">
                <v-text-field label="Описание шага" v-model="step.step_description" />
                <v-text-field label="Ожидаемый результат" v-model="step.expected_result" />
              </div>
              <v-btn color="primary" small @click="addNewStep">Добавить шаг</v-btn>
              <v-text-field label="Приоритет" v-model="newTestCase.priority" />
              <v-text-field label="Платформа" v-model="newTestCase.platform" />
              <v-btn color="primary" @click="confirmAddTestCase" :disabled="!newTestCase.title">Добавить</v-btn>
              <v-btn text @click="addTestCasePanel = false">Отмена</v-btn>
            </div>

            <!-- Информация о выбранном элементе -->
            <div v-else-if="selectedFolder || selectedTestCase">
              <p><strong>Описание:</strong> {{ selectedFolder?.description || selectedTestCase?.description || "Нет описания" }}</p>
              <p><strong>Статус:</strong> {{ selectedFolder?.status || "Нет статуса" }}</p>
              <div v-if="selectedTestCase?.steps?.length">
                <div v-for="(step, index) in selectedTestCase.steps" :key="index">
                  <p><strong>Шаг {{ index + 1 }}:</strong> {{ step.step_description }}</p>
                  <p><strong>Ожидаемый результат:</strong> {{ step.expected_result }}</p>
                </div>
              </div>
            </div>

            <!-- Заглушка -->
            <div v-else>
              <p>Выберите папку или тест-кейс из дерева слева.</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>


<script>
import TreeNode from "./TreeNode.vue";
import axios from "../plugins/axios";
import { nextTick } from 'vue';

export default {
  components: { TreeNode },
  data() {
    return {
      menuVisible: false,
      selectedProject: null,
      projects: [],
      folders: [],
      selectedFolder: null,
      selectedTestCase: null,
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        folder: null,
      },
      addFolderPanel: false,
      addTestCasePanel: false,
      newFolder: {
        name: '',
        description: '',
        status: '',
        project: null,
        parent_folder: null,
      },
      newTestCase: {
        title: '',
        description: '',
        condition: '',
        steps: [],
        priority: '',
        platform: '',
        folder: null,
      },
      leftPanelWidth: '300px'
    };
  },
  computed: {
    selectedProjectName() {
      const project = this.projects.find((p) => p.id === this.selectedProject);
      return project ? project.name : null;
    },
  },
  methods: {
    async fetchProjects() {
      try {
        const response = await axios.get("/api/projects/");
        this.projects = response.data;
      } catch (error) {
        console.error("Ошибка при загрузке проектов:", error);
      }
    },
    async fetchFoldersAndTestCases() {
      if (!this.selectedProject) return;

      try {
        const response = await axios.get(
          `/api/projects/${this.selectedProject}/folders_and_test_cases/`
        );

        const folders = response.data.folders;
        const testCases = response.data.test_cases;

        const folderMap = {};
        folders.forEach((folder) => {
          folder.children = [];
          folder.test_cases = [];
          folderMap[folder.id] = folder;
        });

        testCases.forEach((testCase) => {
          if (testCase.folder && folderMap[testCase.folder]) {
            folderMap[testCase.folder].test_cases.push(testCase);
          }
        });

        const rootFolders = [];
        folders.forEach((folder) => {
          if (folder.parent_folder && folderMap[folder.parent_folder]) {
            folderMap[folder.parent_folder].children.push(folder);
          } else {
            rootFolders.push(folder);
          }
        });

        this.folders = rootFolders;
      } catch (error) {
        console.error("Ошибка при загрузке папок и тест-кейсов:", error);
      }
    },
    selectProject(project) {
      this.selectedProject = project.id;
      this.menuVisible = false;
      this.fetchFoldersAndTestCases();
    },
    handleSelectTestCase(testCase) {
      this.selectedFolder = null;
      this.selectedTestCase = testCase;
    },
    openContextMenu(event, folder) {
      event.preventDefault();
      if (this.$refs.contextMenuContainer && this.$refs.contextMenuContainer.$el) {
        const containerRect = this.$refs.contextMenuContainer.$el.getBoundingClientRect();
        this.contextMenu.x = event.clientX - containerRect.left;
        this.contextMenu.y = event.clientY - containerRect.top;
        this.contextMenu.folder = folder;
        nextTick(() => {
          this.contextMenu.visible = true;
        });
      }
    },
    closeContextMenu(event) {
      if (!event || !this.$refs.contextMenuContainer.$el.contains(event.target)) {
        this.contextMenu.visible = false;
      }
    },
    openAddFolderPanel(parentFolderId) {
      this.addTestCasePanel = false;
      this.newFolder = {
        name: '',
        description: '',
        status: '',
        project: this.selectedProject,
        parent_folder: parentFolderId,
      };
      this.addFolderPanel = true;
    },
    openAddTestCasePanel(parentFolderId) {
      this.addFolderPanel = false;
      this.newTestCase = {
        title: '',
        description: '',
        steps: [],
        priority: '',
        platform: '',
        folder: parentFolderId,
      };
      this.addTestCasePanel = true;
    },
    handleAddFolder() {
      this.openAddFolderPanel(this.contextMenu.folder?.id);
      this.closeContextMenu();
    },
    handleAddTestCase() {
      this.openAddTestCasePanel(this.contextMenu.folder?.id);
      this.closeContextMenu();
    },
    async confirmAddFolder() {
      try {
        await axios.post('/api/folders/', this.newFolder);
        this.addFolderPanel = false;
        this.fetchFoldersAndTestCases();
      } catch (error) {
        console.error("Ошибка при добавлении папки:", error);
      }
    },
    async confirmAddTestCase() {
      try {
        await axios.post('/api/testcases/', this.newTestCase);
        this.addTestCasePanel = false;
        this.fetchFoldersAndTestCases();
      } catch (error) {
        console.error("Ошибка при добавлении тест-кейса:", error);
      }
    },
    addNewStep() {
      this.newTestCase.steps.push({
        step_description: '',
        expected_result: '',
      });
    },
    handleAvatarClick() {
      // Handle avatar click event
      console.log("Avatar clicked");
    },
  },
  async created() {
    await this.fetchProjects();
  },
};
</script>

<style scoped>
.left-panel .custom-card {
  border: none;
  box-shadow: none;
  border-radius: 0;
  background-color: #fff;
  margin: 0;
  padding: 0;
}

.left-panel {
    background-color: #ffffff;
    border-radius: 0;
    box-shadow: none;
    margin: 0;
    padding: 0;
}

.custom-card {
  padding: 0;
  border: none;
  box-shadow: none;
  background-color: #ffffff;
  border-radius: 0;
  margin: 0;
}

.custom-card h2 {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
}

.custom-card p {
  font-size: 14px;
  line-height: 1.5;
  color: #555;
}

.custom-context-menu {
  position: absolute;
  z-index: 1000;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  padding: 0.5rem 0;
}

.menu-list {
  list-style: none; /* Убираем маркеры списка */
  margin: 0;
  padding: 0;
}

.tree-container {
  padding: 0;
}

.v-container {
  max-width: 1920px;
}

.tree-node {
  margin: 0;
  padding: 8px 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.tree-node:hover {
  background-color: #eef5ff;
}

.menu-list li {
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.menu-list li:hover {
  background-color: #f5f5f5;
}

.menu-list v-icon {
  margin-right: 0.5rem;
}

.v-avatar-custom {
  align-self: center;
  cursor: pointer;
}

.v-app-bar {
    background-color: #f8f9fc;
    border-bottom: 1px solid #e0e0e0;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
}

.v-toolbar-title {
    font-size: 20px;
    font-weight: bold;
    color: #3c3c3c;
}

.v-btn {
    border-radius: 24px;
    font-weight: 500;
    padding: 8px 16px;
}

.v-icon {
    color: #6c757d;
}

</style>
