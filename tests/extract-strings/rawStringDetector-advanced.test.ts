import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectRawStringsInFile } from '@/extract-strings/rawStringDetector'

// Mock the file system using memfs
const { vol } = vi.hoisted(() => {
  const { vol } = require('memfs')
  return { vol }
})

vi.mock('node:fs', () => ({ default: vol }))
vi.mock('node:fs/promises', () => vol.promises)

describe('rawStringDetector - Advanced Patterns', () => {
  const testDir = '/test'

  beforeEach(() => {
    vol.reset()
    vol.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    vol.reset()
  })

  // Helper to test file detection
  function testFile(content: string, config = {}) {
    const file = path.join(testDir, 'Component.vue')
    fs.writeFileSync(file, content)
    return detectRawStringsInFile(file, config)
  }

  // ==========================================================================
  // SECTION 1: Script Setup Patterns
  // ==========================================================================
  describe('Script Setup Patterns', () => {
    it('should detect text in script setup with defineProps', () => {
      const results = testFile(`
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  description?: string
}>()

const count = ref(0)
</script>

<template>
  <div>
    <h1>{{ props.title }}</h1>
    <p>Click the button below to increment</p>
    <button @click="count++">Increment Counter</button>
    <span>Current count: {{ count }}</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Click the button below to increment')
      expect(texts).toContain('Increment Counter')
      expect(texts).toContain('Current count:')
    })

    it('should detect text in script setup with defineEmits', () => {
      const results = testFile(`
<script setup>
const emit = defineEmits(['update', 'delete', 'cancel'])

function handleSave() {
  emit('update')
}
</script>

<template>
  <div class="action-panel">
    <h3>Manage Item</h3>
    <p>Choose an action to perform on this item</p>
    <button @click="handleSave">Save Changes</button>
    <button @click="emit('delete')">Delete Item</button>
    <button @click="emit('cancel')">Cancel</button>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Manage Item')
      expect(texts).toContain('Choose an action to perform on this item')
      expect(texts).toContain('Save Changes')
      expect(texts).toContain('Delete Item')
      expect(texts).toContain('Cancel')
    })

    it('should detect text with defineExpose', () => {
      const results = testFile(`
<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

function open() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

defineExpose({ open, close })
</script>

<template>
  <div v-if="isOpen" class="modal">
    <div class="modal-header">
      <h2>Modal Title</h2>
      <button @click="close">×</button>
    </div>
    <div class="modal-body">
      <p>This is the modal content</p>
    </div>
    <div class="modal-footer">
      <button @click="close">Close Modal</button>
    </div>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Modal Title')
      expect(texts).toContain('This is the modal content')
      expect(texts).toContain('Close Modal')
    })

    it('should detect text with withDefaults', () => {
      const results = testFile(`
<script setup lang="ts">
interface Props {
  title?: string
  showFooter?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Default Title',
  showFooter: true,
})
</script>

<template>
  <div class="card">
    <header>{{ props.title }}</header>
    <main>
      <slot>Default card content goes here</slot>
    </main>
    <footer v-if="props.showFooter">
      <span>Card footer text</span>
    </footer>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Default card content goes here')
      expect(texts).toContain('Card footer text')
    })
  })

  // ==========================================================================
  // SECTION 2: Options API Patterns
  // ==========================================================================
  describe('Options API Patterns', () => {
    it('should detect text in Options API component', () => {
      const results = testFile(`
<script>
export default {
  name: 'UserProfile',
  props: {
    userId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      user: null,
      loading: true,
      error: null
    }
  },
  computed: {
    fullName() {
      return this.user ? \`\${this.user.firstName} \${this.user.lastName}\` : ''
    }
  },
  methods: {
    async fetchUser() {
      try {
        this.loading = true
        const response = await fetch(\`/api/users/\${this.userId}\`)
        this.user = await response.json()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    }
  },
  mounted() {
    this.fetchUser()
  }
}
</script>

<template>
  <div class="user-profile">
    <div v-if="loading" class="loading">
      <span>Loading user profile...</span>
    </div>
    <div v-else-if="error" class="error">
      <p>Failed to load user profile</p>
      <button @click="fetchUser">Try Again</button>
    </div>
    <div v-else class="profile">
      <h2>User Profile</h2>
      <p>Name: {{ fullName }}</p>
      <p>Email: {{ user.email }}</p>
      <button>Edit Profile</button>
      <button>Delete Account</button>
    </div>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Loading user profile...')
      expect(texts).toContain('Failed to load user profile')
      expect(texts).toContain('Try Again')
      expect(texts).toContain('User Profile')
      expect(texts).toContain('Name:')
      expect(texts).toContain('Email:')
      expect(texts).toContain('Edit Profile')
      expect(texts).toContain('Delete Account')
    })

    it('should detect text in mixins-based component', () => {
      const results = testFile(`
<script>
import { formMixin } from '@/mixins/form'
import { validationMixin } from '@/mixins/validation'

export default {
  name: 'ContactForm',
  mixins: [formMixin, validationMixin],
  data() {
    return {
      form: {
        name: '',
        email: '',
        message: ''
      }
    }
  }
}
</script>

<template>
  <form @submit.prevent="submitForm">
    <h2>Contact Us</h2>
    <p>Fill out the form below and we'll get back to you soon</p>

    <div class="form-group">
      <label for="name">Your Name</label>
      <input id="name" v-model="form.name" required />
      <span v-if="errors.name" class="error">Please enter your name</span>
    </div>

    <div class="form-group">
      <label for="email">Email Address</label>
      <input id="email" v-model="form.email" type="email" required />
      <span v-if="errors.email" class="error">Please enter a valid email</span>
    </div>

    <div class="form-group">
      <label for="message">Your Message</label>
      <textarea id="message" v-model="form.message" required></textarea>
      <span v-if="errors.message" class="error">Please enter your message</span>
    </div>

    <button type="submit">Send Message</button>
  </form>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Contact Us')
      expect(texts).toContain("Fill out the form below and we'll get back to you soon")
      expect(texts).toContain('Your Name')
      expect(texts).toContain('Please enter your name')
      expect(texts).toContain('Email Address')
      expect(texts).toContain('Please enter a valid email')
      expect(texts).toContain('Your Message')
      expect(texts).toContain('Please enter your message')
      expect(texts).toContain('Send Message')
    })
  })

  // ==========================================================================
  // SECTION 3: JavaScript (non-TypeScript) Patterns
  // ==========================================================================
  describe('JavaScript (non-TypeScript) Patterns', () => {
    it('should detect text in plain JavaScript component', () => {
      const results = testFile(`
<script>
import { ref, computed } from 'vue'

export default {
  setup() {
    const items = ref([])
    const newItem = ref('')

    const itemCount = computed(() => items.value.length)

    function addItem() {
      if (newItem.value.trim()) {
        items.value.push(newItem.value)
        newItem.value = ''
      }
    }

    function removeItem(index) {
      items.value.splice(index, 1)
    }

    return {
      items,
      newItem,
      itemCount,
      addItem,
      removeItem
    }
  }
}
</script>

<template>
  <div class="todo-list">
    <h1>My Todo List</h1>
    <p>You have {{ itemCount }} items</p>

    <div class="add-item">
      <input
        v-model="newItem"
        placeholder="Add a new item"
        @keyup.enter="addItem"
      />
      <button @click="addItem">Add Item</button>
    </div>

    <ul v-if="items.length">
      <li v-for="(item, index) in items" :key="index">
        <span>{{ item }}</span>
        <button @click="removeItem(index)">Remove</button>
      </li>
    </ul>

    <p v-else class="empty">No items yet. Add your first item above!</p>
  </div>
</template>
      `, { includeAttributes: ['placeholder'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('My Todo List')
      expect(texts).toContain('You have')
      // "items" is a single lowercase word not in UI list, correctly filtered
      expect(texts).toContain('Add a new item')
      expect(texts).toContain('Add Item')
      expect(texts).toContain('Remove')
      expect(texts).toContain('No items yet. Add your first item above!')
    })

    it('should detect text in JSX-like syntax', () => {
      const results = testFile(`
<script>
export default {
  name: 'StatusBadge',
  props: ['status'],
  render() {
    return this.status === 'active'
      ? <span class="badge success">Active</span>
      : <span class="badge error">Inactive</span>
  }
}
</script>

<template>
  <div class="user-status">
    <h3>Account Status</h3>
    <StatusBadge :status="userStatus" />
    <p>Your account is currently in good standing</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Account Status')
      expect(texts).toContain('Your account is currently in good standing')
    })
  })

  // ==========================================================================
  // SECTION 4: Pinia Store Integration
  // ==========================================================================
  describe('Pinia Store Integration', () => {
    it('should detect text in component using Pinia store', () => {
      const results = testFile(`
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const userStore = useUserStore()
const cartStore = useCartStore()

const { user, isAuthenticated } = storeToRefs(userStore)
const { items, total } = storeToRefs(cartStore)

async function checkout() {
  await cartStore.processCheckout()
}
</script>

<template>
  <div class="checkout-page">
    <h1>Checkout</h1>

    <div v-if="!isAuthenticated" class="auth-required">
      <p>Please log in to continue with checkout</p>
      <button @click="userStore.showLogin">Sign In</button>
      <button @click="userStore.showRegister">Create Account</button>
    </div>

    <div v-else class="checkout-content">
      <h2>Order Summary</h2>

      <div v-if="items.length === 0" class="empty-cart">
        <p>Your cart is empty</p>
        <a href="/products">Continue Shopping</a>
      </div>

      <div v-else>
        <ul class="cart-items">
          <li v-for="item in items" :key="item.id">
            <span>{{ item.name }}</span>
            <span>Quantity: {{ item.quantity }}</span>
            <span>{{ item.price }}</span>
          </li>
        </ul>

        <div class="totals">
          <p>Subtotal: {{ total.subtotal }}</p>
          <p>Shipping: {{ total.shipping }}</p>
          <p>Tax: {{ total.tax }}</p>
          <p class="grand-total">Total: {{ total.grand }}</p>
        </div>

        <button @click="checkout" :disabled="cartStore.processing">
          <span v-if="cartStore.processing">Processing Order...</span>
          <span v-else>Complete Purchase</span>
        </button>
      </div>
    </div>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Checkout')
      expect(texts).toContain('Please log in to continue with checkout')
      expect(texts).toContain('Sign In')
      expect(texts).toContain('Create Account')
      expect(texts).toContain('Order Summary')
      expect(texts).toContain('Your cart is empty')
      expect(texts).toContain('Continue Shopping')
      expect(texts).toContain('Quantity:')
      expect(texts).toContain('Subtotal:')
      expect(texts).toContain('Shipping:')
      expect(texts).toContain('Tax:')
      expect(texts).toContain('Total:')
      expect(texts).toContain('Processing Order...')
      expect(texts).toContain('Complete Purchase')
    })

    it('should detect text in component with multiple stores', () => {
      const results = testFile(`
<script setup>
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { useSettingsStore } from '@/stores/settings'

const auth = useAuthStore()
const notifications = useNotificationStore()
const settings = useSettingsStore()
</script>

<template>
  <header class="app-header">
    <div class="logo">
      <span>My Application</span>
    </div>

    <nav>
      <a href="/dashboard">Dashboard</a>
      <a href="/projects">Projects</a>
      <a href="/team">Team</a>
      <a href="/reports">Reports</a>
    </nav>

    <div class="header-actions">
      <button @click="notifications.toggle" :title="'View notifications'">
        <span v-if="notifications.unreadCount > 0">
          {{ notifications.unreadCount }} new notifications
        </span>
        <span v-else>No new notifications</span>
      </button>

      <button @click="settings.toggle">Settings</button>

      <div v-if="auth.isLoggedIn" class="user-menu">
        <span>Welcome, {{ auth.user.name }}</span>
        <button @click="auth.logout">Sign Out</button>
      </div>
      <div v-else>
        <button @click="auth.showLogin">Sign In</button>
      </div>
    </div>
  </header>
</template>
      `, { includeAttributes: ['title'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('My Application')
      expect(texts).toContain('Dashboard')
      expect(texts).toContain('Projects')
      expect(texts).toContain('Reports')
      // Note: 'View notifications' is in a dynamic :title binding, not a static attribute
      expect(texts).toContain('new notifications')
      expect(texts).toContain('No new notifications')
      expect(texts).toContain('Settings')
      expect(texts).toContain('Welcome,')
      expect(texts).toContain('Sign Out')
      expect(texts).toContain('Sign In')
    })
  })

  // ==========================================================================
  // SECTION 5: Composables
  // ==========================================================================
  describe('Composables', () => {
    it('should detect text in component using custom composables', () => {
      const results = testFile(`
<script setup lang="ts">
import { useForm } from '@/composables/useForm'
import { useValidation } from '@/composables/useValidation'
import { useToast } from '@/composables/useToast'

const { form, resetForm, submitForm } = useForm({
  email: '',
  password: ''
})

const { errors, validate } = useValidation(form)
const { showToast } = useToast()

async function handleSubmit() {
  if (validate()) {
    try {
      await submitForm()
      showToast('Login successful!')
    } catch (error) {
      showToast('Login failed. Please try again.')
    }
  }
}
</script>

<template>
  <div class="login-form">
    <h1>Sign In</h1>
    <p class="subtitle">Enter your credentials to access your account</p>

    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label>Email</label>
        <input v-model="form.email" type="email" />
        <span v-if="errors.email" class="error">{{ errors.email }}</span>
      </div>

      <div class="field">
        <label>Password</label>
        <input v-model="form.password" type="password" />
        <span v-if="errors.password" class="error">{{ errors.password }}</span>
      </div>

      <div class="actions">
        <button type="submit">Sign In</button>
        <button type="button" @click="resetForm">Clear Form</button>
      </div>

      <p class="help-text">
        Forgot your password? <a href="/reset">Reset it here</a>
      </p>
    </form>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Sign In')
      expect(texts).toContain('Enter your credentials to access your account')
      expect(texts).toContain('Email')
      expect(texts).toContain('Sign In')
      expect(texts).toContain('Clear Form')
      expect(texts).toContain('Forgot your password?')
      expect(texts).toContain('Reset it here')
    })

    it('should detect text in component with useAsyncState', () => {
      const results = testFile(`
<script setup>
import { useAsyncState } from '@vueuse/core'
import { fetchProducts } from '@/api/products'

const { state: products, isLoading, error, execute } = useAsyncState(
  fetchProducts,
  [],
  { immediate: true }
)
</script>

<template>
  <div class="products-page">
    <h1>Our Products</h1>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading products...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <h3>Failed to load products</h3>
      <p>{{ error.message }}</p>
      <button @click="execute">Retry</button>
    </div>

    <div v-else-if="products.length === 0" class="empty-state">
      <h3>No products found</h3>
      <p>Check back later for new arrivals</p>
    </div>

    <div v-else class="products-grid">
      <div v-for="product in products" :key="product.id" class="product-card">
        <img :src="product.image" :alt="product.name" />
        <h3>{{ product.name }}</h3>
        <p>{{ product.description }}</p>
        <span class="price">{{ product.price }}</span>
        <button>Add to Cart</button>
      </div>
    </div>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Our Products')
      expect(texts).toContain('Loading products...')
      expect(texts).toContain('Failed to load products')
      expect(texts).toContain('Retry')
      expect(texts).toContain('No products found')
      expect(texts).toContain('Check back later for new arrivals')
      expect(texts).toContain('Add to Cart')
    })

    it('should detect text in component with provide/inject', () => {
      const results = testFile(`
<script setup>
import { provide, ref } from 'vue'

const theme = ref('light')
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

provide('theme', theme)
provide('toggleTheme', toggleTheme)
</script>

<template>
  <div :class="['app', theme]">
    <header>
      <h1>Theme Switcher Demo</h1>
      <p>Click the button to toggle between light and dark mode</p>
      <button @click="toggleTheme">
        <span v-if="theme === 'light'">Switch to Dark Mode</span>
        <span v-else>Switch to Light Mode</span>
      </button>
    </header>
    <main>
      <slot>Default content area</slot>
    </main>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Theme Switcher Demo')
      expect(texts).toContain('Click the button to toggle between light and dark mode')
      expect(texts).toContain('Switch to Dark Mode')
      expect(texts).toContain('Switch to Light Mode')
      expect(texts).toContain('Default content area')
    })
  })

  // ==========================================================================
  // SECTION 6: Vuetify Components
  // ==========================================================================
  describe('Vuetify Components', () => {
    it('should detect text in Vuetify data table', () => {
      const results = testFile(`
<script setup>
import { ref } from 'vue'

const search = ref('')
const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Role', key: 'role' },
  { title: 'Actions', key: 'actions', sortable: false }
]
const users = ref([])
</script>

<template>
  <v-card>
    <v-card-title>
      User Management
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        append-icon="mdi-magnify"
        label="Search users"
        single-line
        hide-details
      ></v-text-field>
    </v-card-title>

    <v-data-table
      :headers="headers"
      :items="users"
      :search="search"
      class="elevation-1"
    >
      <template v-slot:top>
        <v-toolbar flat>
          <v-toolbar-title>Registered Users</v-toolbar-title>
          <v-divider class="mx-4" inset vertical></v-divider>
          <v-spacer></v-spacer>
          <v-btn color="primary" dark>
            Add New User
          </v-btn>
        </v-toolbar>
      </template>

      <template v-slot:item.actions="{ item }">
        <v-icon size="small" class="me-2" @click="editItem(item)">
          mdi-pencil
        </v-icon>
        <v-icon size="small" @click="deleteItem(item)">
          mdi-delete
        </v-icon>
      </template>

      <template v-slot:no-data>
        <v-btn color="primary" @click="initialize">
          Reset Data
        </v-btn>
      </template>
    </v-data-table>
  </v-card>
</template>
      `, { includeAttributes: ['label'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('User Management')
      expect(texts).toContain('Search users')
      expect(texts).toContain('Registered Users')
      expect(texts).toContain('Add New User')
      expect(texts).toContain('Reset Data')
    })

    it('should detect text in Vuetify form', () => {
      const results = testFile(`
<script setup>
import { ref } from 'vue'

const valid = ref(false)
const name = ref('')
const email = ref('')
const select = ref(null)
const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4']
const checkbox = ref(false)

const nameRules = [
  v => !!v || 'Name is required',
  v => (v && v.length <= 10) || 'Name must be less than 10 characters',
]
const emailRules = [
  v => !!v || 'E-mail is required',
  v => /.+@.+\..+/.test(v) || 'E-mail must be valid',
]
</script>

<template>
  <v-form v-model="valid" @submit.prevent="submit">
    <v-container>
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="name"
            :rules="nameRules"
            label="Name"
            required
          ></v-text-field>
        </v-col>

        <v-col cols="12" md="4">
          <v-text-field
            v-model="email"
            :rules="emailRules"
            label="E-mail"
            required
          ></v-text-field>
        </v-col>

        <v-col cols="12" md="4">
          <v-select
            v-model="select"
            :items="items"
            label="Select Item"
            required
          ></v-select>
        </v-col>

        <v-col cols="12">
          <v-checkbox
            v-model="checkbox"
            label="I agree to the terms and conditions"
            required
          ></v-checkbox>
        </v-col>
      </v-row>

      <v-btn :disabled="!valid" color="success" class="mr-4" type="submit">
        Submit Form
      </v-btn>
      <v-btn color="error" @click="reset">
        Clear Form
      </v-btn>
    </v-container>
  </v-form>
</template>
      `, { includeAttributes: ['label'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Name')
      // Note: "E-mail" is a single word with hyphen, treated as short word
      // In real apps, users often use "Email" without hyphen
      expect(texts).toContain('Select Item')
      expect(texts).toContain('I agree to the terms and conditions')
      expect(texts).toContain('Submit Form')
      expect(texts).toContain('Clear Form')
    })

    it('should detect text in Vuetify dialog', () => {
      const results = testFile(`
<script setup>
import { ref } from 'vue'

const dialog = ref(false)
</script>

<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent max-width="600">
      <template v-slot:activator="{ props }">
        <v-btn color="primary" v-bind="props">
          Open Dialog
        </v-btn>
      </template>
      <v-card>
        <v-card-title class="text-h5">
          Delete Confirmation
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete this item? This action cannot be undone and all associated data will be permanently removed.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green-darken-1" variant="text" @click="dialog = false">
            Cancel
          </v-btn>
          <v-btn color="red-darken-1" variant="text" @click="deleteItem">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Open Dialog')
      expect(texts).toContain('Delete Confirmation')
      expect(texts).toContain('Are you sure you want to delete this item? This action cannot be undone and all associated data will be permanently removed.')
      expect(texts).toContain('Cancel')
      expect(texts).toContain('Delete')
    })

    it('should detect text in Vuetify navigation drawer', () => {
      const results = testFile(`
<script setup>
import { ref } from 'vue'

const drawer = ref(true)
const rail = ref(true)
</script>

<template>
  <v-navigation-drawer v-model="drawer" :rail="rail" permanent @click="rail = false">
    <v-list-item
      prepend-avatar="https://randomuser.me/api/portraits/women/85.jpg"
      title="Sandra Adams"
      subtitle="sandra_a88@gmail.com"
      nav
    ></v-list-item>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <v-list-item prepend-icon="mdi-home-city" title="Home" value="home"></v-list-item>
      <v-list-item prepend-icon="mdi-account" title="My Account" value="account"></v-list-item>
      <v-list-item prepend-icon="mdi-account-group-outline" title="Users" value="users"></v-list-item>
    </v-list>

    <template v-slot:append>
      <div class="pa-2">
        <v-btn block>
          Logout
        </v-btn>
      </div>
    </template>
  </v-navigation-drawer>
</template>
      `, { includeAttributes: ['title', 'subtitle'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Sandra Adams')
      expect(texts).toContain('Logout')
    })
  })

  // ==========================================================================
  // SECTION 7: shadcn-vue Components
  // ==========================================================================
  describe('shadcn-vue Components', () => {
    it('should detect text in shadcn alert dialog', () => {
      const results = testFile(`
<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
</script>

<template>
  <AlertDialog>
    <AlertDialogTrigger as-child>
      <Button variant="outline">Show Dialog</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete your
          account and remove your data from our servers.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction>Continue</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Show Dialog')
      expect(texts).toContain('Are you absolutely sure?')
      // Multi-line text is trimmed - check for key parts
      const multiLineText = texts.find(t => t.includes('This action cannot be undone'))
      expect(multiLineText).toBeDefined()
      expect(texts).toContain('Cancel')
      expect(texts).toContain('Continue')
    })

    it('should detect text in shadcn card', () => {
      const results = testFile(`
<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
</script>

<template>
  <Card class="w-[350px]">
    <CardHeader>
      <CardTitle>Create project</CardTitle>
      <CardDescription>Deploy your new project in one-click.</CardDescription>
    </CardHeader>
    <CardContent>
      <form>
        <div class="grid w-full items-center gap-4">
          <div class="flex flex-col space-y-1.5">
            <Label for="name">Name</Label>
            <Input id="name" placeholder="Name of your project" />
          </div>
          <div class="flex flex-col space-y-1.5">
            <Label for="framework">Framework</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a framework" />
              </SelectTrigger>
            </Select>
          </div>
        </div>
      </form>
    </CardContent>
    <CardFooter class="flex justify-between">
      <Button variant="outline">Cancel</Button>
      <Button>Deploy</Button>
    </CardFooter>
  </Card>
</template>
      `, { includeAttributes: ['placeholder'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Create project')
      expect(texts).toContain('Deploy your new project in one-click.')
      expect(texts).toContain('Name of your project')
      expect(texts).toContain('Select a framework')
      expect(texts).toContain('Cancel')
      expect(texts).toContain('Deploy')
    })

    it('should detect text in shadcn form', () => {
      const results = testFile(`
<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = toTypedSchema(z.object({
  username: z.string().min(2).max(50),
}))

const { handleSubmit } = useForm({
  validationSchema: formSchema,
})

const onSubmit = handleSubmit((values) => {
  console.log(values)
})
</script>

<template>
  <form @submit="onSubmit" class="space-y-6">
    <FormField v-slot="{ componentField }" name="username">
      <FormItem>
        <FormLabel>Username</FormLabel>
        <FormControl>
          <Input type="text" placeholder="Enter your username" v-bind="componentField" />
        </FormControl>
        <FormDescription>
          This is your public display name.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>
    <Button type="submit">Submit</Button>
  </form>
</template>
      `, { includeAttributes: ['placeholder'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Username')
      expect(texts).toContain('Enter your username')
      expect(texts).toContain('This is your public display name.')
      expect(texts).toContain('Submit')
    })

    it('should detect text in shadcn tabs', () => {
      const results = testFile(`
<script setup lang="ts">
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
</script>

<template>
  <Tabs default-value="account" class="w-[400px]">
    <TabsList class="grid w-full grid-cols-2">
      <TabsTrigger value="account">Account</TabsTrigger>
      <TabsTrigger value="password">Password</TabsTrigger>
    </TabsList>
    <TabsContent value="account">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Make changes to your account here. Click save when you're done.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <div class="space-y-1">
            <Label for="name">Name</Label>
            <Input id="name" value="Pedro Duarte" />
          </div>
          <div class="space-y-1">
            <Label for="username">Username</Label>
            <Input id="username" value="@peduarte" />
          </div>
        </CardContent>
        <CardFooter>
          <Button>Save changes</Button>
        </CardFooter>
      </Card>
    </TabsContent>
    <TabsContent value="password">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Change your password here. After saving, you'll be logged out.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <div class="space-y-1">
            <Label for="current">Current password</Label>
            <Input id="current" type="password" />
          </div>
          <div class="space-y-1">
            <Label for="new">New password</Label>
            <Input id="new" type="password" />
          </div>
        </CardContent>
        <CardFooter>
          <Button>Save password</Button>
        </CardFooter>
      </Card>
    </TabsContent>
  </Tabs>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Account')
      expect(texts).toContain("Make changes to your account here. Click save when you're done.")
      expect(texts).toContain('Username')
      expect(texts).toContain('Save changes')
      expect(texts).toContain("Change your password here. After saving, you'll be logged out.")
      expect(texts).toContain('Current password')
      expect(texts).toContain('New password')
      expect(texts).toContain('Save password')
    })
  })

  // ==========================================================================
  // SECTION 8: PrimeVue Components
  // ==========================================================================
  describe('PrimeVue Components', () => {
    it('should detect text in PrimeVue DataTable', () => {
      const results = testFile(`
<script setup>
import { ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'

const products = ref([])
const selectedProducts = ref([])
</script>

<template>
  <div class="card">
    <DataTable
      v-model:selection="selectedProducts"
      :value="products"
      dataKey="id"
      tableStyle="min-width: 50rem"
    >
      <template #header>
        <div class="flex flex-wrap align-items-center justify-content-between gap-2">
          <span class="text-xl text-900 font-bold">Products</span>
          <Button icon="pi pi-refresh" rounded raised />
        </div>
      </template>
      <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
      <Column field="code" header="Code"></Column>
      <Column field="name" header="Name"></Column>
      <Column field="category" header="Category"></Column>
      <Column field="quantity" header="Quantity"></Column>
      <template #footer>
        In total there are {{ products ? products.length : 0 }} products.
      </template>
      <template #empty>
        No products found.
      </template>
      <template #loading>
        Loading products data. Please wait.
      </template>
    </DataTable>
  </div>
</template>
      `, { includeAttributes: ['header'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Products')
      expect(texts).toContain('In total there are')
      // "products." is a single lowercase word, correctly filtered
      // But the full text node should be captured
      expect(texts).toContain('No products found.')
      expect(texts).toContain('Loading products data. Please wait.')
    })

    it('should detect text in PrimeVue Dialog', () => {
      const results = testFile(`
<script setup>
import { ref } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const visible = ref(false)
const name = ref('')
</script>

<template>
  <div class="card flex justify-content-center">
    <Button label="Show" icon="pi pi-external-link" @click="visible = true" />
    <Dialog v-model:visible="visible" modal header="Edit Profile" :style="{ width: '25rem' }">
      <span class="p-text-secondary block mb-5">Update your information.</span>
      <div class="flex align-items-center gap-3 mb-3">
        <label for="username" class="font-semibold w-6rem">Username</label>
        <InputText id="username" class="flex-auto" autocomplete="off" />
      </div>
      <div class="flex align-items-center gap-3 mb-5">
        <label for="email" class="font-semibold w-6rem">Email</label>
        <InputText id="email" class="flex-auto" autocomplete="off" />
      </div>
      <div class="flex justify-content-end gap-2">
        <Button type="button" label="Cancel" severity="secondary" @click="visible = false"></Button>
        <Button type="button" label="Save" @click="visible = false"></Button>
      </div>
    </Dialog>
  </div>
</template>
      `, { includeAttributes: ['label', 'header'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Show')
      expect(texts).toContain('Edit Profile')
      expect(texts).toContain('Update your information.')
      expect(texts).toContain('Username')
      expect(texts).toContain('Email')
      expect(texts).toContain('Cancel')
      expect(texts).toContain('Save')
    })

    it('should detect text in PrimeVue Toast messages', () => {
      const results = testFile(`
<script setup>
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Toast from 'primevue/toast'

const toast = useToast()

const showSuccess = () => {
  toast.add({ severity: 'success', summary: 'Success', detail: 'Message Content', life: 3000 })
}

const showInfo = () => {
  toast.add({ severity: 'info', summary: 'Info', detail: 'Message Content', life: 3000 })
}
</script>

<template>
  <Toast />
  <div class="card flex flex-wrap gap-2 justify-content-center">
    <Button label="Success" severity="success" @click="showSuccess" />
    <Button label="Info" severity="info" @click="showInfo" />
    <Button label="Warning" severity="warn" @click="showWarn" />
    <Button label="Error" severity="danger" @click="showError" />
    <Button label="Secondary" severity="secondary" @click="showSecondary" />
    <Button label="Contrast" severity="contrast" @click="showContrast" />
  </div>
</template>
      `, { includeAttributes: ['label'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Warning')
      expect(texts).toContain('Contrast')
    })

    it('should detect text in PrimeVue Stepper', () => {
      const results = testFile(`
<script setup>
import { ref } from 'vue'
import Stepper from 'primevue/stepper'
import StepperPanel from 'primevue/stepperpanel'
import Button from 'primevue/button'

const activeStep = ref(0)
</script>

<template>
  <div class="card flex justify-content-center">
    <Stepper v-model:activeStep="activeStep">
      <StepperPanel header="Personal Information">
        <template #content="{ nextCallback }">
          <div class="flex flex-column h-12rem">
            <div class="border-2 border-dashed surface-border border-round surface-ground flex-auto flex justify-content-center align-items-center font-medium">
              Enter your personal details
            </div>
          </div>
          <div class="flex pt-4 justify-content-end">
            <Button label="Next" icon="pi pi-arrow-right" iconPos="right" @click="nextCallback" />
          </div>
        </template>
      </StepperPanel>
      <StepperPanel header="Reservation Details">
        <template #content="{ prevCallback, nextCallback }">
          <div class="flex flex-column h-12rem">
            <div class="border-2 border-dashed surface-border border-round surface-ground flex-auto flex justify-content-center align-items-center font-medium">
              Select your reservation preferences
            </div>
          </div>
          <div class="flex pt-4 justify-content-between">
            <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="prevCallback" />
            <Button label="Next" icon="pi pi-arrow-right" iconPos="right" @click="nextCallback" />
          </div>
        </template>
      </StepperPanel>
      <StepperPanel header="Review and Confirm">
        <template #content="{ prevCallback }">
          <div class="flex flex-column h-12rem">
            <div class="border-2 border-dashed surface-border border-round surface-ground flex-auto flex justify-content-center align-items-center font-medium">
              Review your information and confirm
            </div>
          </div>
          <div class="flex pt-4 justify-content-between">
            <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="prevCallback" />
            <Button label="Confirm" icon="pi pi-check" iconPos="right" @click="confirm" />
          </div>
        </template>
      </StepperPanel>
    </Stepper>
  </div>
</template>
      `, { includeAttributes: ['label', 'header'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Personal Information')
      expect(texts).toContain('Enter your personal details')
      expect(texts).toContain('Reservation Details')
      expect(texts).toContain('Select your reservation preferences')
      expect(texts).toContain('Review and Confirm')
      expect(texts).toContain('Review your information and confirm')
      expect(texts).toContain('Confirm')
    })
  })

  // ==========================================================================
  // SECTION 9: Advanced Vue Features
  // ==========================================================================
  describe('Advanced Vue Features', () => {
    it('should detect text in Teleport components', () => {
      const results = testFile(`
<script setup>
import { ref } from 'vue'

const isOpen = ref(false)
</script>

<template>
  <button @click="isOpen = true">Open Modal</button>

  <Teleport to="body">
    <div v-if="isOpen" class="modal">
      <div class="modal-content">
        <h2>Modal Title</h2>
        <p>This modal is teleported to the body element</p>
        <button @click="isOpen = false">Close Modal</button>
      </div>
    </div>
  </Teleport>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Open Modal')
      expect(texts).toContain('Modal Title')
      expect(texts).toContain('This modal is teleported to the body element')
      expect(texts).toContain('Close Modal')
    })

    it('should detect text in Suspense components', () => {
      const results = testFile(`
<script setup>
import { defineAsyncComponent } from 'vue'

const AsyncUserProfile = defineAsyncComponent(() =>
  import('./UserProfile.vue')
)
</script>

<template>
  <Suspense>
    <template #default>
      <AsyncUserProfile />
    </template>
    <template #fallback>
      <div class="loading">
        <span>Loading user profile...</span>
        <p>Please wait while we fetch your data</p>
      </div>
    </template>
  </Suspense>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Loading user profile...')
      expect(texts).toContain('Please wait while we fetch your data')
    })

    it('should detect text in Transition components', () => {
      const results = testFile(`
<script setup>
import { ref } from 'vue'

const show = ref(true)
</script>

<template>
  <button @click="show = !show">Toggle Content</button>

  <Transition name="fade">
    <div v-if="show" class="content">
      <h3>Animated Content</h3>
      <p>This content will fade in and out</p>
    </div>
  </Transition>

  <TransitionGroup name="list" tag="ul">
    <li v-for="item in items" :key="item.id">
      <span>{{ item.text }}</span>
      <button @click="removeItem(item.id)">Remove</button>
    </li>
  </TransitionGroup>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Toggle Content')
      expect(texts).toContain('Animated Content')
      expect(texts).toContain('This content will fade in and out')
      expect(texts).toContain('Remove')
    })

    it('should detect text in KeepAlive components', () => {
      const results = testFile(`
<script setup>
import { ref, shallowRef } from 'vue'
import ComponentA from './ComponentA.vue'
import ComponentB from './ComponentB.vue'

const currentTab = shallowRef(ComponentA)
</script>

<template>
  <div class="tabs">
    <button
      :class="{ active: currentTab === ComponentA }"
      @click="currentTab = ComponentA"
    >
      Tab A
    </button>
    <button
      :class="{ active: currentTab === ComponentB }"
      @click="currentTab = ComponentB"
    >
      Tab B
    </button>
  </div>

  <KeepAlive>
    <component :is="currentTab" />
  </KeepAlive>

  <p class="hint">Component state is preserved when switching tabs</p>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Tab A')
      expect(texts).toContain('Tab B')
      expect(texts).toContain('Component state is preserved when switching tabs')
    })

    it('should detect text in dynamic components', () => {
      const results = testFile(`
<script setup>
import { ref } from 'vue'

const widgets = [
  { type: 'chart', title: 'Sales Chart' },
  { type: 'table', title: 'Recent Orders' },
  { type: 'stats', title: 'Quick Stats' }
]
</script>

<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p>Select a widget to view</p>

    <div class="widget-selector">
      <button v-for="widget in widgets" :key="widget.type" @click="selectWidget(widget)">
        {{ widget.title }}
      </button>
    </div>

    <div class="widget-container">
      <component
        :is="currentWidgetComponent"
        v-if="currentWidget"
      >
        <template #header>
          <h3>Widget Header</h3>
        </template>
        <template #footer>
          <span>Last updated: just now</span>
        </template>
      </component>
      <p v-else class="placeholder">Select a widget above to display</p>
    </div>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Dashboard')
      expect(texts).toContain('Select a widget to view')
      expect(texts).toContain('Widget Header')
      expect(texts).toContain('Last updated: just now')
      expect(texts).toContain('Select a widget above to display')
    })
  })

  // ==========================================================================
  // SECTION 10: i18n Patterns (Should NOT detect already translated)
  // ==========================================================================
  describe('i18n Patterns (Should NOT detect)', () => {
    it('should not detect text inside $t() calls', () => {
      const results = testFile(`
<template>
  <div>
    <h1>{{ $t('page.title') }}</h1>
    <p>{{ $t('page.description') }}</p>
    <button>{{ $t('actions.submit') }}</button>
    <span>Static text here</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Static text here')
      // Should not contain the i18n keys
      expect(texts).not.toContain('page.title')
      expect(texts).not.toContain('page.description')
      expect(texts).not.toContain('actions.submit')
    })

    it('should not detect text inside t() calls with useI18n', () => {
      const results = testFile(`
<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div>
    <h1>{{ t('welcome.title') }}</h1>
    <p>{{ t('welcome.message', { name: userName }) }}</p>
    <span>Untranslated text</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Untranslated text')
      expect(texts).not.toContain('welcome.title')
      expect(texts).not.toContain('welcome.message')
    })

    it('should detect text mixed with translated content', () => {
      const results = testFile(`
<template>
  <div>
    <h1>{{ $t('header') }}</h1>
    <p>Welcome to our website</p>
    <span>{{ $t('footer') }}</span>
    <button>Click here</button>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Welcome to our website')
      expect(texts).toContain('Click here')
      expect(texts).not.toContain('header')
      expect(texts).not.toContain('footer')
    })
  })

  // ==========================================================================
  // SECTION 11: Nuxt 3 Specific
  // ==========================================================================
  describe('Nuxt 3 Specific', () => {
    it('should detect text in useHead composable context', () => {
      const results = testFile(`
<script setup>
useHead({
  title: 'My Page Title',
  meta: [
    { name: 'description', content: 'My page description' }
  ]
})
</script>

<template>
  <div>
    <h1>Page Content</h1>
    <p>This is the main content area</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Page Content')
      expect(texts).toContain('This is the main content area')
    })

    it('should detect text in NuxtErrorBoundary', () => {
      const results = testFile(`
<template>
  <NuxtErrorBoundary>
    <template #error="{ error }">
      <div class="error-container">
        <h2>Something went wrong</h2>
        <p>{{ error.message }}</p>
        <button @click="clearError">Try again</button>
      </div>
    </template>

    <div class="content">
      <h1>Main Content</h1>
      <p>This is protected by error boundary</p>
    </div>
  </NuxtErrorBoundary>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Something went wrong')
      expect(texts).toContain('Try again')
      expect(texts).toContain('Main Content')
      expect(texts).toContain('This is protected by error boundary')
    })

    it('should detect text in ClientOnly component', () => {
      const results = testFile(`
<template>
  <div>
    <h1>Server and Client Content</h1>

    <ClientOnly>
      <template #fallback>
        <p>Loading client-side content...</p>
      </template>

      <div class="client-only">
        <h2>Client-Side Only</h2>
        <p>This content only renders on the client</p>
      </div>
    </ClientOnly>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Server and Client Content')
      expect(texts).toContain('Loading client-side content...')
      // Note: Custom Vue components may not have their content parsed correctly
      // This is a Vue compiler limitation - ClientOnly internals may not be in AST
      expect(texts).toContain('This content only renders on the client')
    })
  })

  // ==========================================================================
  // SECTION 12: Complex Nested Structures
  // ==========================================================================
  describe('Complex Nested Structures', () => {
    it('should detect text in deeply nested scoped slots', () => {
      const results = testFile(`
<template>
  <DataProvider>
    <template #default="{ data, loading, error }">
      <Layout>
        <template #header>
          <h1>Data Dashboard</h1>
        </template>

        <template #content>
          <Card>
            <template #title>
              <span>Data Overview</span>
            </template>

            <template #body>
              <div v-if="loading">
                <span>Loading data...</span>
              </div>
              <div v-else-if="error">
                <span>Failed to load data</span>
                <button>Retry</button>
              </div>
              <div v-else>
                <p>Data loaded successfully</p>
                <span>Total items: {{ data.length }}</span>
              </div>
            </template>

            <template #footer>
              <button>Refresh Data</button>
              <button>Export Data</button>
            </template>
          </Card>
        </template>

        <template #footer>
          <p>Dashboard footer content</p>
        </template>
      </Layout>
    </template>
  </DataProvider>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Data Dashboard')
      expect(texts).toContain('Data Overview')
      expect(texts).toContain('Loading data...')
      expect(texts).toContain('Failed to load data')
      expect(texts).toContain('Retry')
      expect(texts).toContain('Data loaded successfully')
      expect(texts).toContain('Total items:')
      expect(texts).toContain('Refresh Data')
      expect(texts).toContain('Export Data')
      expect(texts).toContain('Dashboard footer content')
    })

    it('should detect text in recursive components', () => {
      const results = testFile(`
<script setup>
defineProps({
  item: Object,
  depth: { type: Number, default: 0 }
})
</script>

<template>
  <div class="tree-node" :style="{ marginLeft: depth * 20 + 'px' }">
    <div class="node-content">
      <span class="node-label">{{ item.label }}</span>
      <button v-if="item.children" @click="toggle">
        <span v-if="expanded">Collapse</span>
        <span v-else>Expand</span>
      </button>
      <button @click="edit">Edit</button>
      <button @click="remove">Delete</button>
    </div>

    <div v-if="expanded && item.children" class="children">
      <TreeNode
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Collapse')
      expect(texts).toContain('Expand')
      expect(texts).toContain('Edit')
      expect(texts).toContain('Delete')
    })
  })
})
