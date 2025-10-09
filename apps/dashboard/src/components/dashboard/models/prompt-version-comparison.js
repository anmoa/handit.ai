/**
 * @fileoverview PromptVersionComparison component for comparing different versions of prompts
 * Provides a detailed comparison interface for prompt versions with metrics and differences
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  useGetPromptVersionMetricsQuery,
  useGetPromptVersionsQuery,
  useUpdatePromptMutation,
} from '@/services/promptService';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircle, XCircle } from '@phosphor-icons/react/dist/ssr';
import { CaretDown } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ChartLine } from '@phosphor-icons/react/dist/ssr/ChartLine';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PencilSimple } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { RocketLaunch } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { Star } from '@phosphor-icons/react/dist/ssr/Star';
import { skipToken } from '@reduxjs/toolkit/query';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer';

import { NewPromptComparison } from '@/components/dashboard/automated-insights/new-prompt-comparison';

import { AutomatedInsights } from '../automated-insights/automated-insights';
import { MetricsComparisonModal } from './metrics-comparison-modal';

function truncatePrompt(prompt) {
  if (!prompt) return '';
  return prompt.length > 120 ? prompt.slice(0, 120) + '…' : prompt;
}

function getTopMetrics(metricsData) {
  if (!Array.isArray(metricsData)) return [];
  // Filter out healtcheck (case-insensitive)
  const filtered = metricsData
    .filter(
      (m) =>
        m.label &&
        m.label.toLowerCase() !== 'healtcheck' &&
        m.label.toLowerCase() !== 'healthcheck' &&
        m.label.toLowerCase() !== 'health_check'
    )
    .sort((a, b) => a.label.localeCompare(b.label));
  // Group by label
  const grouped = {};
  filtered.forEach((m) => {
    const label = m.label.toLowerCase();
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(m.value);
  });
  // Compute average per label
  const averages = Object.entries(grouped).map(([label, values]) => ({
    label,
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  }));
  // Take first three unique metrics
  return averages.slice(0, 3);
}

function formatMetricLabel(label) {
  // Remove 'Average', replace underscores with spaces, capitalize each word
  return label
    .replace(/^average[_ ]?/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function MetricRow({ label, value, good }) {
  // Use CSS variables for colors
  let color = undefined;
  if (good === true) color = 'var(--mui-palette-primary-500';
  if (good === false) color = 'red';
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      sx={{ width: '100%', borderBottom: '1px solid var(--mui-palette-divider)', pb: 1, pl: 0, pr: 0 }}
    >
      <Typography variant="body2" color="white" sx={{ minWidth: 80, fontSize: 16, ml: 2 }}>
        {formatMetricLabel(label)}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 2, display: 'flex', minWidth: 55 }}>
        {good !== null && <CheckCircle weight="fill" size={18} style={{ color }} />}
        <Typography variant="body2" fontWeight={500} style={{ color: 'white' }}>
          {value}
        </Typography>
      </Stack>
    </Stack>
  );
}

function getMetricComparison(leftMetrics, rightMetrics) {
  // Returns: { label, left: { value, good }, right: { value, good } }
  // Show all metrics present in either side
  const left = getTopMetrics(leftMetrics?.data);
  const right = getTopMetrics(rightMetrics?.data);
  const allLabels = Array.from(new Set([...left.map((m) => m.label), ...right.map((m) => m.label)]));
  const result = [];
  allLabels.forEach((label) => {
    const lm = left.find((m) => m.label === label);
    const rm = right.find((m) => m.label === label);
    const lval = lm ? lm.avg : null;
    const rval = rm ? rm.avg : null;
    let leftGood = null,
      rightGood = null;
    // Decide direction: higher is better for accuracy, lower is better for latency/cost
    if (lval !== null && rval !== null) {
      if (lval > rval) {
        leftGood = true;
        rightGood = false;
      } else if (lval <= rval) {
        leftGood = false;
        rightGood = true;
      } else {
        leftGood = rightGood = null;
      }
    }
    result.push({
      label: formatMetricLabel(label),
      left: { value: lval !== null ? `${Math.round(lval * 100)}%` : '--', good: leftGood },
      right: { value: rval !== null ? `${Math.round(rval * 100)}%` : '--', good: rightGood },
    });
  });
  return result;
}

function renderPromptAndMetrics(promptData, metrics, loading, side, metricComparisons) {
  // metricComparisons: [{ label, left: { value, good }, right: { value, good } }]
  const isLeft = side === 'left';
  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Prompt text */}
      <Box
        sx={{
          mb: 2,
          flex: 1,
          minHeight: 0,
          bgcolor: 'rgba(20,28,32,0.9)',
          borderRadius: '8px',
          position: 'relative', // keep this
          fontFamily: 'Roboto Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: 15,
          lineHeight: 2,
          letterSpacing: 0.2,
          color: '#e0e0e0',
          whiteSpace: 'pre-wrap',
          boxShadow: '0 1px 4px 0 rgba(0,0,0,0.08)',
        }}
      >
        <Box
          sx={{
            overflow: 'auto', // move overflow here
            height: '100%',
            borderRadius: '8px',
          }}
        >
          <Typography
            component="pre"
            sx={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              letterSpacing: 'inherit',
              color: 'inherit',
              background: 'none',
              m: 0,
              p: 2, // keep padding here instead of outer Box
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              minHeight: '2em',
              pb: 8
            }}
          >
            {promptData?.parameters?.prompt}
          </Typography>
        </Box>

        {/* Gradient overlay pinned to container, not scroll content */}
        <Box
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '80px', // or whatever height you want
            borderRadius: '0 0 8px 8px',
            background:
              'linear-gradient(180deg, rgba(20,28,32,0) 0%, rgba(20,28,32,0.95) 75%, rgba(20,28,32,0.95) 100%)',
          }}
        />
      </Box>
      {/* Metrics (now always the same, with left/right/centered label) */}
    </Box>
  );
}

function MetricsComparisonRow({ label, leftValue, rightValue, leftGood, rightGood }) {
  let leftColor = leftGood === true ? 'var(--mui-palette-primary-500)' : leftGood === false ? 'red' : undefined;
  let rightColor = rightGood === true ? 'var(--mui-palette-primary-500)' : rightGood === false ? 'red' : undefined;
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{ width: '100%', borderBottom: '1px solid var(--mui-palette-divider)', py: 1 }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mr: 2, display: 'flex', minWidth: 55, textAlign: 'right' }}
      >
        <CheckCircle weight="fill" size={18} style={{ color: leftColor || 'white' }} />
        <Typography variant="body2" fontWeight={500} style={{ color: 'white' }}>
          {leftValue}
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        color="white"
        sx={{ flex: 1, fontSize: 16, textAlign: 'center', fontSize: 16, color: 'white' }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mr: 2, display: 'flex', minWidth: 55, textAlign: 'right' }}
      >
        <CheckCircle weight="fill" size={18} style={{ color: rightColor || 'white' }} />
        <Typography variant="body2" fontWeight={500} style={{ color: 'white' }}>
          {rightValue}
        </Typography>
      </Stack>
    </Stack>
  );
}

/**
 * PromptVersionComparison component for comparing different versions of prompts
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.modelId - ID of the model
 * @param {Function} props.onRightModelChange - Callback function to handle right model change
 * @param {Function} props.onLeftModelChange - Callback function to handle left model change
 * @param {Function} props.onLeftAccuracyChange - Callback function to handle left accuracy change
 * @param {Function} props.onRightAccuracyChange - Callback function to handle right accuracy change
 * @param {string} props.bgColor - Background color of the component
 * @returns {JSX.Element} Rendered comparison component
 * 
 * @description
 * This component provides:
 * - Side-by-side comparison of prompt versions
 * - Performance metrics comparison
 * - Version metadata display
 * - Difference highlighting
 */
export function PromptVersionComparison({
  modelId,
  onRightModelChange,
  onLeftModelChange,
  onLeftAccuracyChange,
  onRightAccuracyChange,
  bgColor,
  defaultRightVersion,
}) {
  const [leftVersion, setLeftVersion] = React.useState(null);
  const [rightVersion, setRightVersion] = React.useState(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = React.useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = React.useState(false);
  const [deployAnchorEl, setDeployAnchorEl] = React.useState(null);
  const [promptModalSide, setPromptModalSide] = React.useState('left');
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editPromptText, setEditPromptText] = React.useState('');
  const [editPromptVersion, setEditPromptVersion] = React.useState(null);
  const [editError, setEditError] = React.useState('');
  const [updatePrompt, { isLoading: isUpdating }] = useUpdatePromptMutation();
  const { refetch: refetchPromptVersions } = useGetPromptVersionsQuery(modelId, { skip: !modelId });
  const [leftMenuAnchor, setLeftMenuAnchor] = React.useState(null);
  const [rightMenuAnchor, setRightMenuAnchor] = React.useState(null);

  // Fetch prompt versions for the selected model
  const { data: promptVersions, isLoading } = useGetPromptVersionsQuery(modelId, {
    skip: !modelId,
  });

  // Set initial versions when data is loaded
  React.useEffect(() => {
    if (promptVersions?.length > 0) {
      const baseVersion = promptVersions.find((v) => v.isBase);
      const latestVersion = promptVersions.reduce((latest, current) =>
        !latest || parseInt(current.version) > parseInt(latest.version) ? current : latest
      );
      if (defaultRightVersion) {
        setRightVersion(defaultRightVersion);
        onRightModelChange(promptVersions.find((v) => v.id == defaultRightVersion));
      } else {
        setRightVersion(latestVersion?.id || promptVersions[promptVersions.length - 1].id);
        onRightModelChange(latestVersion || promptVersions[promptVersions.length - 1]);

      }

      setLeftVersion(baseVersion?.id || promptVersions[0].id);
      onLeftModelChange(baseVersion || promptVersions[0]);
    }
  }, [promptVersions, defaultRightVersion]);

  const handleDeploy = (versionId) => {
    setDeployAnchorEl(null);
    // TODO: Implement deployment logic
  };

  const leftPromptData = promptVersions?.find((v) => v.id === leftVersion);
  const rightPromptData = promptVersions?.find((v) => v.id === rightVersion);

  // Fetch metrics for each version
  const { data: leftMetrics, isLoading: loadingLeftMetrics } = useGetPromptVersionMetricsQuery(
    leftPromptData ? { modelId: leftPromptData.modelId, version: leftPromptData.originalVersion } : skipToken,
    { skip: !leftPromptData }
  );
  const { data: rightMetrics, isLoading: loadingRightMetrics } = useGetPromptVersionMetricsQuery(
    rightPromptData ? { modelId: rightPromptData.modelId, version: rightPromptData.originalVersion } : skipToken,
    { skip: !rightPromptData }
  );

  if (isLoading) {
    return (
      <Card sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Loading prompt versions...</Typography>
      </Card>
    );
  }

  if (!promptVersions?.length) {
    return (
      <Card sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>No prompt versions available for this model</Typography>
      </Card>
    );
  }

  function handleEditPrompt(side) {
    // Open edit dialog for the selected version
    let promptData = side === 'left' ? leftPromptData : rightPromptData;

    setEditPromptText(promptData?.parameters?.prompt || '');
    setEditPromptVersion(promptData);
    setIsEditDialogOpen(true);
    setEditError('');
  }

  async function handleEditPromptSubmit() {
    setEditError('');
    try {
      await updatePrompt({
        modelId: editPromptVersion.modelId,
        version: editPromptVersion.originalVersion,
        prompt: editPromptText,
      }).unwrap();
      setIsEditDialogOpen(false);
      setEditPromptText('');
      setEditPromptVersion(null);
      await refetchPromptVersions();
    } catch (err) {
      setEditError(err?.data?.message || 'Failed to update prompt.');
    }
  }

  function renderSelector(version, setVersion, side, onVersionChange) {
    const isLeft = side === 'left';
    const anchor = isLeft ? leftMenuAnchor : rightMenuAnchor;
    const setAnchor = isLeft ? setLeftMenuAnchor : setRightMenuAnchor;
    const handleOpen = (e) => setAnchor(e.currentTarget);
    const handleClose = () => setAnchor(null);
    const selectedVersion = promptVersions.find((v) => v.id === version);
    return (
      <>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 600,
            color: '#94e4c7',
            mb: 1,
            userSelect: 'none',
            ml: 2,
          }}
          onClick={handleOpen}
        >
          <span>Version {selectedVersion?.version}</span>
          {selectedVersion?.activeVersion && (
            <Image
              src="/assets/lg.png"
              alt="Handit Production Icon"
              width={24}
              height={24}
              style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 6 }}
            />
          )}
          <CaretDown size={22} style={{ marginLeft: 4, color: '#fff' }} />
        </Box>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          PaperProps={{ sx: { minWidth: 180, bgcolor: '#181f23', color: '#fff', mt: 1, borderRadius: 2 } }}
        >
          {promptVersions.map((v) => (
            <MenuItem
              key={v.id}
              selected={v.id === version}
              onClick={() => {
                setVersion(v.id);
                onVersionChange(v);
                handleClose();
              }}
              sx={{
                fontWeight: v.id === version ? 700 : 400,
                fontSize: 18,
                color: v.id === version ? '#fff' : 'rgba(255,255,255,0.8)',
                bgcolor: v.id === version ? 'rgba(0,247,170,0.08)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(0,247,170,0.12)' },
              }}
            >
              Version {v.version}
              {v.activeVersion && (
                <Image
                  src="/assets/lg.png"
                  alt="Handit Production Icon"
                  width={24}
                  height={24}
                  style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 6 }}
                />
              )}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  const metricComparisons = getMetricComparison(leftMetrics, rightMetrics);

  const leftAccuracy = metricComparisons.find((m) => m.label === 'Accuracy')?.left?.value.slice(0, -1);
  const rightAccuracy = metricComparisons.find((m) => m.label === 'Accuracy')?.right?.value.slice(0, -1);

  onLeftAccuracyChange(parseFloat(leftAccuracy) / 100.0);
  onRightAccuracyChange(parseFloat(rightAccuracy) / 100.0);
  // Custom styles for diff viewer (less strong green/red, similar to new-prompt-comparison.js)
  const diffCustomStyles = {
    variables: {
      dark: {
        diffViewerBackground: 'transparent',
        diffViewerColor: '#FFF',
        addedBackground: 'rgba(var(--mui-palette-success-mainChannel) / 0.15)',
        addedColor: 'white',
        removedBackground: 'rgba(var(--mui-palette-error-mainChannel) / 0.15)',
        removedColor: 'white',
        wordAddedBackground: 'rgba(var(--mui-palette-success-mainChannel) / 0.3)',
        wordRemovedBackground: 'rgba(var(--mui-palette-error-mainChannel) / 0.3)',
        addedGutterBackground: 'rgba(var(--mui-palette-success-mainChannel) / 0.2)',
        removedGutterBackground: 'rgba(var(--mui-palette-error-mainChannel) / 0.2)',
        gutterBackground: 'var(--mui-palette-neutral-900)',
        gutterBackgroundDark: 'var(--mui-palette-neutral-900)',
        highlightBackground: 'rgba(255, 255, 255, 0.05)',
        highlightGutterBackground: 'rgba(255, 255, 255, 0.05)',
        codeFoldGutterBackground: 'transparent',
        codeFoldBackground: 'transparent',
        emptyLineBackground: 'transparent',
        gutterColor: 'var(--mui-palette-text-secondary)',
        addedGutterColor: 'white',
        removedGutterColor: 'white',
        codeFoldContentColor: 'var(--mui-palette-text-secondary)',
        diffViewerTitleBackground: 'var(--mui-palette-neutral-900)',
        diffViewerTitleColor: 'white',
        diffViewerTitleBorderColor: 'var(--mui-palette-divider)',
      }
    },
    contentText: {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '14px',
      lineHeight: '1.5',
    },
    gutter: {
      padding: '0 8px',
      minWidth: '32px',
      maxWidth: '32px',
      textAlign: 'right',
    },
    line: {
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.05)',
      },
    },
    splitView: {
      borderLeft: '0',
      borderRight: '0',
    },
  };

  return (
    <Card
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: bgColor,
        py: 2,
      }}
    >
      <Grid container spacing={0} alignItems="flex-start" justifyContent="center" sx={{ height: '20%', position: 'relative', paddingTop: 5, height: '100%' }}>
        {/* Left Version */}
        {/*<Grid item xs={12} md={5.8} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {renderSelector(leftVersion, setLeftVersion, 'left', onLeftModelChange)}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '90%',
                borderTop: '0.5px solid var(--mui-palette-divider)',
              }}
            >
              {renderPromptAndMetrics(leftPromptData, leftMetrics, loadingLeftMetrics, 'left', metricComparisons)}
            </Box>
          </Box>
        </Grid>

        <Grid
          item
          xs={12}
          md={0.4}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            height: '100%',
            zIndex: 2,
          }}
        >
          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0, height: '100%', borderRightWidth: 2, zIndex: 1, width: '50%' }}
          />
        </Grid>
        <Grid item xs={12} md={5.8} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {renderSelector(rightVersion, setRightVersion, 'right', onRightModelChange)}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '90%',
                borderTop: '0.5px solid var(--mui-palette-divider)',
              }}
            >
              {renderPromptAndMetrics(rightPromptData, rightMetrics, loadingRightMetrics, 'right', metricComparisons)}
            </Box>
          </Box>
        </Grid>*/}
        <Grid item xs={12} md={5.8} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {renderSelector(leftVersion, setLeftVersion, 'left', onLeftModelChange)}
            </Box>
        </Grid>
        <Grid
          item
          xs={12}
          md={0.4}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            height: '100%',
            zIndex: 2,
          }}
        >

        </Grid>
        <Grid item xs={12} md={5.8} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {renderSelector(rightVersion, setRightVersion, 'right', onRightModelChange)}
          </Box>
        </Grid>
      </Grid>
      <Grid item xs={12} md={5.8} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ maxHeight: '50vh', overflow: 'auto', border: '0px solid var(--mui-palette-divider)', borderRadius: '0px', my: 2 }}>
        {leftPromptData?.parameters?.prompt === rightPromptData?.parameters?.prompt ? (
  <ReactDiffViewer
  oldValue={'- ' + leftPromptData?.parameters?.prompt || ''}
  newValue={'+ ' + rightPromptData?.parameters?.prompt || ''}
  splitView={true}
  useDarkTheme={true}
  styles={diffCustomStyles}
/>
) : (
  <ReactDiffViewer
    oldValue={leftPromptData?.parameters?.prompt || ''}
    newValue={rightPromptData?.parameters?.prompt || ''}
    splitView={true}
    useDarkTheme={true}
    styles={diffCustomStyles}
    compareMethod={DiffMethod.LINES}
  />
)}
        </Box>
      </Grid>
      <Box sx={{ bgcolor: 'transparent', borderRadius: '8px', mb: 2, pl: 0, pr: 0, mt: 2 }}>
        <Stack spacing={1} sx={{ pl: 0, pr: 0, ml: 0, mr: 0 }}>
          {metricComparisons.map((m) => (
            <MetricsComparisonRow
              key={m.label}
              label={m.label}
              leftValue={m.left.value}
              rightValue={m.right.value}
              leftGood={m.left.good}
              rightGood={m.right.good}
            />
          ))}
        </Stack>
      </Box>
     
      {/* Prompt Comparison Modal */}
      {isPromptModalOpen && (
        <NewPromptComparison
          open={isPromptModalOpen}
          setOpen={setIsPromptModalOpen}
          originalPrompt={
            promptModalSide === 'left' ? leftPromptData?.parameters?.prompt : rightPromptData?.parameters?.prompt
          }
          newPrompt={
            promptModalSide === 'left' ? rightPromptData?.parameters?.prompt : leftPromptData?.parameters?.prompt
          }
          id={modelId}
          leftTitle={`Version ${leftPromptData?.version || ''}`}
          rightTitle={`Version ${rightPromptData?.version || ''}`}
        />
      )}
      {/* Edit Prompt Dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Prompt</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={8}
            value={editPromptText}
            onChange={(e) => setEditPromptText(e.target.value)}
            placeholder="Edit your prompt text here..."
            fullWidth
            variant="outlined"
            sx={{ mt: 2 }}
            disabled={isUpdating}
          />
          {editError && (
            <Typography color="error" sx={{ mt: 2 }}>
              {editError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)} sx={{ color: 'text.secondary' }} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleEditPromptSubmit}
            variant="contained"
            disabled={!editPromptText.trim() || isUpdating}
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
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
