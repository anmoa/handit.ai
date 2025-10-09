/**
 * @fileoverview Evaluation Hub Table Component
 * 
 * This component implements the View part of the MVVM pattern for the Evaluation Hub table.
 * It displays evaluator data and handles user interactions, delegating business logic
 * to the ViewModel.
 * 
 * Responsibilities:
 * - Display evaluator information in a tabular format
 * - Handle user interactions and events
 * - Manage UI state and presentation
 * - Coordinate with ViewModel for data operations
 */

'use client';

import * as React from 'react';
import {
    Box,
    Card,
    Chip,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    LinearProgress,
    TextField,
    MenuItem,
    InputAdornment,
    Button,
    TablePagination
} from '@mui/material';
import { Gauge, MagnifyingGlass, Plus, Eye } from '@phosphor-icons/react/dist/ssr';
import { format } from 'date-fns';
import { EvaluatorPopover } from './evaluator-popover';
import {
  useGetEvaluationPromptsQuery,
  useCreateEvaluationPromptMutation,
  useUpdateEvaluationPromptMutation,
  useGetEvaluationPromptStatsQuery,
} from '@/services/reviewersTemplateService';
import EvaluatorDetailsDrawer from './EvaluatorDetailsDrawer';

/**
 * Evaluation Hub Table Component
 * 
 * @component
 * @returns {JSX.Element} The rendered evaluation hub table
 */
export function EvaluationHubTable({ onNewEvaluator }) {
    // Fetch evaluators from API
    const { data: stats = [], isLoading: statsLoading } = useGetEvaluationPromptStatsQuery();

    const { data: evaluators = [], isLoading } = useGetEvaluationPromptsQuery();
    const [createEvaluationPrompt] = useCreateEvaluationPromptMutation();
    const [updateEvaluationPrompt] = useUpdateEvaluationPromptMutation();

    // Local UI state
    const [filters, setFilters] = React.useState({ name: '', type: '', status: '' });
    const [sorting, setSorting] = React.useState({ field: 'name', direction: 'asc' });
    const [selectedEvaluator, setSelectedEvaluator] = React.useState(null);
    const [isCreating, setIsCreating] = React.useState(false);
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    // Pagination state
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(8);

    // Merge stats into evaluators
    const evaluatorsWithStats = React.useMemo(() => {
        const statsMap = Object.fromEntries((stats || []).map(s => [String(s.evaluatorId), s]));
        return (evaluators.data || []).map(e => {
            const stat = statsMap[String(e.id)] || {};
            return {
                ...e,
                lastEvaluation: stat.lastEvaluation || e.lastEvaluation,
                successRate: stat.successRate != null ? stat.successRate * 100 : 0,
                totalEvaluations: stat.total || 0,
            };
        });
    }, [evaluators, stats]);

    // Filtering
    const filteredEvaluators = React.useMemo(() => {
        let filtered = evaluatorsWithStats;
        if (filters.name) {
            filtered = filtered.filter(e => e.name?.toLowerCase().includes(filters.name.toLowerCase()));
        }
        if (filters.type) {
            filtered = filtered.filter(e => e.metric?.name === filters.type);
        }
        if (filters.status) {
            filtered = filtered.filter(e => e.status === filters.status);
        }
        // Sorting
        filtered = [...filtered].sort((a, b) => {
            const aValue = a[sorting.field] ?? '';
            const bValue = b[sorting.field] ?? '';
            if (aValue < bValue) return sorting.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sorting.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [evaluatorsWithStats, filters, sorting]);

    // Paginated evaluators
    const paginatedEvaluators = React.useMemo(() => {
        const start = page * rowsPerPage;
        return filteredEvaluators.slice(start, start + rowsPerPage);
    }, [filteredEvaluators, page, rowsPerPage]);

    // Unique types and statuses for filters
    const evaluatorTypes = React.useMemo(() => Array.from(new Set(evaluators.data?.map(e => e.metric?.name))).filter(Boolean), [evaluators]);
    const evaluatorStatuses = React.useMemo(() => Array.from(new Set(evaluators.data?.map(e => e.status))).filter(Boolean), [evaluators]);

    // Handlers
    const handleFilterChange = (filterType, value) => {
        setFilters(f => ({ ...f, [filterType]: value }));
    };
    const handleSortChange = (field) => {
        setSorting(s => ({
            field,
            direction: s.field === field && s.direction === 'asc' ? 'desc' : 'asc',
        }));
    };
    const handleEvaluatorSelect = (evaluator) => {
        setSelectedEvaluator(evaluator);
        setIsCreating(false);
        setDrawerOpen(true);
    };
    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedEvaluator({
            id: undefined,
            name: '',
            metric: '',
            status: 'Active',
            lastEvaluation: new Date().toISOString(),
            successRate: 0,
            totalEvaluations: 0,
            description: '',
            prompt: '',
            relatedNodes: [],
            llmConfig: {
                provider: 'OpenAI',
                model: 'GPT-4',
                temperature: 0.7,
                maxTokens: 2000
            }
        });
    };
    const handleEvaluatorUpdate = async (updatedEvaluator) => {
        if (isCreating) {
            await createEvaluationPrompt(updatedEvaluator);
        }
        setSelectedEvaluator(null);
        setIsCreating(false);
        setDrawerOpen(false);
    };
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Box>
            {/* Header section with title and action buttons */}

            {/* Table Card */}
            <Card>
                {/* Filters section */}
                <Box sx={{ px: 2, py: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                            size="small"
                            placeholder="Search..."
                            value={filters.name}
                            onChange={(e) => handleFilterChange('name', e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <MagnifyingGlass size={20} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ width: 200 }}
                        />
                        
                        <TextField
                            select
                            size="small"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            sx={{ width: 130 }}
                            placeholder="Status"
                        >
                            <MenuItem value="">All Status</MenuItem>
                            {evaluatorStatuses.map((status) => (
                                <MenuItem key={status} value={status}>
                                    {status}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </Box>

                {/* Table section */}
                <Box sx={{ overflowX: 'auto', maxHeight: '70vh', minHeight: '70vh' }}>
                    <Table stickyHeader size="medium">
                        <TableHead>
                            <TableRow>
                                <TableCell 
                                    sx={{ pl: 2, cursor: 'pointer' }}
                                    onClick={() => handleSortChange('name')}
                                >
                                    Evaluator
                                </TableCell>
                                <TableCell 
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleSortChange('status')}
                                >
                                    Status
                                </TableCell>
                                <TableCell 
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleSortChange('lastEvaluation')}
                                >
                                    Last Evaluation
                                </TableCell>
                                <TableCell 
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleSortChange('successRate')}
                                >
                                    Success Rate
                                </TableCell>
                                <TableCell 
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleSortChange('totalEvaluations')}
                                >
                                    Total Evaluations
                                </TableCell>
                                <TableCell align="center">
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedEvaluators.filter(e => e.type === 'prompt').map((evaluator, index) => (
                                <TableRow
                                    key={evaluator.id}
                                    hover
                                    onClick={() => handleEvaluatorSelect(evaluator)}
                                    sx={{ cursor: 'pointer' }}
                                    data-testid={`evaluator-row-${evaluator.id}`}
                                    data-evaluator-index={index}
                                    data-evaluator-id={evaluator.id}
                                    data-is-last-evaluator={index === paginatedEvaluators.length - 1}
                                >
                                    <TableCell sx={{ pl: 2 }}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="subtitle2">{evaluator.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {evaluator.description}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <Chip
                                            label={evaluator.status || 'Active'}
                                            size="small"
                                            color={evaluator.status === 'Active' ? 'success' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {evaluator.lastEvaluation ? format(new Date(evaluator.lastEvaluation), 'MMM dd, yyyy') : '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Stack spacing={1}>
                                            <Typography variant="body2">
                                                {evaluator.successRate?.toFixed(1) ?? '0.0'}%
                                            </Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={evaluator.successRate ?? 0}
                                                color={evaluator.successRate >= 90 ? 'success' : 'warning'}
                                                sx={{ height: 4, borderRadius: 2 }}
                                            />
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {evaluator.totalEvaluations?.toLocaleString?.() ?? '0'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button size="small" variant="text" onClick={e => { e.stopPropagation(); handleEvaluatorSelect(evaluator); }}>
                                            <Eye size={20} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
                <TablePagination
                    component="div"
                    count={filteredEvaluators.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 8, 10, 25, 50]}
                />
            </Card>

            <EvaluatorDetailsDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                evaluator={selectedEvaluator}
                onUpdate={handleEvaluatorUpdate}
            />
        </Box>
    );
} 