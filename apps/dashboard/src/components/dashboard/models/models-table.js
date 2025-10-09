/**
 * @fileoverview ModelsTable component for displaying and managing AI models
 * Provides a table interface for viewing, sorting, and managing model data
 */

'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  TablePagination,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Skeleton,
} from '@mui/material';
import { Eye, MagnifyingGlass, ArrowsLeftRight, DotsThree, Plus } from '@phosphor-icons/react/dist/ssr';
import { NodeFilterDialog } from '@/components/dashboard/agents/node-filter-dialog';
import { useGetPromptQuery, useGetAgentByIdAutonomQuery, useGetPromptVersionsQuery } from '@/services/promptService';

/**
 * ModelsTable component for displaying and managing AI models
 * @component
 * @param {Object} props - Component props
 * @param {Array<Object>} props.models - Array of model data objects
 * @returns {JSX.Element} Rendered models table component
 * 
 * @description
 * This component provides:
 * - Tabular display of model information
 * - Model status indicators
 * - Performance metrics display
 * - Integration with Scrollbar for overflow handling
 */
export function ModelsTable({ onModelSelect, height = '28vh' }) {
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agentId');

  const [openPromptDialog, setOpenPromptDialog] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProblemType, setSelectedProblemType] = React.useState('all');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(3);
  const [visibleCount, setVisibleCount] = React.useState(6); // Start with 6 models
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const [activeModel, setActiveModel] = React.useState(null);
  const [isCreatePromptModalOpen, setIsCreatePromptModalOpen] = React.useState(false);
  const [newPromptText, setNewPromptText] = React.useState('');
  const [createAndDeploy, setCreateAndDeploy] = React.useState(false);

  // Fetch specific agent data
  const { data: agent, isLoading: isLoadingAgent } = useGetAgentByIdAutonomQuery(agentId, {
    skip: !agentId,
  });

  // Fetch prompt data for selected model
  const { data: promptData } = useGetPromptQuery(selectedModel?.id, {
    skip: !selectedModel,
  });

  // Fetch prompt versions to get the active prompt
  const { data: promptVersions } = useGetPromptVersionsQuery(selectedModel?.id, {
    skip: !selectedModel,
  });

  // Get the active prompt from versions
  const activePrompt = React.useMemo(() => {
    if (!promptVersions) return null;
    const activeVersion = promptVersions.find(v => v.activeVersion);
    return activeVersion?.parameters?.prompt || '';
  }, [promptVersions]);

  const handleMenuOpen = (event, model) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setActiveModel(model);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActiveModel(null);
  };

  const handleCreatePrompt = (e) => {
    e.stopPropagation();
    setIsCreatePromptModalOpen(true);
    handleMenuClose();
  };

  const handleCreatePromptSubmit = () => {
    // TODO: Implement API call to create new prompt version

    setNewPromptText('');
    setIsCreatePromptModalOpen(false);
    setCreateAndDeploy(false);
  };

  const handleViewPrompt = (e, model) => {
    e.stopPropagation();
    if (!model || !agent?.data?.prompts) {
      handleMenuClose();
      return;
    }
    const prompt = agent.data.prompts.find(p => p && p.modelId === model.modelId);
    setSelectedModel({
      ...model,
      prompt: prompt?.prompt
    });
    setOpenPromptDialog(true);
    handleMenuClose();
  };

  const handleComparePrompts = (model) => {
    onModelSelect(model);
    handleMenuClose();
  };

  // Helper function to format snake case to regular text
  const formatProblemType = (type) => {
    if (!type) return 'Unknown';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper to capitalize each word in a string
  const capitalizeWords = (str) => {
    if (!str) return '';
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Helper function to calculate accuracy from metrics
  const calculateAccuracy = (modelId, metricsByModel) => {
    if (!metricsByModel || !metricsByModel[modelId] || !metricsByModel[modelId].accuracy) {
      return 0;
    }

    const accuracyData = metricsByModel[modelId].accuracy;
    const dailyData = accuracyData.daily || {};

    // Get the latest date's data
    const latestDate = Object.keys(dailyData).sort().pop();
    if (!latestDate) return 0;

    const latestMetrics = dailyData[latestDate];
    if (!latestMetrics || !latestMetrics.sum || !latestMetrics.count) return 0;

    return (latestMetrics.sum / latestMetrics.count) * 100;
  };

  // Helper function to get the latest value for a metric (sum/count for the latest day, matches CurrentMetricsChart logic)
  const getLatestMetricValue = (metricObj) => {
    if (!metricObj || !metricObj.daily) return null;
    const dailyData = metricObj.daily;
    const latestDate = Object.keys(dailyData).sort().reverse().find(date => dailyData[date].sum && dailyData[date].count);
    if (latestDate) {
      const latest = dailyData[latestDate];
      if (latest && latest.count) {
        return latest.sum / latest.count;
      }
    }
    // Fallback to sum/count if no daily data
    if (metricObj.sum && metricObj.count) {
      return metricObj.sum / metricObj.count;
    }
    return null;
  };

  // Helper to format metric names
  const formatMetricName = (name) => {
    let formatted = name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    if (formatted.startsWith('Average ')) {
      formatted = formatted.replace(/^Average /, '');
    }
    return formatted;
  };

  // Extract models from agent data
  const models = React.useMemo(() => {
    if (!agent) return [];

    // Return only the model nodes from the agent
    return agent.data.AgentNodes
      ?.filter(node => node.type === 'model' && node.Model) // Only include nodes of type 'model' that have a Model
      .map(node => ({
        id: node.id,
        name: node.name,
        problemType: node.Model?.problemType || 'Unknown',
        provider: node.Model?.provider || 'Unknown',
        accuracy: calculateAccuracy(node.modelId, agent.data.modelMetrics?.metricsByModel),
        prompt: node.config?.description || '',
        agentId: agent.id,
        modelId: node.modelId,
        modelName: node.Model?.name,
      })).reverse() || [];
  }, [agent]);

  const problemTypes = React.useMemo(() =>
    [...new Set(models.map(model => model.problemType))],
    [models]
  );

  const filteredModels = models.filter(model => {
    const query = searchQuery.toLowerCase();
    return (
      model.name.toLowerCase().includes(query) ||
      model.problemType.toLowerCase().includes(query)
    );
  });

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Get current page items
  const paginatedModels = filteredModels.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Reset page when filters change
  React.useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedProblemType]);

  // Infinite scroll handler
  const tableContainerRef = React.useRef();
  React.useEffect(() => {
    const handleScroll = () => {
      const el = tableContainerRef.current;
      if (!el) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        // Near bottom, load more
        setVisibleCount((prev) => Math.min(prev + 6, filteredModels.length));
      }
    };
    const el = tableContainerRef.current;
    if (el) el.addEventListener('scroll', handleScroll);
    return () => { if (el) el.removeEventListener('scroll', handleScroll); };
  }, [filteredModels.length]);

  // Reset visibleCount when filters change
  React.useEffect(() => { setVisibleCount(6); }, [searchQuery, selectedProblemType]);

  // Helper function to get current version for a model
  const getCurrentVersion = React.useCallback((modelId) => {
    if (!agent?.data?.allVersionsPerModel?.[modelId]) return 'v1';

    const modelPrompts = agent.data.allVersionsPerModel[modelId]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const activePromptIndex = modelPrompts.findIndex(p => p.activeVersion);
    return `v${activePromptIndex + 1}`;
  }, [agent?.data?.allVersionsPerModel]);

  function ModelVersionCell({ modelId }) {
    const { data: promptVersions } = useGetPromptVersionsQuery(modelId, { skip: !modelId });
    const deployedVersion = React.useMemo(() => {
      if (!promptVersions) return null;
      return promptVersions.find((v) => v.activeVersion);
    }, [promptVersions]);
    return (
      <Typography variant="body2" color="text.secondary">
        {deployedVersion ? `Version ${deployedVersion.version}` : '—'}
      </Typography>
    );
  }

  if (isLoadingAgent) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" width="100%" height={40} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={40} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={40} sx={{ mb: 2, borderRadius: 1 }} />
      </Box>
    );
  }

  if (!agentId) {
    return (
      <Card>
        <CardHeader
          title={
            <Typography variant="h6" color="error">
              No Agent Selected
            </Typography>
          }
        />
        <Box sx={{ p: 2 }}>
          <Typography>
            Please select an agent to view its models.
          </Typography>
        </Box>
      </Card>
    );
  }

  if (!agent) {
    return (
      <Card>
        <CardHeader
          title={
            <Typography variant="h6" color="error">
              Agent Not Found
            </Typography>
          }
        />
        <Box sx={{ p: 2 }}>
          <Typography>
            The selected agent could not be found.
          </Typography>
        </Box>
      </Card>
    );
  }

  if (models.length === 0) {
    return (
      <Card>
        <CardHeader
          title={
            <Typography variant="h6">
              Models
              <Typography component="span" variant="subtitle2" sx={{ ml: 1, color: 'text.secondary' }}>
                (0)
              </Typography>
            </Typography>
          }
        />
        <Box sx={{ p: 2 }}>
          <Typography>
            No models found for this agent.
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ height, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, pb: 0 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            sx={{ width: '100%' }}
          >
            <TextField
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find LLM Node..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlass />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Box>

        <Box sx={{
          p: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <Box sx={{ overflow: 'auto', flex: 1 }} ref={tableContainerRef}>
            <Table sx={{ minWidth: 100 }}>
              <TableHead>
                <TableRow>
                  <TableCell>LLM Node & Task</TableCell>
                  <TableCell>Traces Logged</TableCell>
                  <TableCell>Current Version</TableCell>
                  <TableCell>Last Deployment Date</TableCell>
                  <TableCell>Performance</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredModels.slice(0, visibleCount).map((model, index) => {
                  // Get all metrics for this model
                  const metricsByModel = agent?.data?.modelMetrics?.metricsByModel || {};
                  const modelMetrics = metricsByModel[model.modelId] || {};
                  // Always include accuracy, then up to two more metrics (never healthcheck), sorted by name

                  const metricNames = Object.keys(modelMetrics)
                    .filter(m => m !== 'accuracy' && m.toLowerCase() !== 'healtcheck' && m.toLowerCase() !== 'healthcheck')
                    .sort((a, b) => formatMetricName(a).localeCompare(formatMetricName(b)));

                  const shownMetrics = ['accuracy', ...metricNames].slice(0, 3);
                  // Prepare metric values for columns
                  const accuracyValue = getLatestMetricValue(modelMetrics['accuracy']);
                  const accuracyDisplay = accuracyValue !== null && accuracyValue !== undefined ? `${(accuracyValue * 100).toFixed(2)}%` : '';
                  // Pad to 3 columns
                  while (shownMetrics.length < 3) shownMetrics.push('');

                  // Get deployed version and date
                  const lastDeployAt = agent?.data?.extraData?.[model.modelId]?.lastDeployAt || null;
                  const deployedVersionDate = lastDeployAt ? new Date(lastDeployAt) : null;
                  // Get entries traced and evaluated entries (mocked or from model if available)
                  const entriesTraced = agent?.data?.extraData?.[model.modelId]?.modelLogCount || '-';

                  return (
                    <TableRow
                      key={model.id}
                      hover
                      onClick={() => handleComparePrompts(model)}
                      sx={{
                        cursor: 'pointer',
                        '& td': { py: 1 }
                      }}
                      data-testid={index === 0 ? 'improvement-row-first' : 'llm-node-not-first'}
                    >
                      {/* Name & Description */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {/* Colored bar based on accuracy */}
                          <Box
                            sx={{
                              width: 6,
                              height: 40,
                              borderRadius: 2,
                              mr: 1.5,
                              backgroundColor:
                                model.accuracy >= 80
                                  ? '#00f7aa'
                                  : model.accuracy >= 70
                                  ? '#ff9800'
                                  : '#ff4d4f',
                            }}
                          />
                          <Box>
                            <Typography variant="subtitle2">{capitalizeWords(model.name)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatProblemType(model.problemType)}
                            </Typography>
                            {model.prompt && (
                              <Typography variant="caption" color="text.secondary">
                                {model.prompt}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      {/* Entries Traced */}
                      <TableCell>{entriesTraced}</TableCell>
                      {/* Deployed Version */}
                      <TableCell>
                        <ModelVersionCell modelId={model.modelId} />
                      </TableCell>
                      {/* Date of Deployed Version */}
                      <TableCell>
                        {deployedVersionDate ? deployedVersionDate.toISOString().slice(0, 10) : '-'}
                      </TableCell>
                      {/* Accuracy */}
                      <TableCell>
                        <Tooltip title={`Accuracy: ${accuracyDisplay}`} arrow placement="top" style={{ fontSize: 16 }}>
                          <Box sx={{ width: 140, height: 10, background: '#222', borderRadius: 5, overflow: 'hidden', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <Box
                              sx={{
                                height: '100%',
                                width: `${Math.max(0, Math.min(100, model.accuracy))}%`,
                                backgroundColor:
                                  model.accuracy >= 80
                                    ? '#00f7aa'
                                    : model.accuracy >= 70
                                    ? '#ff9800'
                                    : '#ff4d4f',
                                transition: 'width 0.3s',
                              }}
                            />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      {/* Actions */}
                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, model)}
                          size="small"
                          sx={{
                            color: 'text.secondary',
                            '&:hover': {
                              color: 'primary.main',
                            },
                          }}
                        >
                          <DotsThree weight="bold" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Card>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleCreatePrompt}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Plus size={20} />
            <Typography>Create Prompt</Typography>
          </Stack>
        </MenuItem>
        <MenuItem onClick={(e) => handleViewPrompt(e, activeModel)}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Eye size={20} />
            <Typography>View Prompt</Typography>
          </Stack>
        </MenuItem>
        <MenuItem onClick={() => handleComparePrompts(activeModel)}>
          <Stack direction="row" spacing={1} alignItems="center">
            <ArrowsLeftRight size={20} />
            <Typography>Compare Prompts</Typography>
          </Stack>
        </MenuItem>
      </Menu>

      <NodeFilterDialog
        open={openPromptDialog}
        onClose={() => setOpenPromptDialog(false)}
        title={`${selectedModel?.name || ''} Prompt`}
        content={selectedModel?.prompt || ''}
      />

      {/* New Create Prompt Modal */}
      <Dialog
        open={isCreatePromptModalOpen}
        onClose={() => setIsCreatePromptModalOpen(false)}
        maxWidth="md"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Create New Prompt</DialogTitle>
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
          />

        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsCreatePromptModalOpen(false);
              setNewPromptText('');
              setCreateAndDeploy(false);
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreatePromptSubmit}
            variant="contained"
            disabled={!newPromptText.trim()}
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
            {createAndDeploy ? 'Create and Deploy' : 'Create Prompt'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
