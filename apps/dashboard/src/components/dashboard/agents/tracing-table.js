/**
 * Tracing Table Component
 * 
 * A comprehensive table component that displays and manages agent execution entries.
 * Features include:
 * - Paginated table of execution entries
 * - Status filtering and sorting
 * - Date filtering
 * - Node-specific filtering
 * - Search functionality
 * - Detailed entry viewing through modal
 * - Loading states and error handling
 */

'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  agentsApi,
  useGetAgentEntriesQuery,
  useGetAgentEntryDetailQuery,
  useGetEntryFlowQuery,
} from '@/services/agentsService';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Select,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Cube, MagnifyingGlass, Wrench } from '@phosphor-icons/react';
import { format } from 'date-fns';
import _ from 'lodash';
import { useDispatch } from 'react-redux';

import { parseInputContent } from '@/lib/parsers';
import { FilterButton, FilterButtonDialog, FilterPopover, useFilterContext } from '@/components/core/filter-button';
import { Option } from '@/components/core/option';
import { useUser } from '@/hooks/use-user';

import { TracingModal } from './tracing-modal';

/**
 * DateFilterPopover Component
 * 
 * A popover component for filtering entries by date using a date picker.
 * 
 * @returns {JSX.Element} The date filter popover component
 */
function DateFilterPopover() {
  const { anchorEl, onApply, onClose, open, value: initialValue } = useFilterContext();
  const [value, setValue] = React.useState(initialValue);

  return (
    <FilterPopover anchorEl={anchorEl} onClose={onClose} open={open} title="Filter by Date">
      <Stack spacing={2}>
        <DatePicker
          value={value}
          onChange={(newValue) => {
            setValue(newValue);
          }}
          slotProps={{
            textField: {
              fullWidth: true,
            },
          }}
        />
        <Button
          onClick={() => {
            onApply(value);
          }}
          variant="contained"
        >
          Apply
        </Button>
      </Stack>
    </FilterPopover>
  );
}

/**
 * NodeFilterDialog Component
 * 
 * A dialog component for filtering entries by specific nodes (models or tools).
 * Provides search functionality and separate lists for models and tools.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.agentDetails - Details of the agent including nodes and connections
 * @returns {JSX.Element} The node filter dialog component
 */
function NodeFilterDialog({ agentDetails }) {
  const { anchorEl, onApply, onClose, open, value: initialValue } = useFilterContext();
  const [selectedNode, setSelectedNode] = React.useState(initialValue);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { user } = useUser();

  const { modelNodes, toolNodes } = React.useMemo(() => {
    let availableNodes = agentDetails?.AgentNodes || [];
    
    // Check if company has showTrackedNodesOnly enabled
    const showTrackedNodesOnly = user?.company?.showTrackedNodesOnly || false;
    
    if (showTrackedNodesOnly) {
      // Only show nodes that have execution steps - we need to get this from the current entry flow
      // For now, we'll show all nodes in the filter dialog, but the actual filtering happens in the main component
      // This could be enhanced to also filter in the dialog if we pass entryFlow data here
    }
    
    const filtered = availableNodes.filter((node) => 
      node.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      modelNodes: filtered.filter((node) => node.type === 'model'),
      toolNodes: filtered.filter((node) => node.type === 'tool'),
    };
  }, [agentDetails?.AgentNodes, searchQuery, user?.company?.showTrackedNodesOnly]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Filter by node</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            fullWidth
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MagnifyingGlass size={20} />
                </InputAdornment>
              ),
            }}
            size="small"
          />

          <Stack direction="row" spacing={2}>
            {/* Models Column */}
            <Box sx={{ width: '50%' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, px: 2 }}>
                LLM Models
              </Typography>
              <List sx={{ width: '100%', maxHeight: 300, overflow: 'auto' }}>

                {modelNodes.map((node) => (
                  <ListItemButton
                    key={node.id}
                    selected={selectedNode?.id === node.id}
                    onClick={() => setSelectedNode(node)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  >

                    <ListItemText
                      style={{
                        height: '50px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                      primary={node.name}
                      secondary={node.Model?.description}
                    />
                  </ListItemButton>
                ))}
                {modelNodes.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No models found
                  </Typography>
                )}
              </List>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Tools Column */}
            <Box sx={{ width: '50%' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, px: 2 }}>
                Tools
              </Typography>
              <List sx={{ width: '100%', maxHeight: 300, overflow: 'auto' }}>
                {toolNodes.map((node) => (
                  <ListItemButton
                    key={node.id}
                    selected={selectedNode?.id === node.id}
                    onClick={() => setSelectedNode(node)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  >

                    <ListItemText
                      primary={node.name}
                      secondary={node.config?.description}
                      style={{
                        height: '50px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    />
                  </ListItemButton>
                ))}
                {toolNodes.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No tools found
                  </Typography>
                )}
              </List>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setSelectedNode(null);
            onApply(null);
            onClose();
          }}
          variant="outlined"
        >
          Clear
        </Button>
        <Button
          onClick={() => {
            onApply(selectedNode);
            onClose();
          }}
          variant="contained"
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * TracingTable Component
 * 
 * The main component that displays a table of agent execution entries with filtering,
 * sorting, and detailed view capabilities. Integrates with the TracingModal for
 * detailed entry inspection.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isLoading - Whether the initial data is loading
 * @param {string} props.agentId - The ID of the agent
 * @param {Object} props.agentDetails - Details of the agent including nodes and connections
 * @returns {JSX.Element} The tracing table component
 */
export function TracingTable({ isLoading, agentId, agentDetails }) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(7);
  const [selectedEntry, setSelectedEntry] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState(null);
  const [sortDir, setSortDir] = React.useState('desc');
  const [searchInput, setSearchInput] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const router = useRouter();
  const params = useSearchParams();
  const entryLog = params.get('entryLog');
  const dispatch = useDispatch();
  const [filteredNode, setFilteredNode] = React.useState(null);
  const { user } = useUser();
  // Read nodeId and nodeType from URL
  const nodeId = params.get('nodeId');
  const nodeType = params.get('nodeType');

  const {
    data: paginatedData,
    isLoading: isLoadingEntries,
    isFetching,
  } = useGetAgentEntriesQuery({
    agentId,
    page: page + 1,
    limit: rowsPerPage,
    status: statusFilter,
    query: searchQuery,
    date: selectedDate,
    filteredNode: filteredNode?.id,
    filteredNodeType: filteredNode?.type,
  });

  // Extract entries and pagination data
  const paginatedEntries = paginatedData?.entries || [];
  const pagination = paginatedData?.pagination || {
    total: 0,
    page: 1,
    limit: rowsPerPage,
    totalFailedEntries: 0,
    totalEvaluated: 0,
    totalFailedModelEntries: 0,
    successEntries: 0,
  };

  const { data: entryFlow1, isLoading: isEntryFlowLoading } = useGetEntryFlowQuery(
    { entryId: selectedEntry?.id, agentId, mockFail: selectedEntry?.status === 'failed' },
    { skip: !selectedEntry }
  );

  const [entryFlow, setEntryFlow] = React.useState(entryFlow1);

  // Add the new query hook
  const { data: singleEntryData, isLoading: isLoadingSingleEntry, refetch: refetchSingleEntry } = useGetAgentEntryDetailQuery(
    { agentId, entryId: entryLog },
    { skip: !entryLog || !agentId }
  );

  React.useEffect(() => {
    if (entryLog && agentId) {
      console.log('refetching single entry');
      console.log(entryLog);
      console.log(agentId);
      refetchSingleEntry();
    }
  }, [entryLog, agentId]);

  React.useEffect(() => {
    setEntryFlow(entryFlow1);
  }, [entryFlow1]);

  const { nodes, edges } = React.useMemo(() => {
    if (!agentDetails || !entryFlow) {
      return { nodes: [], edges: [] };
    }

    // Check if company has showTrackedNodesOnly enabled
    const showTrackedNodesOnly = user?.company?.showTrackedNodesOnly || false;

    // Filter nodes based on company setting
    const availableNodes = showTrackedNodesOnly 
      ? agentDetails.AgentNodes.filter((node) => {
          // Only show nodes that have execution steps in the current entry flow
          return entryFlow?.steps?.some((step) => 
            (step.mappingnodeid ? step.mappingnodeid : step.nodeId) === node.id
          );
        })
      : agentDetails.AgentNodes;

    const nodes = availableNodes.map((node) => {
      const steps = entryFlow?.steps?.filter((s) => (s.mappingnodeid ? s.mappingnodeid : s.nodeId) === node.id);
      const sequence = [];

      // First pass: collect all sequences across all nodes
      const allSequences = new Set();
      agentDetails.AgentNodes.forEach((n) => {
        entryFlow?.steps?.forEach((step, index) => {
          if ((step.mappingnodeid ? step.mappingnodeid : step.nodeId) === n.id) {
            allSequences.add(index + 1);
          }
        });
      });

      // Convert to array and sort
      const sortedSequences = Array.from(allSequences).sort((a, b) => a - b);

      // Create mapping for renumbering
      const sequenceMap = new Map();
      sortedSequences.forEach((oldNum, index) => {
        sequenceMap.set(oldNum, index + 1);
      });


      // Now map this node's sequence numbers using the mapping
      entryFlow?.steps?.forEach((step, index) => {
        if ((step.mappingnodeid ? step.mappingnodeid : step.nodeId) === node.id) {
          const oldNum = index + 1;
          const newNum = sequenceMap.get(oldNum);
          sequence.push(newNum);
        }
      });

      const incomingConnections = agentDetails.AgentConnections.filter((conn) => conn.to_node_id === node.id);
      const outgoingConnections = agentDetails.AgentConnections.filter((conn) => conn.from_node_id === node.id);

      const uniqueInputs = [...new Set(incomingConnections.map((conn) => conn.inputName))];
      const uniqueOutputs = [...new Set(outgoingConnections.map((conn) => conn.outputName))];
      // Create unique inputs based on connections
      const inputs =
        uniqueInputs.length > 0
          ? uniqueInputs.map((conn) => ({
            id: conn || 'input',
            label: conn || 'Input',
          }))
          : [{ id: 'input', label: 'Input' }];

      // Create unique outputs based on connections
      const outputs =
        uniqueOutputs.length > 0
          ? uniqueOutputs.map((conn) => ({
            id: conn || 'output',
            label: conn || 'Output',
          }))
          : [{ id: 'output', label: 'Output' }];
      return {
        id: node.id.toString(),
        type: 'custom',
        position: node.config.position,
        data: {
          ...node,
          id: node.id,
          label: node.type === 'model' ? node.Model?.name : node.name,
          type: node.type,
          model: node.config.model,
          Model: node.Model,
          modelId: node.model_id,
          description: node.config?.description,
          toolType: node.config?.toolType,
          inputs,
          outputs,
          sequence,
          context: node?.context,
          status: steps[steps.length - 1]?.status,
          steps, // Pass the step data for details
        },
      };
    });

    const edges = agentDetails.AgentConnections.map((conn) => ({
      id: conn.id.toString(),
      source: conn.from_node_id.toString(),
      target: conn.to_node_id.toString(),
      sourceHandle: conn.outputName || 'output',
      targetHandle: conn.inputName || 'input',
    }));

    return { nodes, edges     };
  }, [agentDetails, entryFlow, user?.company?.showTrackedNodesOnly]);

  const tabs = [
    {
      label: 'All',
      value: '',
      count: pagination.total,
      tooltip: "Shows all entries, regardless of status."
    },
    {
      label: 'No Issues',
      value: 'success',
      count: filteredNode ? pagination.total - pagination.totalFailedEntries - pagination.totalFailedModelEntries : pagination.successEntries,
      tooltip: (
        filteredNode?.type === 'model' ? "Entries that haven't been evaluated yet or that passed without errors. (Includes unreviewed entries that did not throw any errors.)" : "Entries that passed without errors."
      ),
    },
    ...(filteredNode?.type === 'model' ? [{
      label: 'Evaluated: Success',
      value: 'evaluation_success',
      count: pagination.totalEvaluated > 0 ? pagination.totalEvaluated - pagination.totalFailedModelEntries : 0,
      tooltip: "Entries that were automatically evaluated and passed successfully."
    }] : []),
    ...(filteredNode?.type === 'model' || !filteredNode ? [{
      label: 'Evaluated: Error',
      value: 'failed_model',
      count: pagination.totalFailedModelEntries,
      tooltip: "Entries that were automatically evaluated and failed (incorrect output)."
    }] : []),
    {
      label: 'System Failure',
      value: 'failed',
      count: pagination.totalFailedEntries,
      tooltip: "Entries that encountered a technical or runtime error (e.g., a 500 error or crash)."
    },
  ];

  // Filter entries based on status and date
  const filteredEntries = React.useMemo(() => {
    let filtered = paginatedEntries.filter((entry) => {


      return true;
    });

    // Sort entries
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [paginatedEntries, statusFilter, selectedDate, sortDir]);

  // Update handlers to work with server pagination
  const handlePageChange = (_, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    router.push(`/ag-tracing?agentId=${agentId}`);
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    // remove entryLog from url
  };

  const handleStatusChange = (_, value) => {
    router.push(`/ag-tracing?agentId=${agentId}`);
    setStatusFilter(value);
    setPage(0);
    // remove entryLog from url
  };

  const handleSortChange = (event) => {
    router.push(`/ag-tracing?agentId=${agentId}`);

    setSortDir(event.target.value);
    setPage(0);
    // remove entryLog from url
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  // Reset entryFlow when changing selected entry
  const handleEntrySelect = (entry) => {
    if (entry?.id !== selectedEntry?.id) {
      setSelectedEntry(null); // Reset first to trigger loading state
      setTimeout(() => setSelectedEntry(entry), 0); // Set new entry in next tick
      router.push(`/ag-tracing?agentId=${agentId}&entryLog=${entry.id}`);
    }
  };

  React.useEffect(() => {
    if (entryLog && filteredEntries.length > 0) {
      const entry = filteredEntries.find((entry) => entry.id == entryLog);
      if (entry) {
        setSelectedEntry(entry);
      }
    }
  }, [entryLog, filteredEntries]);

  React.useEffect(() => {
    console.log('singleEntryData', singleEntryData);
    console.log('singleEntryData.entries[0].id', singleEntryData?.entries?.[0]?.id);
    console.log('entryLog', entryLog);
    // If not and we have the single entry data, use that
    if (singleEntryData && singleEntryData.entries.length > 0 && singleEntryData.entries[0].id == entryLog) {
      console.log('setting selected entry');
      setSelectedEntry(singleEntryData.entries[0]);
    }
  }, [singleEntryData, entryLog]);

  // Helper function to calculate duration from steps
  const calculateDuration = (entry) => {
    if (!entry) return 0;
    // If there are steps, calculate from timestamps
    if (entry.steps?.length > 0) {
      const firstStep = entry.steps[0];
      const lastStep = entry.steps[entry.steps.length - 1];

      if (firstStep.createdAt && lastStep.createdAt) {
        const start = new Date(firstStep.createdAt).getTime();
        const end = new Date(lastStep.createdAt).getTime();
        return (end - start) / 1000; // Convert to seconds
      }
    }

    // Fallback to entry duration
    return (entry.duration || 0) / 1000;
  };

  // Modify status display
  const getDisplayStatus = (status) => {
    if (status === 'failed_model') {
      return 'failed';
    }

    return status;
  };

  const handleNodeUpdate = (updatedNode) => {
    // Update entryFlow steps with the new evaluation data
    if (entryFlow?.steps) {
      const updatedSteps = entryFlow.steps.map((step) => {
        if ((step.mappingnodeid ? step.mappingnodeid : step.nodeId) == updatedNode.id) {
          return {
            ...step,
            actual: updatedNode.data.step.actual,
          };
        }
        return step;
      });

      setEntryFlow({
        ...entryFlow,
        steps: updatedSteps,
      });
    }
  };

  // Update search handler to use button click
  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(0); // Reset to first page when searching
  };

  // Handle Enter key press
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClose = () => {
    setSelectedEntry(null);
    router.push(`/ag-tracing?agentId=${agentId}`);
    // Invalidate only the specific entry detail
    if (selectedEntry?.id) {
      dispatch(agentsApi.util.invalidateTags([{ type: 'entries', id: `${agentId}-${selectedEntry.id}-detail` }]));
    }
  };

  // On initial load, if nodeId and nodeType are present, set the filter
  React.useEffect(() => {
    if (nodeId && nodeType && agentDetails?.AgentNodes) {
      const node = agentDetails.AgentNodes.find(n => n.id.toString() == nodeId);
      if (node) {
        setFilteredNode(node);
      }
    }
    // Only run on mount or when agentDetails changes
  }, [nodeId, nodeType, agentDetails]);

  if (isLoading || isLoadingEntries) {
    return (
      <Card>
        <Box sx={{ px: 3 }}>
          <Stack direction="row" spacing={2}>
            <Skeleton variant="rectangular" width={200} height={56} />
            <Skeleton variant="rectangular" width={200} height={56} />
            <Skeleton variant="rectangular" width={200} height={56} />
          </Stack>
        </Box>
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {['Input', 'Duration', 'Created At', 'Status'].map((header) => (
                  <TableCell key={header}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[1, 2, 3].map((row) => (
                <TableRow key={row}>
                  {[1, 2, 3, 4].map((cell) => (
                    <TableCell key={cell}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    );
  }

  const config = {
    success: {
      color: '#45A495',
      backgroundColor: 'transparent',
    },
    failed: {
      color: '#D32F2F',
      backgroundColor: 'transparent',
    },
    failed_model: {
      color: '#D32F2F',
      backgroundColor: 'transparent',
    },
    processing: {
      color: '#FFA726',
      backgroundColor: 'transparent',
    },
    pending: {
      color: '#FFA726',
      backgroundColor: 'transparent',
    },
  };

  return (
    <>
      <Card>
        <Stack spacing={0}>
          <Tabs
            onChange={handleStatusChange}
            sx={{
              px: 3,
              '& .MuiTab-root': {
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main',
                  backgroundColor: 'action.selected',
                  borderRadius: 1,
                },
              },
            }}
            value={statusFilter}
            variant="scrollable"
          >
            {tabs.map((tab) => (
              <Tooltip
                key={tab.value}
                title={tab.tooltip}
                placement="top"
                arrow
              >
                <Tab
                  icon={<Chip
                    label={tab.count}
                    size="small"
                    variant="soft"
                    sx={{
                      backgroundColor: theme => tab.value === statusFilter
                        ? 'primary.main'
                        : 'action.selected',
                      color: theme => tab.value === statusFilter
                        ? 'primary.contrastText'
                        : 'text.secondary',
                    }}
                  />}
                  iconPosition="end"
                  label={tab.label}
                  sx={{
                    minHeight: 'auto',
                    '&.Mui-selected': {
                      fontWeight: 'medium',
                    },
                  }}
                  value={tab.value}
                />
              </Tooltip>
            ))}
          </Tabs>
          <Divider />
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              px: 3,
              py: 2,
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              sx={{
                alignItems: 'center',
                flex: '1 1 auto',
                flexWrap: 'wrap',
              }}
            >
              <FilterButtonDialog
                displayValue={filteredNode?.name}
                label="Filter by node"
                onFilterApply={(value) => {
                  setFilteredNode(value);
                  setPage(0);
                  if (value) {
                    router.push(`/ag-tracing?agentId=${agentId}&nodeId=${value.id}&nodeType=${value.type}`);
                  } else {
                    router.push(`/ag-tracing?agentId=${agentId}`);
                  }
                }}
                onFilterDelete={() => {
                  setFilteredNode(null);
                  setPage(0);
                }}
                dialog={<NodeFilterDialog agentDetails={agentDetails} />}
                value={filteredNode}
                startIcon={filteredNode?.type === 'model' ? <Cube size={20} /> : <Wrench size={20} />}
              />
              <FilterButton
                displayValue={selectedDate ? formatDisplayDate(selectedDate) : undefined}
                label="Entry Date"
                onFilterApply={(value) => {
                  setSelectedDate(value);
                  setPage(0);
                }}
                onFilterDelete={() => {
                  setSelectedDate(null);
                  setPage(0);
                }}
                popover={<DateFilterPopover />}
                value={selectedDate}
              />
              <TextField
                fullWidth
                placeholder="Search entries..."
                value={searchInput}
                style={{ width: '40%' }}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {isFetching ? (
                        <CircularProgress size={20} />
                      ) : (
                        <IconButton
                          onClick={handleSearch}
                          edge="end"
                          sx={{ mr: -1 }} // Adjust button position
                        >
                          <MagnifyingGlass size={20} weight="bold" />
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            <Select name="sort" onChange={handleSortChange} sx={{ maxWidth: '100%', width: '120px' }} value={sortDir}>
              <Option value="desc">Newest</Option>
              <Option value="asc">Oldest</Option>
            </Select>
          </Stack>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'var(--mui-palette-background-paper) !important' }}>
                  <TableCell sx={{ color: 'var(--mui-palette-text-primary) !important' }}>Input</TableCell>
                  <TableCell sx={{ color: 'var(--mui-palette-text-primary) !important' }}>Duration</TableCell>
                  <TableCell sx={{ color: 'var(--mui-palette-text-primary) !important' }}>Entry Date</TableCell>
                  <TableCell sx={{ color: 'var(--mui-palette-text-primary) !important' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ border: 0 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          p: 3,
                        }}
                      >
                        <CircularProgress size={40} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry, index) => {
                    const displayStatus = getDisplayStatus(entry.status);
                    const duration = calculateDuration(entry);
                    return (
                      <TableRow
                        key={entry.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                        onClick={() => handleEntrySelect(entry)}
                        data-testid={index === 0 ? 'trace-row-first' : undefined}
                      >
                        <TableCell>
                          <Typography
                            sx={{
                              maxWidth: 600,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: '1.5em',
                              maxHeight: '3em', // 2 lines * 1.5em line-height
                            }}
                          >
                            {entry.summary ? parseInputContent(entry.summary) : 'Processing...'}
                          </Typography>
                        </TableCell>
                        <TableCell>{duration.toFixed(2)}s</TableCell>
                        <TableCell>{format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm:ss')}</TableCell>
                        <TableCell>
                          <Chip
                            label={displayStatus}
                            size="small"
                            sx={{
                              textTransform: 'capitalize',
                              border: '1px solid',
                              borderColor: config[displayStatus].color,
                              backgroundColor: config[displayStatus].backgroundColor,
                              color: config[displayStatus].color,
                              width: '90px',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={statusFilter === 'success' ? pagination.total - pagination.totalFailedEntries - pagination.totalFailedModelEntries :
              statusFilter === 'failed' ? pagination.totalFailedEntries :
                statusFilter === 'failed_model' ? pagination.totalFailedModelEntries :
                  pagination.total
            }
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[5, 7, 9, 10, 20, 25]}
          />
        </Stack>
      </Card>

      <TracingModal
        entry={selectedEntry}
        entryFlow={entryFlow}
        nodes={nodes}
        edges={edges}
        open={selectedEntry ? true : false}
        onClose={handleClose}
        isLoading={isEntryFlowLoading || isLoadingSingleEntry}
        onNodeUpdate={handleNodeUpdate}
        preSelectedNodeId={filteredNode?.id}
      />
    </>
  );
}
