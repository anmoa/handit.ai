/**
 * Agents List Page Component
 * 
 * This page provides a comprehensive interface for managing AI agents with:
 * - Grid view of all available agents
 * - Agent creation and upload capabilities
 * - Agent management actions (edit, clone, download)
 * - Loading states and error handling
 * 
 * The component uses RTK Query for data management and provides
 * a user-friendly interface for agent operations.
 */
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCloneAgentMutation, useGetAgentsQuery, useUploadAgentMutation } from '@/services/agentsService';
import { useOnboardingAgents } from '@/hooks/use-onboarding-agents';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  Card,
  Button,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Skeleton
} from '@mui/material';
import {
  Plus as PlusIcon,
  Brain,
  DotsThreeVertical as DotsIcon,
  PencilSimple as EditIcon,
  Copy as CloneIcon,
  Download as DownloadIcon,
  Upload as UploadIcon
} from '@phosphor-icons/react';

import { ItemCard } from '@/components/dashboard/agents/item-card';

/**
 * Loading skeleton component for agent cards
 * Displays a placeholder card while agent data is being fetched
 */
const AgentSkeleton = () => (
  <Grid item xs={12} sm={6} md={3}>
    <Card sx={{ p: 3, height: '100%' }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Skeleton
            variant="rounded"
            width={40}
            height={40}
            sx={{ bgcolor: 'primary.lighter' }}
          />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="60%" height={24} />
          </Box>
          <Skeleton variant="circular" width={32} height={32} />
        </Stack>
        <Box>
          <Skeleton width="90%" />
          <Skeleton width="70%" />
        </Box>
      </Stack>
    </Card>
  </Grid>
);

/**
 * Main page component for agent management
 * @returns {JSX.Element} The agent management interface
 */
export default function Page() {
  const router = useRouter();

  // RTK Query hooks for data fetching and mutations
  const { data: agents = [] } = useGetAgentsQuery({});
  const [cloneAgent] = useCloneAgentMutation();
  const [uploadAgent] = useUploadAgentMutation();

  // State management
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [selectedAgent, setSelectedAgent] = React.useState(null);
  const [loading, setLoading] = React.useState({
    mcp: false,
    context: false,
    config: false
  });
  const [uploadLoading, setUploadLoading] = React.useState(false);
  const fileInputRef = React.useRef(null);

  /**
   * Handle opening the agent action menu
   * @param {Event} event - The click event
   * @param {Object} agent - The selected agent
   */
  const handleMenuOpen = (event, agent) => {
    event.stopPropagation(); // Prevent event bubbling
    setAnchorEl(event.currentTarget);
    setSelectedAgent(agent);
  };

  /**
   * Handle closing the agent action menu
   */
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAgent(null);
  };

  /**
   * Navigate to agent edit page
   * @param {string} id - The agent ID
   */
  const handleEditAgent = (id) => {
    handleMenuClose();
    router.push(`/agents/edit/${id}`);
  };

  /**
   * Handle agent card click
   * @param {string} id - The agent ID
   */
  const handleCardClick = (id) => {
    router.push(`/agents/edit/${id}`);
  };

  /**
   * Clone an existing agent
   * @param {string} id - The agent ID to clone
   */
  const handleCloneAgent = async (id) => {
    try {
      handleMenuClose();
      const result = await cloneAgent(id).unwrap();
      // Redirect to the edit page of the cloned agent
      if (result?.id) {
        router.push(`/agents/edit/${result.id}`);
      }
    } catch (error) {
      console.error('Failed to clone agent:', error);
    }
  };

  /**
   * Download agent setup files
   * @param {string} type - The type of setup to download ('mcp', 'context', or 'config')
   */
  const handleDownload = async (type) => {
    if (!selectedAgent) return;

    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      let url;
      let filename;

      // Configure download parameters based on type
      switch (type) {
        case 'mcp':
          url = `${process.env.NEXT_PUBLIC_API_URL}setup/mcp/${selectedAgent.id}`;
          filename = 'mcp-setup.zip';
          break;
        case 'context':
          url = `${process.env.NEXT_PUBLIC_API_URL}setup/context/${selectedAgent.id}`;
          filename = 'context-setup.zip';
          break;
        case 'config':
          url = `${process.env.NEXT_PUBLIC_API_URL}setup/config/${selectedAgent.id}`;
          filename = 'config-setup.json';
          break;
      }

      // Download and save the file
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to download ${type} setup: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      // Create and trigger download link
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      handleMenuClose();
    } catch (error) {
      console.error(`Error downloading ${type} setup:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  /**
   * Handle agent file upload
   * @param {Event} event - The file input change event
   */
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      const result = await uploadAgent(file).unwrap();

      // Reload page on successful upload
      if (result?.id) {
        window.location.reload();
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading agent:', error);
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 'var(--Content-maxWidth)',
        m: 'var(--Content-margin)',
        p: 'var(--Content-padding)',
        width: 'var(--Content-width)',
      }}
    >
        <Stack spacing={4}>
          {/* Header section with title only */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: '1 1 auto' }}>
            </Box>
          </Stack>

          {/* Agent grid section */}
        <Grid container spacing={3}>
            {isLoading ? (
              // Show loading skeletons
              [...Array(3)].map((_, index) => (
                <AgentSkeleton key={index} />
              ))
            ) : agents?.length > 0 ? (
              // Show agent cards
              agents.map((agent) => (
              <Grid key={agent.id} item xs={12} sm={6} md={3}>
                  <div onClick={() => handleCardClick(agent.id)}
                    style={{ cursor: 'pointer', height: '100%' }}
                  >
                    <ItemCard
                      title={agent.name}
                      description={agent.description}
                      icon={Brain}
                      onClick={() => handleCardClick(agent.id)}
                      actionIcon={
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, agent)}
                          size="small"
                          sx={{
                            color: 'text.secondary',
                            '&:hover': {
                              color: 'text.primary',
                            },
                          }}
                        >
                          <DotsIcon size={20} weight="bold" />
                        </IconButton>
                      }
                    />
                  </div>
                </Grid>
              ))
            ) : (
              // Show empty state
              <Grid item xs={12}>
                <Card sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No agents found. Create your first agent to get started.
                  </Typography>
                </Card>
              </Grid>
            )}
          </Grid>
        </Stack>
      {/* Agent action menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => selectedAgent && handleEditAgent(selectedAgent.id)}>
          <ListItemIcon>
            <EditIcon size={20} />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedAgent && handleCloneAgent(selectedAgent.id)}>
          <ListItemIcon>
            <CloneIcon size={20} />
          </ListItemIcon>
          <ListItemText>Clone</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => selectedAgent && handleDownload('mcp')}
          disabled={loading.mcp}
        >
          <ListItemIcon>
            <DownloadIcon size={20} />
          </ListItemIcon>
          <ListItemText>{loading.mcp ? 'Downloading...' : 'Download MCP Setup'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => selectedAgent && handleDownload('context')}
          disabled={loading.context}
        >
          <ListItemIcon>
            <DownloadIcon size={20} />
          </ListItemIcon>
          <ListItemText>{loading.context ? 'Downloading...' : 'Download Context Setup'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => selectedAgent && handleDownload('config')}
          disabled={loading.config}
        >
          <ListItemIcon>
            <DownloadIcon size={20} />
          </ListItemIcon>
          <ListItemText>{loading.config ? 'Downloading...' : 'Download Config'}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
} 