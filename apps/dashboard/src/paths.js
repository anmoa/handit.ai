/**
 * @fileoverview Application Routes Configuration
 * 
 * This file centralizes all application routes in a single object, providing
 * type-safe and maintainable route management. It includes both static and
 * dynamic routes with their respective parameters.
 * 
 * Features:
 * - Centralized route management
 * - Type-safe route generation
 * - Support for dynamic routes with parameters
 * - Organized by feature/module
 * 
 * @example
 * // Using static routes:
 * router.push(paths.dashboard.overview);
 * 
 * // Using nested routes:
 * router.push(paths.dashboard.settings.account);
 */

/**
 * Application Routes Configuration
 * 
 * @type {Object}
 * @property {Object} paths - All application routes
 * 
 * 
 * @property {Object} paths.auth - Authentication routes
 * @property {Object} paths.auth.custom - Custom authentication routes
 * @property {string} paths.auth.custom.signIn - Sign in page route
 * @property {string} paths.auth.custom.signUp - Sign up page route
 * @property {string} paths.auth.custom.resetPassword - Reset password page route
 * 
 * @property {Object} paths.dashboard - Dashboard routes
 * @property {string} paths.dashboard.overview - Dashboard overview route
 * @property {Object} paths.dashboard.settings - Settings routes
 * @property {Object} paths.dashboard.monitoring - Monitoring routes
 * @property {string} paths.dashboard.evaluationHub - Evaluation hub route for model evaluators
 * 
 * @property {Object} paths.components - UI components routes
 * @property {string} paths.components.index - Components index route
 * @property {string} paths.components.buttons - Buttons showcase route
 * @property {string} paths.components.charts - Charts showcase route
 * 
 * @property {string} paths.notAuthorized - Not authorized error page route
 * @property {string} paths.notFound - Not found error page route
 * @property {string} paths.internalServerError - Server error page route
 * 
 * @property {string} paths.docs - Documentation external link
 * @property {string} paths.purchase - Purchase page external link
 */
export const paths = {
  home: '/',
  auth: {
    custom: {
      signIn: '/auth/custom/sign-in',
      signUp: '/auth/custom/sign-up',
      resetPassword: '/auth/custom/reset-password',
    },
  },
  dashboard: {
    overview: '/',
    settings: {
      account: '/settings/account',
      billing: '/settings/billing',
      integrations: '/settings/integrations',
      tokens: '/settings/tokens',
      notifications: '/settings/notifications',
      security: '/settings/security',
      team: '/settings/team',
    },
    analytics: '/analytics',
    modelInsights: '/prompt-versions',
    monitoring: {
      list: '/monitoring',
      create: '/monitoring/create',
      details: (modelId) => `/monitoring/${modelId}`,
      error: {
        details: (errorId) => `/monitoring/error/${errorId}`,
      },
      performance: {
        details: (metricId) => `/monitoring/performance/${metricId}`,
      },
    },
    agentsMonitoring: '/ag-monitoring',
    agentsTracing: '/ag-tracing',
    businessMetrics: '/businessMetrics',
    smartFeedbackLoop: '/dynamic-review',
    modelRefinement: '/model-refinement',
    datasets: '/datasets',
    evaluationHub: '/evaluation-hub',
    docs: '/docs',
    mail: {
      list: (label) => `/mail/${label}`,
      details: (label, emailId) => `/mail/${label}/${emailId}`,
    },
  },
  components: {
    index: '/components',
    buttons: '/components/buttons',
    charts: '/components/charts',
    colors: '/components/colors',
    detailLists: '/components/detail-lists',
    forms: '/components/forms',
    gridLists: '/components/grid-lists',
    groupedLists: '/components/grouped-lists',
    inputs: '/components/inputs',
    modals: '/components/modals',
    quickStats: '/components/quick-stats',
    tables: '/components/tables',
    typography: '/components/typography',
  },
  notAuthorized: '/errors/not-authorized',
  notFound: '/errors/not-found',
  internalServerError: '/errors/internal-server-error',
  docs: 'https://material-kit-pro-react-docs.devias.io',
  purchase: 'https://mui.com/store/items/devias-kit-pro',
};
