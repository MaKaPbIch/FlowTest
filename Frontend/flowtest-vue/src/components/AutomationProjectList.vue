<template>
  <div class="bg-white shadow rounded-lg">
    <!-- Header with Add Button -->
    <div class="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
      <h3 class="text-lg leading-6 font-medium text-gray-900">Automation Projects</h3>
      <button
        @click="showForm = true"
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
      >
        Add Project
      </button>
    </div>

    <!-- Project List -->
    <div class="divide-y divide-gray-200">
      <div v-for="project in projects" :key="project.id" class="p-4">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="text-lg font-semibold">{{ project.name }}</h4>
            <p class="text-sm text-gray-500">{{ project.repository_url }}</p>
            <div class="mt-2 flex space-x-4 text-sm text-gray-500">
              <span>Branch: {{ project.branch }}</span>
              <span>Framework: {{ project.framework }}</span>
              <span>Status: {{ project.sync_status }}</span>
            </div>
          </div>
          <div class="flex space-x-2">
            <!-- Action Buttons -->
            <button
              @click="syncProject(project.id)"
              class="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              :disabled="isSyncing"
            >
              {{ isSyncing ? 'Syncing...' : 'Sync' }}
            </button>
            <button
              @click="editProject(project)"
              class="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              @click="deleteProject(project.id)"
              class="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>

        <!-- Tests Section -->
        <div v-if="project.tests && project.tests.length" class="mt-4">
          <h5 class="text-sm font-medium text-gray-700 mb-2">Tests</h5>
          <div class="space-y-2">
            <div v-for="test in project.tests" :key="test.id" class="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>{{ test.name }}</span>
              <button
                @click="runTest(project.id, test.id)"
                class="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Run
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div class="max-w-2xl w-full mx-4">
        <AutomationProjectForm
          :projectId="currentProjectId"
          :editData="editData"
          @submit="handleFormSubmit"
          @cancel="showForm = false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AutomationProjectForm from './AutomationProjectForm.vue'
import axios from 'axios'

const props = defineProps({
  currentProjectId: {
    type: Number,
    required: true
  }
})

const projects = ref([])
const showForm = ref(false)
const editData = ref(null)
const isSyncing = ref(false)

// Fetch projects
const fetchProjects = async () => {
  try {
    const response = await axios.get(`/api/automation-projects/?project=${props.currentProjectId}`)
    projects.value = response.data
  } catch (error) {
    console.error('Failed to fetch projects:', error)
  }
}

// Create/Update project
const handleFormSubmit = async (formData) => {
  try {
    if (editData.value) {
      await axios.put(`/api/automation-projects/${editData.value.id}/`, formData)
    } else {
      await axios.post('/api/automation-projects/', formData)
    }
    showForm.value = false
    editData.value = null
    await fetchProjects()
  } catch (error) {
    console.error('Failed to save project:', error)
  }
}

// Edit project
const editProject = (project) => {
  editData.value = project
  showForm.value = true
}

// Delete project
const deleteProject = async (id) => {
  if (!confirm('Are you sure you want to delete this project?')) return
  
  try {
    await axios.delete(`/api/automation-projects/${id}/`)
    await fetchProjects()
  } catch (error) {
    console.error('Failed to delete project:', error)
  }
}

// Sync project
const syncProject = async (id) => {
  isSyncing.value = true
  try {
    await axios.post(`/api/automation-projects/${id}/sync/`)
    await fetchProjects()
  } catch (error) {
    console.error('Failed to sync project:', error)
  } finally {
    isSyncing.value = false
  }
}

// Run test
const runTest = async (projectId, testId) => {
  try {
    await axios.post(`/api/automation-projects/${projectId}/run_test/`, { test_id: testId })
  } catch (error) {
    console.error('Failed to run test:', error)
  }
}

onMounted(fetchProjects)
</script>
