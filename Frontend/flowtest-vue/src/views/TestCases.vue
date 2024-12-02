<template>
  <v-app>
    <v-container class="pa-0">
      <div class="flex h-screen">
        <!-- Side Menu -->
        <div
          id="sideMenu"
          class="bg-white w-72 shadow-lg border-r transition-all duration-300 transform"
          role="navigation"
        >
          <!-- Menu Header -->
          <div class="p-4 border-b flex items-center justify-between">
            <h1 class="text-xl font-semibold text-gray-800">Test Explorer</h1>
            <button
              id="collapseBtn"
              class="text-gray-600 hover:text-gray-800 focus:outline-none"
              aria-label="Toggle menu"
            >
              <i class="fas fa-bars"></i>
            </button>
          </div>

          <!-- Search Section -->
          <div class="p-4 border-b">
            <div class="relative">
              <input
                type="search"
                class="w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search tests..."
                aria-label="Search tests"
              />
              <i class="fas fa-search absolute right-3 top-3 text-gray-400"></i>
            </div>
          </div>

          <!-- Filters Section -->
          <div class="p-4 border-b">
            <h2 class="text-sm font-semibold text-gray-600 mb-2">Filters</h2>
            <select
              class="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Status filter"
            >
              <option value="all">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            <div class="space-y-2">
              <label class="flex items-center space-x-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  class="rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
                  aria-label="Show automated tests"
                />
                <span>Automated Tests</span>
              </label>
              <label class="flex items-center space-x-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  class="rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
                  aria-label="Show manual tests"
                />
                <span>Manual Tests</span>
              </label>
            </div>
          </div>

          <!-- Folder Tree -->
          <div class="p-4 overflow-y-auto" style="max-height: calc(100vh - 280px);">
            <div class="space-y-2">
              <!-- Folder 1 -->
              <div class="folder">
                <button
                  class="flex items-center w-full p-2 text-left hover:bg-gray-50 rounded-lg group"
                  aria-expanded="false"
                >
                  <i
                    class="fas fa-chevron-right mr-2 text-gray-400 group-hover:text-gray-600 transition-transform duration-200"
                  ></i>
                  <i class="fas fa-folder mr-2 text-yellow-500"></i>
                  <span class="text-gray-700">Integration Tests</span>
                </button>
                <div class="hidden ml-6 mt-1 space-y-1">
                  <div class="flex items-center p-2 hover:bg-gray-50 rounded-lg">
                    <i class="fas fa-file-alt mr-2 text-gray-400"></i>
                    <span class="text-gray-600">API Test 1</span>
                  </div>
                  <div class="flex items-center p-2 hover:bg-gray-50 rounded-lg">
                    <i class="fas fa-file-alt mr-2 text-gray-400"></i>
                    <span class="text-gray-600">API Test 2</span>
                  </div>
                </div>
              </div>

              <!-- Folder 2 -->
              <div class="folder">
                <button
                  class="flex items-center w-full p-2 text-left hover:bg-gray-50 rounded-lg group"
                  aria-expanded="false"
                >
                  <i
                    class="fas fa-chevron-right mr-2 text-gray-400 group-hover:text-gray-600 transition-transform duration-200"
                  ></i>
                  <i class="fas fa-folder mr-2 text-yellow-500"></i>
                  <span class="text-gray-700">Unit Tests</span>
                </button>
                <div class="hidden ml-6 mt-1 space-y-1">
                  <div class="flex items-center p-2 hover:bg-gray-50 rounded-lg">
                    <i class="fas fa-file-alt mr-2 text-gray-400"></i>
                    <span class="text-gray-600">Component Test 1</span>
                  </div>
                  <div class="flex items-center p-2 hover:bg-gray-50 rounded-lg">
                    <i class="fas fa-file-alt mr-2 text-gray-400"></i>
                    <span class="text-gray-600">Component Test 2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="flex-1 p-8 bg-gray-50">
          <h1 class="text-2xl font-bold text-gray-800 mb-4">Main Content Area</h1>
          <p class="text-gray-600">
            Select a test from the side menu to view details.
          </p>
        </div>
      </div>
    </v-container>
  </v-app>
</template>

<script>
export default {
  mounted() {
    // Toggle folder expansion
    document.querySelectorAll(".folder button").forEach((button) => {
      button.addEventListener("click", () => {
        const content = button.nextElementSibling;
        const icon = button.querySelector(".fa-chevron-right");
        content.classList.toggle("hidden");
        icon.style.transform = content.classList.contains("hidden")
          ? "rotate(0deg)"
          : "rotate(90deg)";
        button.setAttribute("aria-expanded", !content.classList.contains("hidden"));
      });
    });

    // Toggle menu collapse
    document.getElementById("collapseBtn").addEventListener("click", () => {
      const menu = document.getElementById("sideMenu");
      menu.classList.toggle("w-72");
      menu.classList.toggle("w-16");
    });
  },
};
</script>

<style scoped>
.bg-gray-50 {
  background-color: #f9fafb;
}
.border-r {
  border-right: 1px solid #e5e7eb;
}
</style>
