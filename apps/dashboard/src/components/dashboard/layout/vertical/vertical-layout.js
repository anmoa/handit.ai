'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useGetMineModelLogsCountQuery } from '@/services/modelsService';
import { Link, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import GlobalStyles from '@mui/material/GlobalStyles';
import RouterLink from 'next/link';

import { useSettings } from '@/hooks/use-settings';
import { isSandboxPage } from '@/lib/sandbox';

import { layoutConfig } from '../config';
import { MainNav } from './main-nav';
import { SideNav } from './side-nav';

export function VerticalLayout({ children, forceNavOpen = false }) {
  const { settings } = useSettings();
  const pathname = usePathname();
  const [sideNavOpen, setSideNavOpen] = React.useState(false);
  const [onboardingActive, setOnboardingActive] = React.useState(false);

  // Listen for onboarding state changes
  React.useEffect(() => {
    const handleOnboardingStateChange = (event) => {
      setOnboardingActive(event.detail.active);
    };

    // Check initial state
    if (typeof window !== 'undefined' && window.__onboardingActive) {
      setOnboardingActive(true);
    }

    // Listen for changes
    window.addEventListener('onboardingStateChange', handleOnboardingStateChange);

    return () => {
      window.removeEventListener('onboardingStateChange', handleOnboardingStateChange);
    };
  }, []);
  let modelLogs = { count: 1 };

  const sideNavWidth = (sideNavOpen || onboardingActive) ? '280px' : '64px';

  return (
    <React.Fragment>
      <GlobalStyles
        styles={{
          body: {
            '--MainNav-height': '56px',
            '--MainNav-zIndex': 1000,
            '--SideNav-width': sideNavWidth,
            '--SideNav-zIndex': 1100,
            '--MobileNav-width': '320px',
            '--MobileNav-zIndex': 1100,
          },
        }}
      />
      <Box
        sx={{
          bgcolor: 'var(--mui-palette-background-default)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: '100%',
        }}
      >
        {pathname !== '/smart-review-tool' && <SideNav color={settings.navColor} items={layoutConfig.navItems} open={sideNavOpen} setOpen={setSideNavOpen} forceOpen={forceNavOpen || onboardingActive} />}
        <Box
          sx={{
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            pl: { lg: pathname.includes('smart-review-tool') ? '' : sideNavWidth },
          }}
        >
          <MainNav
            items={layoutConfig.navItems}
            onNewEvaluator={pathname.includes('evaluation-hub') ? () => window.dispatchEvent(new CustomEvent('openNewEvaluator')) : undefined}
          />
          <Box
            component="main"
            sx={{
              '--Content-margin': '0 auto',
              '--Content-maxWidth': 'var(--maxWidth-xl)',
              '--Content-paddingX': '24px',
              '--Content-paddingY': { xs: '24px', lg: '64px' },
              '--Content-padding': 'var(--Content-paddingY) var(--Content-paddingX)',
              '--Content-width': '100%',
              display: 'flex',
              flex: '1 1 auto',
              flexDirection: 'column',
            }}
          >
            {modelLogs && modelLogs.count === 0 && !pathname.includes('settings') && !pathname.includes('smart-review-tool') && (
              <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                color: 'black',
                height: '30px',
                mx: 'auto',
                width: '100%',
                boxShadow: 1,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                zIndex: 1,
              }}>
              <Typography sx={{ mr: 1, fontWeight: '500', fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
              Get started by connecting your agents for continuous self-improvement.
              </Typography>
              <Link
                component={RouterLink}
                href="https://docs.handit.ai/quickstart"
                target="_blank"
                sx={{ fontWeight: '500', fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'underline', fontWeight: 'bold' }}
              >
                Learn How
              </Link>
              </div>

            </Box>
            )}
            <div
              style={{
                marginTop:
                  modelLogs && modelLogs.count === 0 && !pathname.includes('settings') && !pathname.includes('smart-review-tool')
                    ? pathname.includes('dynamic-review')
                      ? '-2%'
                      : '-4%'
                    : '-4%',
              }}
            >
              {
                children
              }
            </div>
          </Box>
        </Box>
      </Box>
      
    </React.Fragment>
  );
}
