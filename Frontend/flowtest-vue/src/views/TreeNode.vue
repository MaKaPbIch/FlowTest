<template>
  <li class="tree-node">
    <div
      class="node-header"
      @contextmenu.prevent="handleRightClick"
    >
      <!-- Колонка для стрелки -->
      <div class="toggle-column">
        <span
          class="toggle-icon"
          v-if="hasChildren"
          @click="toggle"
        >
          <v-icon>{{ isOpen ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
        </span>
      </div>
      <!-- Колонка для иконки и текста -->
      <div class="content-column">
        <v-icon
          :color="isFolder ? 'green' : 'blue'"
          class="node-icon"
        >
          {{ isFolder ? 'mdi-folder-outline' : 'mdi-file-document-outline' }}
        </v-icon>
        <span class="node-label">{{ node.name || node.title }}</span>
      </div>
    </div>

    <!-- Вложенные элементы -->
    <ul v-if="isOpen" class="nested-list">
      <!-- Вложенные папки -->
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        @addFolder="addFolder"
        @addTestCase="addTestCase"
        @selectTestCase="selectTestCase"
        @contextMenu="emitContextMenu"
        class="nested-item"
      />
      <!-- Тест-кейсы -->
      <li
        v-for="testCase in node.test_cases"
        :key="testCase.id"
        class="nested-item test-case"
        @click="selectTestCase(testCase)"
      >
        <div class="toggle-column"></div>
        <div class="content-column">
          <v-icon start color="blue">mdi-file-document-outline</v-icon>
          {{ testCase.title }}
        </div>
      </li>
    </ul>
  </li>
</template>

<script>
export default {
  name: "TreeNode",
  props: {
    node: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isOpen: false,
    };
  },
  computed: {
    isFolder() {
      return this.node.children !== undefined;
    },
    hasChildren() {
      return (this.node.children && this.node.children.length > 0) || (this.node.test_cases && this.node.test_cases.length > 0);
    },
  },
  methods: {
    toggle() {
      this.isOpen = !this.isOpen;
    },
    addFolder() {
      this.$emit("addFolder", this.node);
    },
    addTestCase() {
      this.$emit("addTestCase", this.node);
    },
    selectTestCase(testCase) {
      this.$emit("selectTestCase", testCase);
    },
    handleRightClick(event) {
      // Отправляем событие с координатами клика и текущей папкой
      this.$emit("contextMenu", event, this.node);
    },
    emitContextMenu(event, item) {
      this.$emit("contextMenu", event, item);
    },
  },
};
</script>

<style scoped>
.tree-node {
  list-style: none;
  margin: 0;
  padding: 0;
}

.node-header {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.toggle-column {
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.content-column {
  display: flex;
  align-items: center;
}

.node-icon {
  margin-right: 8px;
}

.nested-list {
  list-style: none;
  margin-left: 20px;
  padding: 0;
}

.nested-item {
  margin-left: 0;
}

.test-case {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-top: 0.25rem;
}
</style>
