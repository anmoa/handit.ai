'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Select, MenuItem } from '@mui/material';
import { Warning } from '@phosphor-icons/react';
import { useSelector } from 'react-redux';

import { usePopover } from '@/hooks/use-popover';
import { workspaces } from './workspaces-popover';
import { useUser } from '@/hooks/use-user';
import { useGetUserQuery } from '@/services/auth/authService';
import { paths } from '@/paths';
export function WorkspacesSwitch({ onlyIcon = false }) {
  const router = useRouter();
  const popover = usePopover();
  const workspace = workspaces[0];
  const { user } = useSelector((state) => state.auth);
  const { data: userData, error, isLoading } = useGetUserQuery(undefined, {
    skip: !!user,
  });
  
  const displayUser = user || userData;

  // Get initial environment from localStorage or default to 'production'
  const [selectedOption, setSelectedOption] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const env = localStorage.getItem('environment') || 'production';
      return env === 'production' ? 'company' : 'company-staging';
    }
    return 'company';
  });

  const handleChange = (event) => {
    const newValue = event.target.value;
    setSelectedOption(newValue);
    // Store environment based on selection
    localStorage.setItem('environment', newValue === 'company' ? 'production' : 'staging');
    
    // Navigate to ag-monitoring and reload the page
    router.push(paths.dashboard.agentsMonitoring);
    window.location.reload();
  };

  return (
    <Stack
      direction="row"
      ref={popover.anchorRef}
      spacing={2}
      sx={{
        alignItems: 'center',
        border: '1px solid var(--Workspaces-border-color)',
        borderRadius: '12px',
        p: '4px 8px',
        position: 'relative',
      }}
    >
      <Avatar 
        src={displayUser?.company?.icon && displayUser?.company?.icon.length > 0 
          ? displayUser?.company?.icon 
          : '/assets/logo 2.svg'} 
        variant="rounded" 
      />
      {onlyIcon ? null : (
        <Select
          value={selectedOption}
          onChange={handleChange}
        size="small"
        variant="standard"
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: '200px',
              width: 'auto',
              marginTop: '8px',
            }
          },
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
        }}
        sx={{
          flex: '1 1 auto',
          '&:before': { display: 'none' },
          '&:after': { display: 'none' },
          '& .MuiSelect-select': { 
            py: 0,
            typography: 'subtitle2',
            color: selectedOption === 'company-staging' ? 'var(--Workspaces-name-color)' : 'var(--Workspaces-name-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            textAlign: 'left',
            maxWidth: '140px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }
        }}
      >
        <MenuItem 
          value="company"
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px'
          }}
        >
          {displayUser?.company?.name || workspace.name} (Prod)
        </MenuItem>
        <MenuItem 
          value="company-staging" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 0.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px'
          }}
        >
          {`${displayUser?.company?.name || workspace.name} (Staging)`}
          </MenuItem>
        </Select>
      )}
    </Stack>
  );
}
