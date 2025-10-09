import { paths } from '@/paths';

export const layoutConfig = {
  navItems: [
    {
      key: 'dashboards',
      title: 'Dashboards',
      items: [
        //{ key: 'overview', title: 'Overview', href: paths.dashboard.overview, icon: 'house' },
        //{ key: 'model-refinement', icon: 'rocket-launch', title: 'Smart Optimization', href: paths.dashboard.modelRefinement },
        { key: 'agents-monitoring', icon: 'rocket-launch', title: 'Agent Performance', href: paths.dashboard.agentsMonitoring },
        { key: 'automated-insights', icon: 'chart-line', title: 'Release Hub', href: paths.dashboard.modelInsights },
        { key: 'evaluation-hub', icon: 'gauge', title: 'Evaluation Suite', href: paths.dashboard.evaluationHub },
        { key: 'agents-tracing', icon: 'tracing', title: 'Tracing', href: paths.dashboard.agentsTracing },

      ],
    },
    {
      key: 'general',
      title: 'General',
      items: [
        {
          key: 'onboarding-guide',
          title: 'Need a guide?',
          icon: 'question',
          disabled: false,
          onboardingTrigger: true,
        },
        {
          key: 'settings',
          title: 'Settings',
          href: paths.dashboard.settings.account,
          icon: 'gear',
          matcher: { type: 'startsWith', href: '/settings' },
        },
      ],
    },
  ],
};
