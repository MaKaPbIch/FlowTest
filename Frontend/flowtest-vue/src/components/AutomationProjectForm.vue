<template>
  <div class="bg-white p-6 rounded-lg shadow">
    <h2 class="text-2xl font-bold mb-4">{{ isEdit ? 'Edit' : 'Create' }} Automation Project</h2>
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Project Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Project Name</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <!-- Repository URL -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Repository URL</label>
        <input
          v-model="form.repository_url"
          type="url"
          required
          placeholder="https://github.com/username/repo.git"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <!-- Repository Type -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Repository Type</label>
        <select
          v-model="form.repository_type"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="github">GitHub</option>
          <option value="gitlab">GitLab</option>
          <option value="bitbucket">Bitbucket</option>
        </select>
      </div>

      <!-- Branch -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Branch</label>
        <input
          v-model="form.branch"
          type="text"
          required
          placeholder="main"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <!-- Framework -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Testing Framework</label>
        <select
          v-model="form.framework"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="pytest">PyTest</option>
          <option value="unittest">UnitTest</option>
          <option value="robot">Robot Framework</option>
          <option value="playwright">Playwright</option>
        </select>
      </div>

      <!-- Tests Directory -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Tests Directory</label>
        <input
          v-model="form.tests_directory"
          type="text"
          required
          placeholder="tests/"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <!-- Access Token -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Access Token (for private repositories)</label>
        <input
          v-model="form.access_token"
          type="password"
          placeholder="Optional"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <!-- Username (for Bitbucket) -->
      <div v-if="form.repository_type === 'bitbucket'">
        <label class="block text-sm font-medium text-gray-700">Username (required for Bitbucket)</label>
        <input
          v-model="form.username"
          type="text"
          :required="form.repository_type === 'bitbucket'"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {{ isEdit ? 'Update' : 'Create' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { PropType } from 'vue'

interface AutomationProject {
  id?: number
  name: string
  project: number
  repository_url: string
  repository_type: string
  branch: string
  framework: string
  tests_directory: string
  access_token?: string
  username?: string
}

const props = defineProps({
  projectId: {
    type: Number,
    required: true
  },
  editData: {
    type: Object as PropType<AutomationProject>,
    default: null
  }
})

const emit = defineEmits(['submit', 'cancel'])

const isEdit = ref(!!props.editData)

const form = ref<AutomationProject>({
  name: '',
  project: props.projectId,
  repository_url: '',
  repository_type: 'github',
  branch: 'main',
  framework: 'pytest',
  tests_directory: 'tests/',
  access_token: '',
  username: ''
})

onMounted(() => {
  if (props.editData) {
    form.value = { ...props.editData }
  }
})

const handleSubmit = () => {
  emit('submit', form.value)
}
</script>
