<template>
  <div>
    <ul class="tree-container">
      <TreeNode
        v-for="folder in folders"
        :key="folder.id"
        :node="folder"
        @addFolder="openAddFolderModal"
        @addTestCase="openAddTestCaseModal"
        @selectTestCase="selectTestCase"
        @contextMenu="openContextMenu"
      />
    </ul>

    <!-- Контекстное меню -->
    <v-menu
      v-model="contextMenu.visible"
      :left="contextMenu.x + 'px'"
      :top="contextMenu.y + 'px'"
      absolute
      close-on-content-click
    >
      <v-list>
        <v-list-item @click="openAddFolderModal(contextMenu.folder)">
          <v-list-item-title>
            <v-icon start>mdi-folder-plus</v-icon>
            Создать вложенную папку
          </v-list-item-title>
        </v-list-item>
        <v-list-item @click="openAddTestCaseModal(contextMenu.folder)">
          <v-list-item-title>
            <v-icon start>mdi-file-plus</v-icon>
            Создать тест-кейс
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script>
import TreeNode from "./TreeNode.vue";

export default {
  name: "CustomTree",
  components: { TreeNode },
  props: {
    folders: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        folder: null,
      },
    };
  },
  methods: {
    /**
     * Открывает контекстное меню рядом с курсором
     * @param {MouseEvent} event Событие клика ПКМ
     * @param {Object} folder Выбранная папка
     */
    openContextMenu(event, folder) {
      this.contextMenu = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        folder,
      };
    },
    /**
     * Закрывает контекстное меню
     */
    closeContextMenu() {
      this.contextMenu.visible = false;
    },
    /**
     * Открывает модалку для создания вложенной папки
     * @param {Object} folder Родительская папка
     */
    openAddFolderModal(folder) {
      this.$emit("addFolder", folder);
      this.closeContextMenu();
    },
    /**
     * Открывает модалку для создания тест-кейса
     * @param {Object} folder Родительская папка
     */
    openAddTestCaseModal(folder) {
      this.$emit("addTestCase", folder);
      this.closeContextMenu();
    },
    /**
     * Обработка выбора тест-кейса
     * @param {Object} testCase
     */
    selectTestCase(testCase) {
      this.$emit("selectTestCase", testCase);
    },
  },
};
</script>

<style scoped>
.tree-container {
  padding: 0;
  margin: 0;
  list-style: none;
}

.v-menu {
  z-index: 1000; /* Увеличиваем приоритет отображения меню */
}

.v-list-item-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
