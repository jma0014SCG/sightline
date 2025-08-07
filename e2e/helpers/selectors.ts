/**
 * Centralized test selectors for E2E tests
 * This ensures consistent selector usage across all test files
 */

export const SELECTORS = {
  // Form Elements
  FORMS: {
    summaryCreation: '[data-testid="summary-creation-form"]',
    urlInput: '[data-testid="youtube-url-input"]',
    pasteButton: '[data-testid="paste-button"]',
    submitButton: '[data-testid="create-summary-button"]',
  },

  // Loading States
  LOADING: {
    spinner: '[data-testid="loading-spinner"]',
    progressIndicator: '[data-testid="progress-indicator"]',
    processingMessage: '[data-testid="processing-message"]',
  },

  // Content Areas
  CONTENT: {
    summaryTitle: '[data-testid="summary-title"]',
    summaryContent: '[data-testid="summary-content"]',
    summaryTldr: '[data-testid="summary-tldr"]',
    keyInsights: '[data-testid="key-insights"]',
    keyMoments: '[data-testid="key-moments"]',
    videoEmbed: '[data-testid="video-embed"]',
  },

  // Navigation
  NAVIGATION: {
    homeLink: '[data-testid="home-link"]',
    libraryLink: '[data-testid="library-link"]',
    settingsLink: '[data-testid="settings-link"]',
    billingLink: '[data-testid="billing-link"]',
    logo: '[data-testid="site-logo"]',
  },

  // Authentication
  AUTH: {
    signInButton: '[data-testid="sign-in-button"]',
    signUpButton: '[data-testid="sign-up-button"]',
    signOutButton: '[data-testid="sign-out-button"]',
    authModal: '[data-testid="auth-modal"]',
    authPromptModal: '[data-testid="auth-prompt-modal"]',
    userMenu: '[data-testid="user-menu"]',
    userAvatar: '[data-testid="user-avatar"]',
  },

  // Library
  LIBRARY: {
    container: '[data-testid="library-container"]',
    summaryCard: '[data-testid="summary-card"]',
    summaryTitle: '[data-testid="summary-card-title"]',
    summaryThumbnail: '[data-testid="summary-thumbnail"]',
    summaryDuration: '[data-testid="summary-duration"]',
    summaryTags: '[data-testid="summary-tags"]',
    summaryCategory: '[data-testid="summary-category"]',
    deleteButton: '[data-testid="delete-summary-button"]',
    shareButton: '[data-testid="share-summary-button"]',
    moreActionsButton: '[data-testid="more-actions-button"]',
    emptyState: '[data-testid="library-empty-state"]',
  },

  // Filtering & Search
  FILTERS: {
    container: '[data-testid="library-controls"]',
    searchInput: '[data-testid="search-input"]',
    searchClear: '[data-testid="search-clear"]',
    categoryFilter: '[data-testid="category-filter"]',
    tagFilter: '[data-testid="tag-filter"]',
    sortBy: '[data-testid="sort-by"]',
    viewToggle: '[data-testid="view-toggle"]',
    filterCount: '[data-testid="filter-count"]',
  },

  // Modals & Overlays
  MODALS: {
    backdrop: '[data-testid="modal-backdrop"]',
    closeButton: '[data-testid="modal-close"]',
    confirmButton: '[data-testid="confirm-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    deleteConfirm: '[data-testid="delete-confirm-modal"]',
    shareModal: '[data-testid="share-modal"]',
  },

  // Error States
  ERRORS: {
    message: '[data-testid="error-message"]',
    boundary: '[data-testid="error-boundary"]',
    retry: '[data-testid="retry-button"]',
    fallback: '[data-testid="error-fallback"]',
  },

  // Billing & Payments
  BILLING: {
    upgradeButton: '[data-testid="upgrade-button"]',
    manageSubscription: '[data-testid="manage-subscription"]',
    planCard: '[data-testid="plan-card"]',
    usageIndicator: '[data-testid="usage-indicator"]',
    pricingTable: '[data-testid="pricing-table"]',
    checkoutButton: '[data-testid="checkout-button"]',
  },

  // Settings
  SETTINGS: {
    container: '[data-testid="settings-container"]',
    profileSection: '[data-testid="profile-section"]',
    notificationsSection: '[data-testid="notifications-section"]',
    accountSection: '[data-testid="account-section"]',
    saveButton: '[data-testid="save-settings"]',
    exportButton: '[data-testid="export-data"]',
    deleteAccountButton: '[data-testid="delete-account"]',
  },

  // Landing Page
  LANDING: {
    hero: '[data-testid="hero-section"]',
    features: '[data-testid="features-section"]',
    pricing: '[data-testid="pricing-section"]',
    cta: '[data-testid="cta-section"]',
    demoVideo: '[data-testid="demo-video"]',
    getStartedButton: '[data-testid="get-started-button"]',
  },

  // Smart Collections
  SMART_COLLECTIONS: {
    tagBadge: '[data-testid="tag-badge"]',
    categoryBadge: '[data-testid="category-badge"]',
    tagTypeIndicator: '[data-testid="tag-type"]',
    filterSidebar: '[data-testid="filter-sidebar"]',
    tagCount: '[data-testid="tag-count"]',
    categoryCount: '[data-testid="category-count"]',
  },

  // Performance & Accessibility
  PERFORMANCE: {
    loadingTime: '[data-testid="page-load-time"]',
    resourceCount: '[data-testid="resource-count"]',
    memoryUsage: '[data-testid="memory-usage"]',
  },

  ACCESSIBILITY: {
    skipLink: '[data-testid="skip-to-content"]',
    ariaLive: '[data-testid="aria-live-region"]',
    focusTrap: '[data-testid="focus-trap"]',
    landmark: '[data-testid="main-landmark"]',
  },
} as const;

// Type-safe selector access
export type SelectorPath = keyof typeof SELECTORS;
export type SelectorValue = (typeof SELECTORS)[SelectorPath];

/**
 * Helper function to get selector by path
 */
export function getSelector(path: string): string {
  const keys = path.split(".");
  let selector: any = SELECTORS;

  for (const key of keys) {
    selector = selector[key];
    if (!selector) {
      throw new Error(`Selector not found for path: ${path}`);
    }
  }

  return selector;
}

/**
 * Common selector patterns
 */
export const PATTERNS = {
  // Dynamic selectors that need to be generated
  summaryCardById: (id: string) => `[data-testid="summary-card-${id}"]`,
  tagBadgeByName: (name: string) => `[data-testid="tag-badge-${name}"]`,
  categoryFilterByName: (category: string) =>
    `[data-testid="category-filter-${category}"]`,
  modalById: (id: string) => `[data-testid="modal-${id}"]`,
  buttonByAction: (action: string) => `[data-testid="${action}-button"]`,

  // Common combinations
  formField: (fieldName: string) => `[data-testid="${fieldName}-field"]`,
  loadingState: (component: string) => `[data-testid="${component}-loading"]`,
  errorState: (component: string) => `[data-testid="${component}-error"]`,
  successState: (component: string) => `[data-testid="${component}-success"]`,
} as const;

/**
 * Accessibility-focused selectors
 */
export const A11Y_SELECTORS = {
  // ARIA landmarks
  main: 'main, [role="main"]',
  navigation: 'nav, [role="navigation"]',
  banner: 'header, [role="banner"]',
  contentInfo: 'footer, [role="contentinfo"]',
  search: '[role="search"]',

  // Interactive elements
  buttons: 'button, [role="button"]',
  links: "a[href]",
  inputs: "input, textarea, select",

  // Focus management
  focusable:
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  tabbable:
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',

  // ARIA states
  expanded: '[aria-expanded="true"]',
  collapsed: '[aria-expanded="false"]',
  selected: '[aria-selected="true"]',
  checked: '[aria-checked="true"]',
  disabled: '[aria-disabled="true"], :disabled',

  // Screen reader content
  srOnly: ".sr-only, .visually-hidden",
  ariaLabel: "[aria-label]",
  ariaDescribedBy: "[aria-describedby]",
  ariaLabelledBy: "[aria-labelledby]",
} as const;
