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

describe('rawStringDetector - Comprehensive Real-World Tests', () => {
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
  // SECTION 1: Basic Vue Template Patterns
  // ==========================================================================
  describe('Basic Vue Templates', () => {
    it('should detect text in simple div elements', () => {
      const results = testFile(`
<template>
  <div>Welcome to our application</div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Welcome to our application')
    })

    it('should detect text in nested elements', () => {
      const results = testFile(`
<template>
  <div>
    <section>
      <article>
        <p>This is a deeply nested paragraph</p>
      </article>
    </section>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('This is a deeply nested paragraph')
    })

    it('should detect multiple text nodes in same element', () => {
      const results = testFile(`
<template>
  <div>
    <h1>Main Heading</h1>
    <h2>Subheading Text</h2>
    <p>First paragraph content</p>
    <p>Second paragraph content</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Main Heading')
      expect(texts).toContain('Subheading Text')
      expect(texts).toContain('First paragraph content')
      expect(texts).toContain('Second paragraph content')
    })

    it('should detect text in span and strong elements', () => {
      const results = testFile(`
<template>
  <div>
    <span>Inline text here</span>
    <strong>Bold important text</strong>
    <em>Emphasized text</em>
    <small>Fine print text</small>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Inline text here')
      expect(texts).toContain('Bold important text')
      expect(texts).toContain('Emphasized text')
      expect(texts).toContain('Fine print text')
    })

    it('should detect text with punctuation', () => {
      const results = testFile(`
<template>
  <div>
    <p>Hello, world!</p>
    <p>Are you sure?</p>
    <p>Processing...</p>
    <p>Item: value</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Hello, world!')
      expect(texts).toContain('Are you sure?')
      expect(texts).toContain('Processing...')
    })
  })

  // ==========================================================================
  // SECTION 2: Form Elements
  // ==========================================================================
  describe('Form Elements', () => {
    it('should detect placeholder attributes', () => {
      const results = testFile(`
<template>
  <form>
    <input placeholder="Enter your email address" />
    <input placeholder="Enter your password" />
    <textarea placeholder="Write your message here"></textarea>
  </form>
</template>
      `, { includeAttributes: ['placeholder'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Enter your email address')
      expect(texts).toContain('Enter your password')
      expect(texts).toContain('Write your message here')
    })

    it('should detect form labels', () => {
      const results = testFile(`
<template>
  <form>
    <label>Email Address</label>
    <label>Password</label>
    <label>Confirm Password</label>
  </form>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Email Address')
      expect(texts).toContain('Confirm Password')
    })

    it('should detect error messages', () => {
      const results = testFile(`
<template>
  <form>
    <span class="error">This field is required</span>
    <span class="error">Please enter a valid email</span>
    <span class="error">Password must be at least 8 characters</span>
  </form>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('This field is required')
      expect(texts).toContain('Please enter a valid email')
      expect(texts).toContain('Password must be at least 8 characters')
    })

    it('should detect button text', () => {
      const results = testFile(`
<template>
  <form>
    <button>Submit Form</button>
    <button>Cancel</button>
    <button>Reset</button>
    <button>Save Changes</button>
  </form>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Submit Form')
      expect(texts).toContain('Cancel')
      expect(texts).toContain('Reset')
      expect(texts).toContain('Save Changes')
    })

    it('should detect select option text', () => {
      const results = testFile(`
<template>
  <select>
    <option>Select an option</option>
    <option>United States</option>
    <option>United Kingdom</option>
    <option>Canada</option>
  </select>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Select an option')
      expect(texts).toContain('United States')
      expect(texts).toContain('United Kingdom')
    })

    it('should detect checkbox and radio labels', () => {
      const results = testFile(`
<template>
  <div>
    <label><input type="checkbox" /> I agree to the terms and conditions</label>
    <label><input type="radio" /> Free shipping</label>
    <label><input type="radio" /> Express delivery</label>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('I agree to the terms and conditions')
      expect(texts).toContain('Free shipping')
      expect(texts).toContain('Express delivery')
    })
  })

  // ==========================================================================
  // SECTION 3: Table Patterns
  // ==========================================================================
  describe('Table Patterns', () => {
    it('should detect table headers', () => {
      const results = testFile(`
<template>
  <table>
    <thead>
      <tr>
        <th>Product Name</th>
        <th>Quantity</th>
        <th>Price</th>
        <th>Actions</th>
      </tr>
    </thead>
  </table>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Product Name')
      expect(texts).toContain('Actions')
    })

    it('should detect table cell content', () => {
      const results = testFile(`
<template>
  <table>
    <tbody>
      <tr>
        <td>No data available</td>
      </tr>
      <tr>
        <td>Loading results</td>
      </tr>
    </tbody>
  </table>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('No data available')
      expect(texts).toContain('Loading results')
    })

    it('should detect table caption', () => {
      const results = testFile(`
<template>
  <table>
    <caption>Monthly Sales Report</caption>
    <thead>
      <tr><th>Month</th><th>Revenue</th></tr>
    </thead>
  </table>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Monthly Sales Report')
    })
  })

  // ==========================================================================
  // SECTION 4: Navigation Patterns
  // ==========================================================================
  describe('Navigation Patterns', () => {
    it('should detect nav link text', () => {
      const results = testFile(`
<template>
  <nav>
    <a href="/home">Home</a>
    <a href="/about">About Us</a>
    <a href="/contact">Contact</a>
    <a href="/products">Products</a>
  </nav>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('About Us')
      expect(texts).toContain('Products')
    })

    it('should detect breadcrumb text', () => {
      const results = testFile(`
<template>
  <nav class="breadcrumb">
    <span>Home</span>
    <span>/</span>
    <span>Products</span>
    <span>/</span>
    <span>Electronics</span>
  </nav>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Electronics')
    })

    it('should detect menu items', () => {
      const results = testFile(`
<template>
  <ul class="menu">
    <li>Dashboard</li>
    <li>Settings</li>
    <li>Profile</li>
    <li>Logout</li>
  </ul>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Dashboard')
      expect(texts).toContain('Settings')
      expect(texts).toContain('Logout')
    })
  })

  // ==========================================================================
  // SECTION 5: Modal and Dialog Patterns
  // ==========================================================================
  describe('Modal and Dialog Patterns', () => {
    it('should detect modal title and content', () => {
      const results = testFile(`
<template>
  <div class="modal">
    <div class="modal-header">
      <h3>Confirm Deletion</h3>
    </div>
    <div class="modal-body">
      <p>Are you sure you want to delete this item? This action cannot be undone.</p>
    </div>
    <div class="modal-footer">
      <button>Cancel</button>
      <button>Delete</button>
    </div>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Confirm Deletion')
      expect(texts).toContain('Are you sure you want to delete this item? This action cannot be undone.')
      expect(texts).toContain('Cancel')
      expect(texts).toContain('Delete')
    })

    it('should detect alert messages', () => {
      const results = testFile(`
<template>
  <div>
    <div class="alert alert-success">Your changes have been saved successfully!</div>
    <div class="alert alert-error">An error occurred while processing your request.</div>
    <div class="alert alert-warning">Please review your information before continuing.</div>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Your changes have been saved successfully!')
      expect(texts).toContain('An error occurred while processing your request.')
      expect(texts).toContain('Please review your information before continuing.')
    })

    it('should detect tooltip text', () => {
      const results = testFile(`
<template>
  <div>
    <button title="Click to save your progress">Save</button>
    <span title="This field is required">*</span>
  </div>
</template>
      `, { includeAttributes: ['title'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Click to save your progress')
      expect(texts).toContain('This field is required')
    })
  })

  // ==========================================================================
  // SECTION 6: E-commerce Patterns
  // ==========================================================================
  describe('E-commerce Patterns', () => {
    it('should detect product card text', () => {
      const results = testFile(`
<template>
  <div class="product-card">
    <h3>Wireless Bluetooth Headphones</h3>
    <p>High-quality sound with noise cancellation</p>
    <span class="price-label">Price:</span>
    <span class="stock">In Stock</span>
    <button>Add to Cart</button>
    <button>Buy Now</button>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Wireless Bluetooth Headphones')
      expect(texts).toContain('High-quality sound with noise cancellation')
      expect(texts).toContain('In Stock')
      expect(texts).toContain('Add to Cart')
      expect(texts).toContain('Buy Now')
    })

    it('should detect shopping cart text', () => {
      const results = testFile(`
<template>
  <div class="cart">
    <h2>Shopping Cart</h2>
    <p>Your cart is empty</p>
    <span>Subtotal:</span>
    <span>Shipping:</span>
    <span>Total:</span>
    <button>Proceed to Checkout</button>
    <a>Continue Shopping</a>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Shopping Cart')
      expect(texts).toContain('Your cart is empty')
      expect(texts).toContain('Proceed to Checkout')
      expect(texts).toContain('Continue Shopping')
    })

    it('should detect checkout form labels', () => {
      const results = testFile(`
<template>
  <form class="checkout">
    <h2>Shipping Information</h2>
    <label>Full Name</label>
    <label>Street Address</label>
    <label>City</label>
    <label>Postal Code</label>
    <h2>Payment Method</h2>
    <label>Card Number</label>
    <label>Expiration Date</label>
    <label>Security Code</label>
  </form>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Shipping Information')
      expect(texts).toContain('Full Name')
      expect(texts).toContain('Street Address')
      expect(texts).toContain('Payment Method')
      expect(texts).toContain('Card Number')
    })
  })

  // ==========================================================================
  // SECTION 7: Dashboard Patterns
  // ==========================================================================
  describe('Dashboard Patterns', () => {
    it('should detect dashboard widget titles', () => {
      const results = testFile(`
<template>
  <div class="dashboard">
    <div class="widget">
      <h3>Total Revenue</h3>
      <span class="label">This Month</span>
    </div>
    <div class="widget">
      <h3>Active Users</h3>
      <span class="label">Last 24 Hours</span>
    </div>
    <div class="widget">
      <h3>Pending Orders</h3>
      <span class="label">Requires Action</span>
    </div>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Total Revenue')
      expect(texts).toContain('This Month')
      expect(texts).toContain('Active Users')
      expect(texts).toContain('Last 24 Hours')
      expect(texts).toContain('Pending Orders')
      expect(texts).toContain('Requires Action')
    })

    it('should detect chart labels', () => {
      const results = testFile(`
<template>
  <div class="chart-container">
    <h4>Sales Overview</h4>
    <p>Revenue by Category</p>
    <span class="legend">Electronics</span>
    <span class="legend">Clothing</span>
    <span class="legend">Home & Garden</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Sales Overview')
      expect(texts).toContain('Revenue by Category')
      expect(texts).toContain('Home & Garden')
    })
  })

  // ==========================================================================
  // SECTION 8: Common UI Words (Single Words)
  // ==========================================================================
  describe('Common UI Words', () => {
    it('should detect common action words', () => {
      const results = testFile(`
<template>
  <div>
    <button>Save</button>
    <button>Cancel</button>
    <button>Delete</button>
    <button>Edit</button>
    <button>Submit</button>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Save')
      expect(texts).toContain('Cancel')
      expect(texts).toContain('Delete')
      expect(texts).toContain('Edit')
      expect(texts).toContain('Submit')
    })

    it('should detect status words', () => {
      const results = testFile(`
<template>
  <div>
    <span>Loading</span>
    <span>Success</span>
    <span>Error</span>
    <span>Warning</span>
    <span>Required</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Loading')
      expect(texts).toContain('Success')
      expect(texts).toContain('Error')
      expect(texts).toContain('Warning')
      expect(texts).toContain('Required')
    })

    it('should detect navigation words', () => {
      const results = testFile(`
<template>
  <div>
    <a>Back</a>
    <a>Next</a>
    <a>Previous</a>
    <button>Continue</button>
    <button>Skip</button>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Back')
      expect(texts).toContain('Next')
      expect(texts).toContain('Previous')
      expect(texts).toContain('Continue')
      expect(texts).toContain('Skip')
    })
  })

  // ==========================================================================
  // SECTION 9: Accessibility Attributes
  // ==========================================================================
  describe('Accessibility Attributes', () => {
    it('should detect aria-label attributes', () => {
      const results = testFile(`
<template>
  <div>
    <button aria-label="Close dialog">X</button>
    <button aria-label="Open navigation menu">☰</button>
    <input aria-label="Search products" />
  </div>
</template>
      `, { includeAttributes: ['aria-label'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Close dialog')
      expect(texts).toContain('Open navigation menu')
      expect(texts).toContain('Search products')
    })

    it('should detect alt text for images', () => {
      const results = testFile(`
<template>
  <div>
    <img alt="Company logo" src="/logo.png" />
    <img alt="Product thumbnail image" src="/product.jpg" />
    <img alt="User profile picture" src="/avatar.jpg" />
  </div>
</template>
      `, { includeAttributes: ['alt'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Company logo')
      expect(texts).toContain('Product thumbnail image')
      expect(texts).toContain('User profile picture')
    })
  })

  // ==========================================================================
  // SECTION 10: Conditional Content
  // ==========================================================================
  describe('Conditional Content', () => {
    it('should detect text in v-if blocks', () => {
      const results = testFile(`
<template>
  <div>
    <p v-if="isLoggedIn">Welcome back, user!</p>
    <p v-else>Please log in to continue</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Welcome back, user!')
      expect(texts).toContain('Please log in to continue')
    })

    it('should detect text in v-show elements', () => {
      const results = testFile(`
<template>
  <div>
    <span v-show="loading">Loading data...</span>
    <span v-show="error">Failed to load data</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Loading data...')
      expect(texts).toContain('Failed to load data')
    })
  })

  // ==========================================================================
  // SECTION 11: Loop Content
  // ==========================================================================
  describe('Loop Content', () => {
    it('should detect static text within v-for loops', () => {
      const results = testFile(`
<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <span class="label">Item name:</span>
      <button>Remove</button>
      <button>Edit</button>
    </li>
  </ul>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Item name:')
      expect(texts).toContain('Remove')
      expect(texts).toContain('Edit')
    })
  })

  // ==========================================================================
  // SECTION 12: Slots
  // ==========================================================================
  describe('Slot Content', () => {
    it('should detect default slot content', () => {
      const results = testFile(`
<template>
  <CustomCard>
    <p>This is the card content</p>
  </CustomCard>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('This is the card content')
    })

    it('should detect named slot content', () => {
      const results = testFile(`
<template>
  <CustomLayout>
    <template #header>
      <h1>Page Header Title</h1>
    </template>
    <template #footer>
      <p>Footer content here</p>
    </template>
  </CustomLayout>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Page Header Title')
      expect(texts).toContain('Footer content here')
    })
  })

  // ==========================================================================
  // SECTION 13: Vue Component Libraries (Element UI, Vuetify, etc.)
  // ==========================================================================
  describe('Component Library Patterns', () => {
    it('should detect Element UI component text', () => {
      const results = testFile(`
<template>
  <div>
    <el-button>Primary Button</el-button>
    <el-dialog title="Edit Profile">
      <p>Update your profile information</p>
    </el-dialog>
    <el-alert title="Success" description="Your settings have been saved"></el-alert>
  </div>
</template>
      `, { includeAttributes: ['title', 'description'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Primary Button')
      expect(texts).toContain('Update your profile information')
    })

    it('should detect Vuetify component text', () => {
      const results = testFile(`
<template>
  <v-app>
    <v-card>
      <v-card-title>Welcome to Dashboard</v-card-title>
      <v-card-text>This is your personal dashboard</v-card-text>
      <v-card-actions>
        <v-btn>View Details</v-btn>
        <v-btn>Dismiss</v-btn>
      </v-card-actions>
    </v-card>
  </v-app>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Welcome to Dashboard')
      expect(texts).toContain('This is your personal dashboard')
      expect(texts).toContain('View Details')
      expect(texts).toContain('Dismiss')
    })

    it('should detect PrimeVue component text', () => {
      const results = testFile(`
<template>
  <div>
    <Button label="Click Me">Submit</Button>
    <Message severity="info">This is an informational message</Message>
    <Dialog header="Confirm Action">
      <p>Are you sure you want to proceed?</p>
    </Dialog>
  </div>
</template>
      `, { includeAttributes: ['label', 'header'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('This is an informational message')
      expect(texts).toContain('Are you sure you want to proceed?')
    })
  })

  // ==========================================================================
  // SECTION 14: Nuxt-Specific Patterns
  // ==========================================================================
  describe('Nuxt-Specific Patterns', () => {
    it('should detect NuxtLink text', () => {
      const results = testFile(`
<template>
  <div>
    <NuxtLink to="/about">About Us</NuxtLink>
    <NuxtLink to="/contact">Contact Us</NuxtLink>
    <NuxtLink to="/blog">Read Our Blog</NuxtLink>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('About Us')
      expect(texts).toContain('Contact Us')
      expect(texts).toContain('Read Our Blog')
    })

    it('should detect text in Nuxt layout components', () => {
      const results = testFile(`
<template>
  <div>
    <header>
      <h1>My Application</h1>
      <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/dashboard">Dashboard</NuxtLink>
      </nav>
    </header>
    <main>
      <slot />
    </main>
    <footer>
      <p>Copyright 2024 My Company</p>
    </footer>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('My Application')
      expect(texts).toContain('Copyright 2024 My Company')
    })
  })

  // ==========================================================================
  // SECTION 15: Edge Cases - Text That Should Be Detected
  // ==========================================================================
  describe('Edge Cases - Should Detect', () => {
    it('should detect text with special characters', () => {
      const results = testFile(`
<template>
  <div>
    <p>Terms & Conditions</p>
    <p>50% Off Sale</p>
    <p>Price: $99.99</p>
    <p>Rating: 4.5/5 stars</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Terms & Conditions')
      expect(texts).toContain('50% Off Sale')
      expect(texts).toContain('Price: $99.99')
      expect(texts).toContain('Rating: 4.5/5 stars')
    })

    it('should detect text with unicode characters', () => {
      const results = testFile(`
<template>
  <div>
    <p>Welcome! 👋</p>
    <p>© 2024 Company Name</p>
    <p>Temperature: 25°C</p>
    <p>€ 1,234.56</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Welcome! 👋')
      expect(texts).toContain('© 2024 Company Name')
      expect(texts).toContain('Temperature: 25°C')
    })

    it('should detect multi-line text', () => {
      const results = testFile(`
<template>
  <div>
    <p>This is a very long message that spans
       multiple lines in the source code but
       should be treated as one string</p>
  </div>
</template>
      `)

      expect(results.length).toBeGreaterThan(0)
      // The text should be detected (exact formatting may vary)
    })

    it('should detect text that looks technical but is user-facing', () => {
      const results = testFile(`
<template>
  <div>
    <p>Error 404: Page Not Found</p>
    <p>Version 2.0 Released</p>
    <p>Step 1 of 5</p>
    <p>Updated 5 minutes ago</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Error 404: Page Not Found')
      expect(texts).toContain('Version 2.0 Released')
      expect(texts).toContain('Step 1 of 5')
      expect(texts).toContain('Updated 5 minutes ago')
    })

    it('should detect quoted text in UI', () => {
      const results = testFile(`
<template>
  <div>
    <p>"Success is not final, failure is not fatal"</p>
    <p>Click "Next" to continue</p>
    <p>The 'Submit' button is disabled</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('"Success is not final, failure is not fatal"')
      expect(texts).toContain('Click "Next" to continue')
      expect(texts).toContain("The 'Submit' button is disabled")
    })

    it('should detect text with numbers mixed in', () => {
      const results = testFile(`
<template>
  <div>
    <p>You have 5 new messages</p>
    <p>Show 10 items per page</p>
    <p>Page 1 of 10</p>
    <p>3 items selected</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('You have 5 new messages')
      expect(texts).toContain('Show 10 items per page')
      expect(texts).toContain('Page 1 of 10')
      expect(texts).toContain('3 items selected')
    })

    it('should detect abbreviations that are words', () => {
      const results = testFile(`
<template>
  <div>
    <p>FAQ</p>
    <p>USA</p>
    <p>PDF Download</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('PDF Download')
    })

    it('should detect sentences starting with lowercase', () => {
      const results = testFile(`
<template>
  <div>
    <p>e.g., this is an example</p>
    <p>i.e., in other words</p>
    <p>no items found</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('e.g., this is an example')
      expect(texts).toContain('i.e., in other words')
      expect(texts).toContain('no items found')
    })
  })

  // ==========================================================================
  // SECTION 16: Non-Translatable Strings (Should NOT Detect)
  // ==========================================================================
  describe('Non-Translatable Strings - Should NOT Detect', () => {
    it('should not detect URLs', () => {
      const results = testFile(`
<template>
  <div>
    <a href="https://example.com">Visit</a>
    <a href="http://api.example.com/endpoint">API</a>
    <span>www.example.org</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('https://example.com')
      expect(texts).not.toContain('http://api.example.com/endpoint')
      expect(texts).not.toContain('www.example.org')
    })

    it('should not detect email addresses', () => {
      const results = testFile(`
<template>
  <div>
    <span>support@example.com</span>
    <a href="mailto:info@company.org">Contact</a>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('support@example.com')
      expect(texts).not.toContain('info@company.org')
    })

    it('should not detect hex colors', () => {
      const results = testFile(`
<template>
  <div>
    <span>#FF5733</span>
    <span>#fff</span>
    <span>#00FF00FF</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('#FF5733')
      expect(texts).not.toContain('#fff')
      expect(texts).not.toContain('#00FF00FF')
    })

    it('should not detect numbers only', () => {
      const results = testFile(`
<template>
  <div>
    <span>123</span>
    <span>456789</span>
    <span>0</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('123')
      expect(texts).not.toContain('456789')
      expect(texts).not.toContain('0')
    })

    it('should not detect CSS classes in class attribute', () => {
      const results = testFile(`
<template>
  <div class="container mx-auto px-4">
    <span class="text-red-500 font-bold">Text</span>
  </div>
</template>
      `, { includeAttributes: ['class'] })

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('container mx-auto px-4')
      expect(texts).not.toContain('text-red-500 font-bold')
    })

    it('should not detect camelCase identifiers', () => {
      const results = testFile(`
<template>
  <div>
    <span>userName</span>
    <span>firstName</span>
    <span>isActive</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('userName')
      expect(texts).not.toContain('firstName')
      expect(texts).not.toContain('isActive')
    })

    it('should not detect PascalCase identifiers', () => {
      const results = testFile(`
<template>
  <div>
    <span>UserProfile</span>
    <span>MyComponent</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('UserProfile')
      expect(texts).not.toContain('MyComponent')
    })

    it('should not detect file paths', () => {
      const results = testFile(`
<template>
  <div>
    <span>/path/to/file</span>
    <span>./relative/path</span>
    <span>../parent/dir</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('/path/to/file')
      expect(texts).not.toContain('./relative/path')
      expect(texts).not.toContain('../parent/dir')
    })

    it('should not detect short constants', () => {
      const results = testFile(`
<template>
  <div>
    <span>ID</span>
    <span>API</span>
    <span>URL</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('ID')
      expect(texts).not.toContain('API')
      expect(texts).not.toContain('URL')
    })

    it('should not detect destructuring syntax', () => {
      const results = testFile(`
<template>
  <div>
    <span>{{ item }}</span>
    <span>{{ { name, id } }}</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('{ name, id }')
    })

    it('should not detect single lowercase words not in UI list', () => {
      const results = testFile(`
<template>
  <div>
    <span>foo</span>
    <span>bar</span>
    <span>baz</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('foo')
      expect(texts).not.toContain('bar')
      expect(texts).not.toContain('baz')
    })

    it('should not detect kebab-case identifiers', () => {
      const results = testFile(`
<template>
  <div>
    <span>user-profile</span>
    <span>btn-primary</span>
    <span>text-lg</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('user-profile')
      expect(texts).not.toContain('btn-primary')
      expect(texts).not.toContain('text-lg')
    })
  })

  // ==========================================================================
  // SECTION 17: Complex Real-World Components
  // ==========================================================================
  describe('Complex Real-World Components', () => {
    it('should handle a complete login form', () => {
      const results = testFile(`
<template>
  <div class="login-container">
    <h1>Sign In to Your Account</h1>
    <p class="subtitle">Enter your credentials below</p>

    <form @submit.prevent="login">
      <div class="form-group">
        <label for="email">Email Address</label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email"
          v-model="email"
        />
        <span v-if="errors.email" class="error">{{ errors.email }}</span>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          v-model="password"
        />
        <a href="/forgot-password">Forgot your password?</a>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="remember" />
          Remember me on this device
        </label>
      </div>

      <button type="submit" :disabled="loading">
        <span v-if="loading">Signing in...</span>
        <span v-else>Sign In</span>
      </button>
    </form>

    <p class="signup-link">
      Don't have an account? <a href="/signup">Create one here</a>
    </p>
  </div>
</template>
      `, { includeAttributes: ['placeholder'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Sign In to Your Account')
      expect(texts).toContain('Enter your credentials below')
      expect(texts).toContain('Email Address')
      expect(texts).toContain('Enter your email')
      expect(texts).toContain('Enter your password')
      expect(texts).toContain('Forgot your password?')
      expect(texts).toContain('Remember me on this device')
      expect(texts).toContain('Signing in...')
      expect(texts).toContain('Sign In')
      expect(texts).toContain('Create one here')
    })

    it('should handle a data table component', () => {
      const results = testFile(`
<template>
  <div class="data-table">
    <div class="table-header">
      <h2>User Management</h2>
      <div class="actions">
        <input placeholder="Search users..." v-model="search" />
        <button>Add New User</button>
        <button>Export Data</button>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Last Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.name }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.role }}</td>
          <td>
            <span v-if="user.active" class="badge success">Active</span>
            <span v-else class="badge error">Inactive</span>
          </td>
          <td>{{ user.lastActive }}</td>
          <td>
            <button title="Edit user">Edit</button>
            <button title="Delete user">Delete</button>
          </td>
        </tr>
        <tr v-if="users.length === 0">
          <td colspan="6">No users found matching your criteria</td>
        </tr>
      </tbody>
    </table>

    <div class="pagination">
      <span>Showing 1-10 of 100 results</span>
      <button>Previous</button>
      <button>Next</button>
    </div>
  </div>
</template>
      `, { includeAttributes: ['placeholder', 'title'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('User Management')
      expect(texts).toContain('Search users...')
      expect(texts).toContain('Add New User')
      expect(texts).toContain('Export Data')
      expect(texts).toContain('Last Active')
      expect(texts).toContain('Active')
      expect(texts).toContain('Inactive')
      expect(texts).toContain('Edit user')
      expect(texts).toContain('Delete user')
      expect(texts).toContain('No users found matching your criteria')
      expect(texts).toContain('Showing 1-10 of 100 results')
    })

    it('should handle a settings page', () => {
      const results = testFile(`
<template>
  <div class="settings">
    <h1>Account Settings</h1>

    <section>
      <h2>Profile Information</h2>
      <p>Update your account details and preferences</p>

      <div class="form-group">
        <label>Display Name</label>
        <input v-model="displayName" />
        <small>This is how your name will appear to others</small>
      </div>

      <div class="form-group">
        <label>Bio</label>
        <textarea placeholder="Tell us about yourself"></textarea>
      </div>
    </section>

    <section>
      <h2>Notification Preferences</h2>
      <p>Choose how you want to be notified</p>

      <label>
        <input type="checkbox" v-model="emailNotifications" />
        Email notifications
      </label>

      <label>
        <input type="checkbox" v-model="pushNotifications" />
        Push notifications
      </label>

      <label>
        <input type="checkbox" v-model="smsNotifications" />
        SMS notifications
      </label>
    </section>

    <section>
      <h2>Danger Zone</h2>
      <p>These actions are permanent and cannot be undone</p>

      <button class="danger">Delete Account</button>
    </section>

    <div class="actions">
      <button>Save Changes</button>
      <button>Cancel</button>
    </div>
  </div>
</template>
      `, { includeAttributes: ['placeholder'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Account Settings')
      expect(texts).toContain('Profile Information')
      expect(texts).toContain('Update your account details and preferences')
      expect(texts).toContain('Display Name')
      expect(texts).toContain('This is how your name will appear to others')
      expect(texts).toContain('Tell us about yourself')
      expect(texts).toContain('Notification Preferences')
      expect(texts).toContain('Choose how you want to be notified')
      expect(texts).toContain('Email notifications')
      expect(texts).toContain('Push notifications')
      expect(texts).toContain('SMS notifications')
      expect(texts).toContain('Danger Zone')
      expect(texts).toContain('These actions are permanent and cannot be undone')
      expect(texts).toContain('Delete Account')
      expect(texts).toContain('Save Changes')
    })
  })

  // ==========================================================================
  // SECTION 18: Error Pages and Empty States
  // ==========================================================================
  describe('Error Pages and Empty States', () => {
    it('should detect 404 page content', () => {
      const results = testFile(`
<template>
  <div class="error-page">
    <h1>404</h1>
    <h2>Page Not Found</h2>
    <p>Sorry, we couldn't find the page you're looking for.</p>
    <p>The page might have been removed or the link might be broken.</p>
    <div class="actions">
      <button>Go to Homepage</button>
      <button>Go Back</button>
      <button>Contact Support</button>
    </div>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Page Not Found')
      expect(texts).toContain("Sorry, we couldn't find the page you're looking for.")
      expect(texts).toContain('The page might have been removed or the link might be broken.')
      expect(texts).toContain('Go to Homepage')
      expect(texts).toContain('Contact Support')
    })

    it('should detect empty state messages', () => {
      const results = testFile(`
<template>
  <div class="empty-state">
    <img src="/empty-inbox.svg" alt="Empty inbox illustration" />
    <h3>No messages yet</h3>
    <p>When you receive messages, they will appear here</p>
    <button>Compose New Message</button>
  </div>
</template>
      `, { includeAttributes: ['alt'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Empty inbox illustration')
      expect(texts).toContain('No messages yet')
      expect(texts).toContain('When you receive messages, they will appear here')
      expect(texts).toContain('Compose New Message')
    })

    it('should detect loading state messages', () => {
      const results = testFile(`
<template>
  <div class="loading-state">
    <div class="spinner"></div>
    <p>Loading your data...</p>
    <small>This may take a few moments</small>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Loading your data...')
      expect(texts).toContain('This may take a few moments')
    })

    it('should detect error state messages', () => {
      const results = testFile(`
<template>
  <div class="error-state">
    <h3>Something went wrong</h3>
    <p>We encountered an error while loading your data</p>
    <p>Please try again or contact support if the problem persists</p>
    <button>Try Again</button>
    <button>Report Issue</button>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Something went wrong')
      expect(texts).toContain('We encountered an error while loading your data')
      expect(texts).toContain('Please try again or contact support if the problem persists')
      expect(texts).toContain('Try Again')
      expect(texts).toContain('Report Issue')
    })
  })

  // ==========================================================================
  // SECTION 19: Headers and Footers
  // ==========================================================================
  describe('Headers and Footers', () => {
    it('should detect header content', () => {
      const results = testFile(`
<template>
  <header>
    <div class="logo">
      <span>Company Name</span>
    </div>
    <nav>
      <a href="/">Home</a>
      <a href="/products">Products</a>
      <a href="/pricing">Pricing</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
    <div class="user-menu">
      <button>Sign In</button>
      <button>Get Started</button>
    </div>
  </header>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Company Name')
      expect(texts).toContain('Products')
      expect(texts).toContain('Pricing')
      expect(texts).toContain('Sign In')
      expect(texts).toContain('Get Started')
    })

    it('should detect footer content', () => {
      const results = testFile(`
<template>
  <footer>
    <div class="footer-section">
      <h4>Company</h4>
      <a href="/about">About Us</a>
      <a href="/careers">Careers</a>
      <a href="/press">Press</a>
    </div>
    <div class="footer-section">
      <h4>Legal</h4>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
      <a href="/cookies">Cookie Policy</a>
    </div>
    <div class="footer-section">
      <h4>Support</h4>
      <a href="/help">Help Center</a>
      <a href="/faq">FAQ</a>
      <a href="/contact">Contact Us</a>
    </div>
    <div class="footer-bottom">
      <p>© 2024 Company Name. All rights reserved.</p>
      <p>Made with love in San Francisco</p>
    </div>
  </footer>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('About Us')
      expect(texts).toContain('Careers')
      expect(texts).toContain('Privacy Policy')
      expect(texts).toContain('Terms of Service')
      expect(texts).toContain('Help Center')
      expect(texts).toContain('Contact Us')
      expect(texts).toContain('© 2024 Company Name. All rights reserved.')
      expect(texts).toContain('Made with love in San Francisco')
    })
  })

  // ==========================================================================
  // SECTION 20: Tricky Patterns
  // ==========================================================================
  describe('Tricky Patterns', () => {
    it('should handle text mixed with interpolations', () => {
      const results = testFile(`
<template>
  <div>
    <p>Hello, {{ userName }}!</p>
    <p>You have {{ count }} items in your cart</p>
    <p>Welcome to {{ appName }}</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      // Should detect the static parts (single chars like "!" are filtered as too short)
      expect(texts).toContain('Hello,')
      // Note: "!" alone is too short to be translatable (< 2 chars)
      expect(texts).not.toContain('!')
      expect(texts).toContain('You have')
      expect(texts).toContain('items in your cart')
      expect(texts).toContain('Welcome to')
    })

    it('should handle attributes that look like they should be translated', () => {
      const results = testFile(`
<template>
  <div>
    <img src="/logo.png" alt="Company Logo" />
    <button disabled title="This action is not available">
      Disabled Button
    </button>
  </div>
</template>
      `, { includeAttributes: ['alt', 'title'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Company Logo')
      expect(texts).toContain('This action is not available')
      expect(texts).toContain('Disabled Button')
    })

    it('should not detect already translated text (i18n calls)', () => {
      const results = testFile(`
<template>
  <div>
    <p>{{ $t('message.hello') }}</p>
    <p>{{ t('message.world') }}</p>
    <p>Static text here</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Static text here')
      // Should not contain the i18n key strings
      expect(texts).not.toContain('message.hello')
      expect(texts).not.toContain('message.world')
    })

    it('should handle very long sentences', () => {
      const results = testFile(`
<template>
  <div>
    <p>This is a very long sentence that contains a lot of words and should definitely be detected as translatable text because it clearly represents user-facing content that would need to be translated for international users.</p>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts.length).toBeGreaterThan(0)
      expect(texts[0].length).toBeGreaterThan(50)
    })

    it('should handle text with HTML entities', () => {
      const results = testFile(`
<template>
  <div>
    <p>Price: &euro;99.99</p>
    <p>Copyright &copy; 2024</p>
    <p>&lt;script&gt; tags are not allowed</p>
  </div>
</template>
      `)

      // The parser should handle HTML entities
      expect(results.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // SECTION 21: Config Options
  // ==========================================================================
  describe('Config Options', () => {
    it('should respect ignoreText config', () => {
      const results = testFile(`
<template>
  <div>
    <p>Normal text to translate</p>
    <p>Skip this specific text</p>
    <p>Another normal text</p>
  </div>
</template>
      `, { ignoreText: ['Skip this specific text'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Normal text to translate')
      expect(texts).toContain('Another normal text')
      expect(texts).not.toContain('Skip this specific text')
    })

    it('should respect ignorePattern config', () => {
      const results = testFile(`
<template>
  <div>
    <p>Normal text</p>
    <p>DEBUG: Some debug message</p>
    <p>DEBUG: Another debug</p>
    <p>Regular message</p>
  </div>
</template>
      `, { ignorePattern: '^DEBUG:' })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Normal text')
      expect(texts).toContain('Regular message')
      expect(texts).not.toContain('DEBUG: Some debug message')
      expect(texts).not.toContain('DEBUG: Another debug')
    })

    it('should respect custom includeAttributes', () => {
      const results = testFile(`
<template>
  <div>
    <button data-tooltip="Custom tooltip text">Hover me</button>
    <span data-label="Custom label">Text</span>
  </div>
</template>
      `, { includeAttributes: ['data-tooltip', 'data-label'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Custom tooltip text')
      expect(texts).toContain('Custom label')
      expect(texts).toContain('Hover me')
    })
  })

  // ==========================================================================
  // SECTION 22: Real Nuxt/Vue Ecosystem Components
  // ==========================================================================
  describe('Real Ecosystem Components', () => {
    it('should handle Quasar components', () => {
      const results = testFile(`
<template>
  <q-page>
    <q-card>
      <q-card-section>
        <div class="text-h6">Card Title</div>
        <div class="text-subtitle2">Subtitle text here</div>
      </q-card-section>
      <q-card-section>
        <p>This is the card content area</p>
      </q-card-section>
      <q-card-actions>
        <q-btn flat>Share</q-btn>
        <q-btn flat>Learn More</q-btn>
      </q-card-actions>
    </q-card>
  </q-page>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Card Title')
      expect(texts).toContain('Subtitle text here')
      expect(texts).toContain('This is the card content area')
      expect(texts).toContain('Share')
      expect(texts).toContain('Learn More')
    })

    it('should handle Ant Design Vue components', () => {
      const results = testFile(`
<template>
  <a-layout>
    <a-page-header title="Page Title" sub-title="This is a subtitle">
      <template #extra>
        <a-button>Primary</a-button>
        <a-button>Default</a-button>
      </template>
    </a-page-header>
    <a-card>
      <p>Card content</p>
      <a-button type="primary">Submit</a-button>
    </a-card>
    <a-result status="success" title="Successfully Purchased" sub-title="Order number: 2017182818828182881">
      <template #extra>
        <a-button key="console">Go Console</a-button>
        <a-button key="buy">Buy Again</a-button>
      </template>
    </a-result>
  </a-layout>
</template>
      `, { includeAttributes: ['title', 'sub-title'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Primary')
      expect(texts).toContain('Default')
      expect(texts).toContain('Card content')
      expect(texts).toContain('Go Console')
      expect(texts).toContain('Buy Again')
    })

    it('should handle Bootstrap Vue components', () => {
      const results = testFile(`
<template>
  <b-container>
    <b-card title="Card Title">
      <b-card-text>
        Some quick example text to build on the card title.
      </b-card-text>
      <b-button variant="primary">Go somewhere</b-button>
    </b-card>
    <b-alert show variant="success">
      This is a success alert—check it out!
    </b-alert>
    <b-modal title="Modal Title">
      <p>Modal body content</p>
    </b-modal>
  </b-container>
</template>
      `, { includeAttributes: ['title'] })

      const texts = results.map(r => r.text)
      expect(texts).toContain('Some quick example text to build on the card title.')
      expect(texts).toContain('Go somewhere')
      expect(texts).toContain('This is a success alert—check it out!')
      expect(texts).toContain('Modal body content')
    })
  })

  // ==========================================================================
  // SECTION 23: Internationalization Specific
  // ==========================================================================
  describe('Internationalization Specific', () => {
    it('should detect date format labels', () => {
      const results = testFile(`
<template>
  <div>
    <label>Date Format</label>
    <span>MM/DD/YYYY</span>
    <label>Time Format</label>
    <span>12-hour (AM/PM)</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Date Format')
      expect(texts).toContain('Time Format')
      expect(texts).toContain('12-hour (AM/PM)')
    })

    it('should detect currency and number format labels', () => {
      const results = testFile(`
<template>
  <div>
    <label>Currency</label>
    <span>US Dollar (USD)</span>
    <label>Number Format</label>
    <span>1,234.56</span>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('US Dollar (USD)')
      expect(texts).toContain('Number Format')
    })
  })

  // ==========================================================================
  // SECTION 24: Markdown-like Content
  // ==========================================================================
  describe('Markdown-like Content', () => {
    it('should detect list items', () => {
      const results = testFile(`
<template>
  <div class="prose">
    <h2>Features</h2>
    <ul>
      <li>Easy to use interface</li>
      <li>Fast performance</li>
      <li>Secure by default</li>
      <li>24/7 support available</li>
    </ul>
  </div>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Features')
      expect(texts).toContain('Easy to use interface')
      expect(texts).toContain('Fast performance')
      expect(texts).toContain('Secure by default')
      expect(texts).toContain('24/7 support available')
    })

    it('should detect definition lists', () => {
      const results = testFile(`
<template>
  <dl>
    <dt>API</dt>
    <dd>Application Programming Interface</dd>
    <dt>REST</dt>
    <dd>Representational State Transfer</dd>
  </dl>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Application Programming Interface')
      expect(texts).toContain('Representational State Transfer')
    })

    it('should detect blockquotes', () => {
      const results = testFile(`
<template>
  <blockquote>
    <p>The only way to do great work is to love what you do.</p>
    <footer>Steve Jobs</footer>
  </blockquote>
</template>
      `)

      const texts = results.map(r => r.text)
      expect(texts).toContain('The only way to do great work is to love what you do.')
      expect(texts).toContain('Steve Jobs')
    })
  })
})
