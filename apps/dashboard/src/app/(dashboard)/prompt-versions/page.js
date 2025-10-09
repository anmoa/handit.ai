/**
 * Prompt Versions Management Page Component
 * 
 * This page provides a comprehensive interface for managing prompt versions with:
 * - Performance metrics visualization
 * - Model comparison capabilities
 * - Version deployment management
 * - Automated insights
 * - Real-time metrics tracking
 * 
 * The component uses RTK Query for data management and provides
 * a centralized view of prompt version performance and deployment.
 */
'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import { ModelsTable } from '@/components/dashboard/models/models-table';
import { PromptVersionComparison } from '@/components/dashboard/models/prompt-version-comparison';
import { AutomatedInsights } from '@/components/dashboard/automated-insights/automated-insights';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useGetPromptVersionsQuery, useCreatePromptMutation, useReleasePromptMutation, useGetModelOptimizationStatusQuery } from '@/services/promptService';
import Image from 'next/image';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel, Checkbox, Snackbar, Alert } from '@mui/material';
import { useGetAgentByIdAutonomQuery } from '@/services/promptService';
import { CorrectVsIncorrectComparison } from '@/components/dashboard/analytics/correct-vs-incorrect-comparison';
import { useSearchParams } from 'next/navigation';
import { useGetAgentCorrectEntriesQuery } from '@/services/agentsService';
import { PieChart, Pie, Cell } from 'recharts';
import { Avatar, Card } from '@mui/material';
import { CheckCircle, Warning, RocketLaunch } from '@phosphor-icons/react';

/**
 * Main prompt versions management page component
 * Handles prompt version comparison, deployment, and metrics visualization
 * @returns {JSX.Element} The prompt versions management interface
 */
export default function PromptVersionsPage() {
  // State management for model selection and comparison
  const [selectedModel, setSelectedModel] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [rightPromptVersion, setRightPromptVersion] = React.useState(null);
  const [leftPromptVersion, setLeftPromptVersion] = React.useState(null);
  const [leftAccuracy, setLeftAccuracy] = React.useState(null);
  const [rightAccuracy, setRightAccuracy] = React.useState(null);

  // State management for new version creation
  const [isNewVersionDialogOpen, setIsNewVersionDialogOpen] = React.useState(false);
  const [newPromptText, setNewPromptText] = React.useState('');
  const [createAndDeploy, setCreateAndDeploy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [defaultRightVersion, setDefaultRightVersion] = React.useState(null);

  // RTK Query mutations and queries
  const [createPrompt, { isLoading: isCreating }] = useCreatePromptMutation();
  const [releasePrompt, { isLoading: isReleasing }] = useReleasePromptMutation();

  // Environment state management
  const [environment, setEnvironment] = React.useState('production');
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setEnvironment(localStorage.getItem('environment') || 'production');
      // Listen for changes to localStorage from other tabs/windows
      const handler = (e) => {
        if (e.key === 'environment') {
          setEnvironment(e.newValue || 'production');
        }
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    }
  }, []);

  // URL parameter handling
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agentId');
  const modelId = searchParams.get('modelId');
  const promptVersion = searchParams.get('promptVersion');
  const autoDeploy = searchParams.get('autoDeploy');
  const { data: agent, isLoading: isLoadingAgent } = useGetAgentByIdAutonomQuery(agentId, { skip: !agentId });
  const { data: agentCorrectEntries, isLoading: isLoadingCorrectEntries } = useGetAgentCorrectEntriesQuery(agentId, { skip: !agentId });
  const { data: modelOptStatus, isLoading: isLoadingModelOptStatus } = useGetModelOptimizationStatusQuery(agentId, { skip: !agentId });

  // Placeholder metrics for the top graphs
  const metrics = [
    { label: 'Accuracy', value: 0.92 },
    { label: 'Precision', value: 0.88 },
    { label: 'Recall', value: 0.85 },
  ];

  // Fetch prompt versions for the selected model
  const { data: promptVersions } = useGetPromptVersionsQuery(selectedModel?.modelId || selectedModel?.id, {
    skip: !selectedModel,
  });

  // Find currently deployed version
  const deployedVersion = React.useMemo(() => {
    if (!promptVersions) return null;
    return promptVersions.find((v) => v.activeVersion);
  }, [promptVersions]);

  // Helper for refetching prompt versions
  const { refetch: refetchPromptVersions } = useGetPromptVersionsQuery(selectedModel?.modelId || selectedModel?.id, {
    skip: !selectedModel,
  });

  /**
   * Handle model selection from the table
   * @param {Object} model - Selected model data
   */
  const handleModelSelect = (model) => {
    setSelectedModel(model);
    setDrawerOpen(true);
  };

  /**
   * Handle closing the side drawer
   * Resets selected model state
   */
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedModel(null);
  };

  /**
   * Format chip text for display
   * @param {string} text - Text to format
   * @returns {string} Formatted text
   */
  function formatChipText(text) {
    if (!text) return '';
    return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Capitalize each word in a string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  function capitalizeWords(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Handle new version creation submission
   * Creates a new prompt version and optionally deploys it
   */
  const handleNewVersionSubmit = async () => {
    setError('');
    try {
      const modelId = selectedModel?.modelId || selectedModel?.id;
      const result = await createPrompt({ modelId, prompt: newPromptText }).unwrap();

      if (selectedModel) {
        await refetchPromptVersions();
      }
      setIsNewVersionDialogOpen(false);
      setNewPromptText('');
      setCreateAndDeploy(false);
    } catch (err) {
      setError(err?.data?.message || 'Failed to create prompt version.');
    }
  };

  // Deployment state management
  const [deployDialogOpen, setDeployDialogOpen] = React.useState(false);
  const [deployTarget, setDeployTarget] = React.useState(null); // 'left' or 'right'
  const [deployError, setDeployError] = React.useState('');
  const [deploySuccess, setDeploySuccess] = React.useState(false);

  /**
   * Handle deployment confirmation
   * Deploys the selected prompt version
   */
  const handleDeployConfirm = async () => {
    setDeployError('');
    try {
      const isLeft = deployTarget === 'left';
      const versionObj = isLeft ? leftPromptVersion : rightPromptVersion;
      const modelId = versionObj?.modelId || selectedModel?.modelId || selectedModel?.id;
      const version = versionObj?.originalVersion;
      if (!modelId || !version) throw new Error('Missing model or version');
      await releasePrompt({ modelId, version, originalModelId: selectedModel.modelId }).unwrap();
      setDeployDialogOpen(false);
      setDeployTarget(null);
      setDeploySuccess(true);
      await refetchPromptVersions();
    } catch (err) {
      setDeployError(err?.data?.message || err?.message || 'Failed to deploy version.');
    }
  };

  // Transform API data for correct/incorrect chart
  const correctVsIncorrectData = React.useMemo(() => {
    if (!agentCorrectEntries) return [];
    const correct = agentCorrectEntries.correctEntriesByDay || {};
    const incorrect = agentCorrectEntries.incorrectEntriesByDay || {};
    const allDates = Array.from(new Set([...Object.keys(correct), ...Object.keys(incorrect)])).sort();
    // Only keep the last 15 days
    const last15Dates = allDates.slice(-15);
    return last15Dates.map(date => ({
      date: new Date(date),
      correct: correct[date] || 0,
      incorrect: incorrect[date] || 0,
    }));
  }, [agentCorrectEntries]);

  // --- Aggregated Metrics and Model Status ---
  const metricOptions = [
    { label: 'Accuracy', value: 'accuracy' },
    { label: 'Precision', value: 'precision' },
    { label: 'Recall', value: 'recall' },
  ];
  const [selectedMetric, setSelectedMetric] = React.useState('accuracy');

  // Compute aggregated metric value
  const currentMetrics = React.useMemo(() => {
    if (!agent?.data?.modelMetrics?.metricsByModel) return [];
    const metricsByModel = agent.data.modelMetrics.metricsByModel;
    let metricNames = ['accuracy', 'precision', 'recall'];
    if (!Object.values(metricsByModel).some(metrics => metrics.precision || metrics.recall)) {
      metricNames = metricNames.filter(name => name !== 'precision' && name !== 'recall');
      metricNames.push('average_coherence', 'average_relevance');
    }
    return metricNames.map(label => {
      let sum = 0, count = 0;
      Object.values(metricsByModel).forEach(metrics => {
        const metric = metrics[label];
        let value = null;
        if (metric && metric.daily) {
          const latestDate = Object.keys(metric.daily).sort().reverse().find(date => metric.daily[date].sum && metric.daily[date].count);
          if (latestDate) {
            const latest = metric.daily[latestDate];
            if (latest && latest.count) {
              value = latest.sum / latest.count;
            }
          }
        }
        if (value === null && metric && metric.sum && metric.count) {
          value = metric.sum / metric.count;
        }
        if (value !== null) {
          sum += value;
          count++;
        }
      });
      return { label, value: count > 0 ? sum / count : 0 };
    });
  }, [agent]);

  const selectedMetricObj = currentMetrics.find(m => m.label === selectedMetric);
  const pieValue = selectedMetricObj ? Math.round((selectedMetricObj.value || 0) * 100) : 0;
  const pieData = [
    { name: selectedMetric, value: pieValue, color: '#00f7aa' },
    { name: 'Other', value: 100 - pieValue, color: '#222' },
  ];

  // Model status counts
  const notOptimized = modelOptStatus?.notOptimized ?? 0;
  const optimizedGood = modelOptStatus?.optimizedGood ?? 0;
  const optimizedBad = modelOptStatus?.optimizedBad ?? 0;

  // Handle model selection from URL parameters
  const modelIdParam = searchParams.get('modelId');
  const autoOptimize = searchParams.get('autoOptimize');
  const modelLogId = searchParams.get('modelLogId');
  
  React.useEffect(() => {
    if (modelIdParam && agent?.data?.nodes) {
      const model = agent.data.nodes.find(n => n.modelId?.toString() === modelIdParam || n.id?.toString() === modelIdParam);
      if (model) {
        setSelectedModel(model);
        setDrawerOpen(true);
      }
    }
    // Only run when agent or modelIdParam changes
  }, [modelIdParam, agent]);

  // Handle auto-optimize chat opening
  React.useEffect(() => {

    const urlModelId = searchParams.get('modelId');
    if (autoOptimize === 'true' && urlModelId && modelLogId) {
      // Open the OnboardingChat with a pre-filled message
      const message = `I want to optimize the prompt of the model with id ${urlModelId}, based on the result of the entry with id ${modelLogId}`;
      
      // Dispatch event to open the chat (same pattern as main-nav.js)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openOnboardingChat', {
          detail: {
            mode: 'assistant',
            message: message
          }
        }));
      }, 1000);
    }
  }, [autoOptimize, searchParams, modelLogId]);

  // Handle agent selection when parameters arrive
  React.useEffect(() => {
    if (agentId && agent?.data?.nodes) {
      // Find the agent in the navigation and select it
      // This will be handled by the main-nav.js component
      window.dispatchEvent(new CustomEvent('selectAgent', {
        detail: { agentId: parseInt(agentId) }
      }));
    }
  }, [agentId, agent]);

  // Handle optimization completion and URL cleanup
  React.useEffect(() => {
    const handleOptimizationCompleted = (event) => {
      const { flags } = event.detail;
      if (flags?.optimization_completed) {
        // Add a small timeout before processing
        setTimeout(async () => {
          // Open the model modal for the specific model
          const urlModelId = searchParams.get('modelId');
          if (urlModelId) {
            const model = agent?.data?.AgentNodes?.find(n => 
              n.Model?.id?.toString() == urlModelId
            );
            if (model) {
              // Refetch prompt versions to get the latest optimized prompts
              try {
                await refetch(); // This will refetch the prompt versions
              } catch (error) {
                console.error('Error refetching prompt versions:', error);
              }
              
              setSelectedModel(model);
              setDrawerOpen(true);
            }
          }
          
          // Remove autoOptimize parameter from URL
          const url = new URL(window.location.href);
          url.searchParams.delete('autoOptimize');
          url.searchParams.delete('modelLogId');
          window.history.replaceState({}, '', url.toString());
        }, 1000); // 1 second timeout
      }
    };

    const handleChatClosed = () => {
      // Remove autoOptimize parameter from URL when chat is closed
      const url = new URL(window.location.href);
      url.searchParams.delete('autoOptimize');
      url.searchParams.delete('modelLogId');
      window.history.replaceState({}, '', url.toString());
    };

    window.addEventListener('optimizationCompleted', handleOptimizationCompleted);
    window.addEventListener('onboarding:chat-closed', handleChatClosed);

    return () => {
      window.removeEventListener('optimizationCompleted', handleOptimizationCompleted);
      window.removeEventListener('onboarding:chat-closed', handleChatClosed);
    };
  }, [searchParams, agent]);

  // Handle auto-deployment from email
  React.useEffect(() => {
    if (autoDeploy === 'true' && agentId && modelId && promptVersion) {
      // Find the model and open the drawer

      if (agent && agent.data.AgentNodes) {
        const targetModel = agent.data.AgentNodes.find(m => m.Model?.id.toString() == modelId);
        if (targetModel) {
          setSelectedModel(targetModel);
          setDrawerOpen(true);
          
          // Auto-deploy the specific version after a short delay
          setTimeout(() => {
            // Find the prompt version and deploy it
            console.log('promptVersions')
            console.log(promptVersions)
            if (promptVersions) {

              const versionToDeploy = promptVersions.find(v => v.originalVersion == promptVersion);
              console.log('versionToDeploy')
              console.log(versionToDeploy)
              if (versionToDeploy) {
                setDefaultRightVersion(versionToDeploy.id);
                setDeployTarget('right');
                setDeployDialogOpen(true);
              }
            }
            // Clean up URL parameters
            const url = new URL(window.location.href);
            url.searchParams.delete('autoDeploy');
            url.searchParams.delete('promptVersion');
            window.history.replaceState({}, '', url.toString());
          }, 1000);
        }
      }
      
      
    }
  }, [autoDeploy, agentId, modelId, promptVersion, agent, promptVersions]);

  return (
    <Box
      sx={{
        m: 'var(--Content-margin)',
        p: 'var(--Content-padding)',
        width: 'var(--Content-width)',
        py: 8,
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        pb: '0px !important',
      }}
    >
      {/* Top Section: Bar Chart | Pie Chart | Status Card */}
      <Grid container spacing={2} sx={{ px: 2, pt: 4, pb: 2, paddingRight: 0 }} style={{ height: '40vh' }}>
        {/* Left: Bar Chart */}
        <Grid item xs={12} md={6} lg={6}>
          <CorrectVsIncorrectComparison 
            data={correctVsIncorrectData}
            title="Automatic Evaluation: Correct vs Incorrect"
            isLoading={isLoadingAgent || isLoadingCorrectEntries}
            height="36vh"
            subtitle="Entries are classified by the automatic evaluator as correct or incorrect."
          />
        </Grid>
        {/* Center: Pie Chart with Selector */}
        <Grid item xs={12} md={3} lg={3}>
          <Card sx={{ height: '36vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#10181b', color: '#fff', p: 2 }}>
            <Box sx={{ width: '100%', mb: 2, display: 'flex', justifyContent: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={selectedMetric}
                  onChange={e => setSelectedMetric(e.target.value)}
                  sx={{
                    bgcolor: '#1e2a32',
                    color: '#fff',
                    borderRadius: 2,
                    fontFamily: "'Public Sans', sans-serif", // Match Models Performance title
                    fontSize: '1.25rem', // 20px, matches h6
                    letterSpacing: 0.5,
                    boxShadow: '0 2px 8px #0003',
                    border: '1.5px solid #222',
                    '.MuiSelect-icon': { color: '#00f7aa' },
                    '&:hover': { bgcolor: '#26323a' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#10181b',
                        color: '#fff',
                        borderRadius: 2,
                        boxShadow: '0 4px 16px #0006',
                        fontFamily: "'Public Sans', sans-serif",
                        fontSize: '1.25rem',
                      },
                    },
                  }}
                >
                  {metricOptions.map(opt => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                      sx={{
                        color: '#fff',
                        fontSize: 16,
                        '&.Mui-selected': { bgcolor: '#00f7aa', color: '#00282f' },
                        '&:hover': { bgcolor: '#00f7aa22' },
                      }}
                    >
                      {opt.label.charAt(0).toUpperCase() + opt.label.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Box sx={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PieChart width={140} height={140}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={58}
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={0}
                    animationDuration={300}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <Typography
                  variant="h3"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontWeight: 700,
                    color: '#00f7aa',
                    fontSize: 30,
                    textShadow: '0 2px 8px #000a',
                    pointerEvents: 'none',
                  }}
                >
                  {pieValue}%
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#abd4d7', fontWeight: 500, mt: 2 }}>{metricOptions.find(opt => opt.value === selectedMetric)?.label || ''} (Aggregated)</Typography>
            </Box>
          </Card>
        </Grid>
        {/* Right: Status Card */}
        <Grid item xs={12} md={3} lg={3} sx={{
          paddingRight: 0,
          marginRight: 0,
        }}>
          <Card
            sx={{
              height: '36vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              bgcolor: '#10181b',
              color: '#fff',
              paddingLeft: 3,
              paddingRight: 0,
              paddingTop: 3,
              paddingBottom: 3,
            }}
          >
            <Stack spacing={0} divider={<Divider sx={{ borderColor: '#23292f', my: 0.5 }} flexItem />}> 
              {/* Not Optimized */}
              <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
                <Box
                  sx={{
                    bgcolor: 'rgba(255,77,79,0.12)',
                    borderRadius: 2,
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Warning size={22} color="#ff4d4f" />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '1.05rem', color: '#fff', lineHeight: 1.1 }}>
                    {optimizedBad}Pending for Approval
                  </Typography>
                  <Typography sx={{ fontWeight: 400, fontSize: '0.93rem', color: '#bdbdbd', mt: 0.5 }}>
                    Action required
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
                <Box
                  sx={{
                    bgcolor: 'rgba(255,152,0,0.12)',
                    borderRadius: 2,
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RocketLaunch size={22} color="#ff9800" />
                </Box>
                <Box>
                  <Typography sx={{fontSize: '1.05rem', color: '#fff', lineHeight: 1.1 }}>
                    {notOptimized} Waiting for Optimization
                  </Typography>
                  <Typography sx={{ fontWeight: 400, fontSize: '0.93rem', color: '#bdbdbd', mt: 0.5 }}>
                    Action required
                  </Typography>
                </Box>
              </Stack>
              {/* Optimized & Good */}
              <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
                <Box
                  sx={{
                    bgcolor: 'rgba(0,247,170,0.10)',
                    borderRadius: 2,
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle size={22} color="#00f7aa" />
                </Box>
                <Box>
                  <Typography sx={{  fontSize: '1.05rem', color: '#fff', lineHeight: 1.1 }}>
                    {optimizedGood} Up to Date
                  </Typography>
                  <Typography sx={{ fontWeight: 400, fontSize: '0.93rem', color: '#bdbdbd', mt: 0.5 }}>
                    No action required
                  </Typography>
                </Box>
              </Stack>
              {/* Needs Optimization */}
              
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Models Table Section */}
      <Box sx={{ px: 2, pb: 4, pt: 4, paddingRight: 0 }} style={{ height: '50vh' }}>
        <ModelsTable onModelSelect={handleModelSelect} height="45vh" />
      </Box>

      {/* Version Comparison Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: '80vw', md: '80vw', lg: '80vw' },
            bgcolor: '#081b21',
            color: 'white',
            p: 0,
          },
        }}
      >
        {selectedModel && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Model Header Section */}
            <Box sx={{ p: 3, borderBottom: '1px solid #1a2a33', background: '#081b21' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5" fontWeight={600} sx={{ fontSize: '1.4rem', color: 'white' }}>
                  {capitalizeWords(selectedModel.name)}
                </Typography>
                <Stack direction="row" spacing={2}>
                  <FormControl size="medium" sx={{ minWidth: 160 }}>
                    <Select
                      id="deploy-select"
                      value={''}
                      displayEmpty
                      renderValue={(selected) => {
                        if (!selected) return 'Deploy';
                        if (selected === 'left') return `Deploy Version ${leftPromptVersion?.version}`;
                        if (selected === 'right') return `Deploy Version ${rightPromptVersion?.version}`;
                        return 'Deploy';
                      }}
                      onChange={(e) => {
                        setDeployTarget(e.target.value);
                        setDeployDialogOpen(true);
                      }}
                      disabled={!leftPromptVersion || !rightPromptVersion}
                      sx={{
                        minWidth: 160,
                        height: 44,
                        fontSize: 16,
                        color: '#fff',
                        '.MuiSelect-select': {
                          display: 'flex',
                          alignItems: 'center',
                          height: 30,
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          fontSize: 16,
                          color: '#fff',
                        },
                        '.MuiOutlinedInput-notchedOutline': {
                          borderColor: '#00f7aa',
                          borderWidth: 2,
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#00d492',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#00f7aa',
                        },
                      }}
                    >
                      <MenuItem
                        value={'left'}
                        disabled={!leftPromptVersion}
                        sx={{ fontSize: 16, color: '#fff', background: 'none' }}
                      >
                        Deploy Version {leftPromptVersion?.version}
                      </MenuItem>
                      <MenuItem
                        value={'right'}
                        disabled={!rightPromptVersion}
                        sx={{ fontSize: 16, color: '#fff', background: 'none' }}
                      >
                        Deploy Version {rightPromptVersion?.version}
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    color="secondary"
                    sx={{
                      background: 'transparent',
                      border: '1px solid',
                      borderColor: 'var(--mui-palette-OutlinedInput-border)',
                      color: '#94e4c7',
                      boxShadow: 'none',
                      fontWeight: 500,
                      fontSize: 16,
                      '&:hover': {
                        background: 'rgba(0,247,170,0.08)',
                        borderColor: '#00d492',
                        boxShadow: 'none',
                      },
                    }}
                    onClick={() => setIsNewVersionDialogOpen(true)}
                  >
                    New Version
                  </Button>
                </Stack>
              </Box>
              <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Deployed Version */}
                <Typography variant="body2" sx={{ color: '#abd4d7', fontWeight: 500 }}>
                  Deployed Version:
                </Typography>

                <Chip
                  label={deployedVersion ? `Version ${deployedVersion.version}` : '—'}
                  sx={{ bgcolor: '#00282f', color: '#abd4d7', fontWeight: 600 }}
                  icon={                <Image
                    src="/assets/lg.png"
                    alt="Handit Production Icon"
                    width={24}
                    height={24}
                    style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 6 }}
                  />}
                />
                {/* Details */}
                <Typography variant="body2" sx={{ color: '#abd4d7', fontWeight: 500, ml: 3 }}>
                  Details:
                </Typography>
                <Chip label={formatChipText(selectedModel.problemType)} sx={{ bgcolor: '#00282f', color: '#abd4d7', fontWeight: 600 }} />
                <Chip label={environment === 'staging' ? 'Staging' : 'Prod'} sx={{ bgcolor: '#00282f', color: '#abd4d7', fontWeight: 600 }} />
                <Chip label={formatChipText(selectedModel.provider)} sx={{ bgcolor: '#00282f', color: '#abd4d7', fontWeight: 600 }} />
              </Stack>
            </Box>
            <Divider sx={{ borderColor: '#1a2a33' }} />

            {/* Version Comparison and Insights Section */}
            <Box sx={{ flex: 1, p: 3, overflowY: 'auto', display: 'flex', gap: 3 }}>
              <Box sx={{ flex: 2, minWidth: 0 }}>
                <PromptVersionComparison
                  modelId={selectedModel.modelId || selectedModel.id}
                  bgColor="#081b21"
                  onLeftModelChange={setLeftPromptVersion}
                  onRightModelChange={setRightPromptVersion}
                  onLeftAccuracyChange={setLeftAccuracy}
                  onRightAccuracyChange={setRightAccuracy}
                  defaultRightVersion={defaultRightVersion}
                />
              </Box>
              <Box sx={{ flex: 0.8, minWidth: 0, pl: 2 }}>
                <AutomatedInsights
                  modelId={selectedModel.modelId || selectedModel.id}
                  bgColor="#081b21"
                  version={rightPromptVersion?.version}
                  leftVersionNumber={leftPromptVersion?.version}
                  rightVersionNumber={rightPromptVersion?.version}
                  leftAccuracy={leftAccuracy}
                  rightAccuracy={rightAccuracy}
                />
              </Box>
            </Box>

            {/* New Version Dialog */}
            <Dialog open={isNewVersionDialogOpen} onClose={() => setIsNewVersionDialogOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>Create New Version</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  multiline
                  rows={8}
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  placeholder="Enter your prompt text here..."
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 2 }}
                  disabled={isCreating || isReleasing}
                />

                {error && (
                  <Typography color="error" sx={{ mt: 2 }}>
                    {error}
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setIsNewVersionDialogOpen(false);
                    setNewPromptText('');
                    setCreateAndDeploy(false);
                    setError('');
                  }}
                  sx={{ color: 'text.secondary' }}
                  disabled={isCreating || isReleasing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleNewVersionSubmit}
                  variant="contained"
                  disabled={!newPromptText.trim() || isCreating || isReleasing}
                  sx={{
                    backgroundImage: 'none',
                    bgcolor: '#00f7aa',
                    color: '#00282f',
                    '&:hover': {
                      backgroundImage: 'none',
                      bgcolor: '#00d492',
                    },
                  }}
                >
                  {isCreating || isReleasing ? 'Saving...' : createAndDeploy ? 'Create and Deploy' : 'Create Version'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Deploy Confirmation Dialog */}
            <Dialog
              open={deployDialogOpen}
              onClose={() => {
                setDeployDialogOpen(false);
                setDeployTarget(null);
                setDeployError('');
              }}
              maxWidth="xs"
              fullWidth
            >
              <DialogTitle>Confirm Deployment</DialogTitle>
              <DialogContent>
                <Typography>
                  Are you sure you want to deploy Version{' '}
                  {deployTarget === 'left' ? leftPromptVersion?.version : rightPromptVersion?.version}?
                </Typography>
                {deployError && (
                  <Typography color="error" sx={{ mt: 2 }}>
                    {deployError}
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setDeployDialogOpen(false);
                    setDeployTarget(null);
                    setDeployError('');
                  }}
                  sx={{ color: 'text.secondary' }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeployConfirm}
                  variant="contained"
                  sx={{
                    bgcolor: '#00f7aa',
                    color: '#00282f',
                    '&:hover': { bgcolor: '#00d492' },
                    backgroundImage: 'none',
                  }}
                >
                  Deploy
                </Button>
              </DialogActions>
            </Dialog>

            {/* Deployment Success Notification */}
            <Snackbar
              open={deploySuccess}
              autoHideDuration={3000}
              onClose={() => setDeploySuccess(false)}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <Alert onClose={() => setDeploySuccess(false)} severity="success" sx={{ width: '100%' }}>
                Deployment successful!
              </Alert>
            </Snackbar>
          </Box>
        )}
      </Drawer>
    </Box>
  );
} 
