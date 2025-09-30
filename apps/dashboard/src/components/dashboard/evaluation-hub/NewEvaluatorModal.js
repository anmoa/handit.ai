import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  IconButton,
  TextField,
  Button,
  MenuItem,
} from '@mui/material';
import { X, Plus, ArrowsOutSimple, Code } from '@phosphor-icons/react/dist/ssr';
import { useGetEvaluatorMetricsQuery, useCreateEvaluatorMetricMutation } from '@/services/evaluatorMetricService';
import { useGetModelsQuery } from '@/services/modelsService';
import { useGetProvidersQuery } from '@/services/providerService';
import { useGetIntegrationTokensQuery, useCreateIntegrationTokenMutation } from '@/services/integrationTokenService';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import { useCreateEvaluationPromptMutation } from '@/services/reviewersTemplateService';

export default function NewEvaluatorModal({ open, onClose, onCreate, associateSection = true }) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [metricId, setMetricId] = useState('');
  const [metricDialogOpen, setMetricDialogOpen] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricDescription, setNewMetricDescription] = useState('');
  const { data: metrics = [] } = useGetEvaluatorMetricsQuery();
  const [createMetric] = useCreateEvaluatorMetricMutation();
  const [creatingMetric, setCreatingMetric] = useState(false);
  const { data: models = [] } = useGetModelsQuery();
  const { data: providers = [] } = useGetProvidersQuery();
  const { data: tokens = [] } = useGetIntegrationTokensQuery();
  const [createToken] = useCreateIntegrationTokenMutation();
  const [associations, setAssociations] = useState([]);
  const [addAssocOpen, setAddAssocOpen] = useState(false);
  const [assocModelId, setAssocModelId] = useState('');
  const [assocProviderId, setAssocProviderId] = useState('');
  const [assocProviderModel, setAssocProviderModel] = useState('');
  const [assocTokenId, setAssocTokenId] = useState('');
  const [expandedModel, setExpandedModel] = useState(null);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenValue, setNewTokenValue] = useState('');
  const [tokenModelId, setTokenModelId] = useState(null);
  const [tokenProviderId, setTokenProviderId] = useState(null);
  const [creatingToken, setCreatingToken] = useState(false);
  const [editingAssocModelId, setEditingAssocModelId] = useState(null);
  const [editProviderId, setEditProviderId] = useState('');
  const [editProviderModel, setEditProviderModel] = useState('');
  const [editTokenId, setEditTokenId] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [createEvaluationPrompt, { isLoading: isCreating, error: createError }] = useCreateEvaluationPromptMutation();
  const [errorMsg, setErrorMsg] = useState('');
  const [defaultProviderId, setDefaultProviderId] = useState('');
  const [defaultProviderModel, setDefaultProviderModel] = useState('');
  const [defaultTokenId, setDefaultTokenId] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setPrompt('');
      setMetricId('');
      setAssociations([]);
      setAddAssocOpen(false);
      setAssocModelId('');
      setAssocProviderId('');
      setAssocProviderModel('');
      setAssocTokenId('');
      setEditingAssocModelId(null);
      setEditProviderId('');
      setEditProviderModel('');
      setEditTokenId('');
      setMetricDialogOpen(false);
      setNewMetricName('');
      setNewMetricDescription('');
      setTokenDialogOpen(false);
      setNewTokenName('');
      setNewTokenValue('');
      setTokenModelId(null);
      setTokenProviderId(null);
      setCreatingMetric(false);
      setCreatingToken(false);
      setIsEditingPrompt(false);
      setIsExpanded(false);
      setErrorMsg('');
      setDefaultProviderId('');
      setDefaultProviderModel('');
      setDefaultTokenId('');
    }
  }, [open]);

  const handleCreateMetric = async () => {
    if (!newMetricName) return;
    setCreatingMetric(true);
    try {
      const metric = await createMetric({ name: newMetricName, description: newMetricDescription }).unwrap();
      setMetricId(metric.id);
      setMetricDialogOpen(false);
      setNewMetricName('');
      setNewMetricDescription('');
    } finally {
      setCreatingMetric(false);
    }
  };

  const handleCreateToken = async () => {
    if (!newTokenName || !newTokenValue || !tokenProviderId) return;
    setCreatingToken(true);
    try {
      const token = await createToken({
        name: newTokenName,
        token: newTokenValue,
        providerId: tokenProviderId,
      }).unwrap();
      setAssociations(prev => ({
        ...prev,
        [tokenModelId]: {
          ...prev[tokenModelId],
          tokenId: token.id,
        },
      }));
      setTokenDialogOpen(false);
      setNewTokenName('');
      setNewTokenValue('');
      setTokenModelId(null);
      setTokenProviderId(null);
    } finally {
      setCreatingToken(false);
    }
  };

  const handleAddAssociation = () => {
    if (!assocModelId || !assocProviderId || !assocProviderModel || !assocTokenId) return;
    setAssociations(prev => [
      ...prev,
      {
        modelId: assocModelId,
        providerId: assocProviderId,
        providerModel: assocProviderModel,
        tokenId: assocTokenId,
      },
    ]);
    setAddAssocOpen(false);
    setAssocModelId('');
    setAssocProviderId('');
    setAssocProviderModel('');
    setAssocTokenId('');
  };

  const handleRemoveAssociation = (modelId) => {
    setAssociations(prev => prev.filter(a => a.modelId !== modelId));
  };

  const handleStartEditAssociation = (assoc) => {
    setEditingAssocModelId(assoc.modelId);
    setEditProviderId(assoc.providerId);
    setEditProviderModel(assoc.providerModel);
    setEditTokenId(assoc.tokenId);
  };

  const handleSaveEditAssociation = (modelId) => {
    setAssociations(prev => prev.map(a =>
      a.modelId === modelId
        ? { ...a, providerId: editProviderId, providerModel: editProviderModel, tokenId: editTokenId }
        : a
    ));
    setEditingAssocModelId(null);
    setEditProviderId('');
    setEditProviderModel('');
    setEditTokenId('');
  };

  const handleCancelEditAssociation = () => {
    setEditingAssocModelId(null);
    setEditProviderId('');
    setEditProviderModel('');
    setEditTokenId('');
  };

  const handleSubmit = async () => {
    if (!name || !prompt) return;
    setErrorMsg('');
    try {
      const payload = { name, prompt, metricId, defaultProviderModel, defaultIntegrationTokenId: defaultTokenId };
      if (associateSection) payload.associations = associations;
      const res = await createEvaluationPrompt(payload).unwrap();
      // The API returns { data: { ...evaluator } }
      const evaluator = res?.data;
      if (evaluator) {
        onCreate(evaluator);
        // Reset state after creation
        setName('');
        setPrompt('');
        setMetricId('');
        setAssociations([]);
        setAddAssocOpen(false);
        setAssocModelId('');
        setAssocProviderId('');
        setAssocProviderModel('');
        setAssocTokenId('');
        setEditingAssocModelId(null);
        setEditProviderId('');
        setEditProviderModel('');
        setEditTokenId('');
        setMetricDialogOpen(false);
        setNewMetricName('');
        setNewMetricDescription('');
        setTokenDialogOpen(false);
        setNewTokenName('');
        setNewTokenValue('');
        setTokenModelId(null);
        setTokenProviderId(null);
        setCreatingMetric(false);
        setCreatingToken(false);
        setIsEditingPrompt(false);
        setIsExpanded(false);
        setErrorMsg('');
        setDefaultProviderId('');
        setDefaultProviderModel('');
        setDefaultTokenId('');
      }
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Failed to create evaluator');
    }
  };

  const associatedModelIds = associations.map(a => a.modelId);
  const availableModels = models.filter(m => !associatedModelIds.includes(m.id));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { p: 3, bgcolor: 'background.default', borderRadius: 3 } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Create New Evaluator
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X weight="bold" />
        </IconButton>
      </Box>
      <Stack spacing={4}>
        <TextField
          label="Evaluator Name"
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
        />
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Code weight="bold" size={20} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Evaluation Prompt</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title={isExpanded ? 'Collapse' : 'Expand'}>
                <Button
                  startIcon={<ArrowsOutSimple weight="bold" />}
                  onClick={() => setIsExpanded(!isExpanded)}
                  size="small"
                  variant="outlined"
                >
                  {isExpanded ? 'Collapse' : 'Expand'}
                </Button>
              </Tooltip>
            </Stack>
          </Box>
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'background.neutral',
              p: 2,
              borderRadius: 1,
              maxHeight: isExpanded ? 'none' : '200px',
              overflow: 'auto',
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)', borderRadius: '4px' },
              transition: 'all 0.2s ease-in-out',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <TextField
              fullWidth
              multiline
              rows={isExpanded ? 20 : 8}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  '& .MuiInputBase-input': {
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  },
                },
              }}
            />
          </Paper>
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Default Provider, Model & Token
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Provider"
              value={defaultProviderId}
              onChange={e => {
                setDefaultProviderId(e.target.value);
                setDefaultProviderModel('');
                setDefaultTokenId('');
              }}
              fullWidth
            >
              {providers?.data?.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Provider Model"
              value={defaultProviderModel}
              onChange={e => setDefaultProviderModel(e.target.value)}
              fullWidth
              disabled={!defaultProviderId}
            >
              {(providers?.data?.find(p => p.id === defaultProviderId)?.config?.models || []).map(pm => (
                <MenuItem key={pm} value={pm}>{pm}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Token"
              value={defaultTokenId}
              onChange={e => setDefaultTokenId(e.target.value)}
              fullWidth
              disabled={!defaultProviderId}
            >
              {tokens.filter(t => t.providerId === defaultProviderId).map(token => (
                <MenuItem key={token.id} value={token.id}>{token.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>
        {associateSection && <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Associated LLM Nodes
          </Typography>
          {associations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No LLM nodes associated yet.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {associations.map((assoc) => {
                const model = models.find(m => m.id === assoc.modelId);
                if (!model) return null;
                const provider = providers?.data?.find(p => p.id === assoc.providerId);
                const token = tokens.find(t => t.id === assoc.tokenId);
                const isEditing = editingAssocModelId === assoc.modelId;
                return (
                  <Box key={assoc.modelId} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2">{model?.name || assoc.modelId}</Typography>
                      <Stack direction="row" spacing={1}>
                        {isEditing ? null : (
                          <Button size="small" onClick={() => handleStartEditAssociation(assoc)}>
                            Configure
                          </Button>
                        )}
                        <Button size="small" color="error" onClick={() => handleRemoveAssociation(assoc.modelId)}>
                          Remove
                        </Button>
                      </Stack>
                    </Stack>
                    {isEditing ? (
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <TextField
                          select
                          label="Provider"
                          value={editProviderId}
                          onChange={e => setEditProviderId(e.target.value)}
                          fullWidth
                        >
                          {providers?.data?.map(p => (
                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          select
                          label="Provider Model"
                          value={editProviderModel}
                          onChange={e => setEditProviderModel(e.target.value)}
                          fullWidth
                          disabled={!editProviderId}
                        >
                          {(providers?.data?.find(p => p.id === editProviderId)?.config?.models || []).map(pm => (
                            <MenuItem key={pm} value={pm}>{pm}</MenuItem>
                          ))}
                        </TextField>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            select
                            label="Token"
                            value={editTokenId}
                            onChange={e => setEditTokenId(e.target.value)}
                            fullWidth
                            disabled={!editProviderId}
                          >
                            {tokens.filter(t => t.providerId === editProviderId).map(token => (
                              <MenuItem key={token.id} value={token.id}>{token.name}</MenuItem>
                            ))}
                          </TextField>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ marginTop: 'auto', marginBottom: '5px' }}
                            onClick={() => {
                              setTokenDialogOpen(true);
                              setTokenModelId(assoc.modelId);
                              setTokenProviderId(editProviderId);
                            }}
                            disabled={!editProviderId}
                          >
                            Add
                          </Button>
                        </Stack>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button onClick={handleCancelEditAssociation}>Cancel</Button>
                          <Button
                            onClick={() => handleSaveEditAssociation(assoc.modelId)}
                            variant="contained"
                            disabled={!editProviderId || !editProviderModel || !editTokenId}
                          >
                            Save
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        {/* Display association details if needed */}
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => setAddAssocOpen(true)}
            disabled={availableModels.length === 0}
          >
            Associate New LLM Node
          </Button>
          {addAssocOpen && (
            <Box sx={{ mt: 2, border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Model"
                  value={assocModelId}
                  onChange={e => setAssocModelId(e.target.value)}
                  fullWidth
                >
                  {availableModels.map(m => (
                    <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Provider"
                  value={assocProviderId}
                  onChange={e => setAssocProviderId(e.target.value)}
                  fullWidth
                  disabled={!assocModelId}
                >
                  {providers.data?.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Provider Model"
                  value={assocProviderModel}
                  onChange={e => setAssocProviderModel(e.target.value)}
                  fullWidth
                  disabled={!assocProviderId}
                >
                  {(providers?.data?.find(p => p.id === assocProviderId)?.config?.models || []).map(pm => (
                    <MenuItem key={pm} value={pm}>{pm}</MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    select
                    label="Token"
                    value={assocTokenId}
                    onChange={e => setAssocTokenId(e.target.value)}
                    fullWidth
                    disabled={!assocProviderId}
                  >
                    {tokens.filter(t => t.providerId === assocProviderId).map(token => (
                      <MenuItem key={token.id} value={token.id}>{token.name}</MenuItem>
                    ))}
                  </TextField>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ marginTop: 'auto', marginBottom: '5px' }}
                    onClick={() => {
                      setTokenDialogOpen(true);
                      setTokenModelId(assocModelId);
                      setTokenProviderId(assocProviderId);
                    }}
                    disabled={!assocProviderId}
                  >
                    Add
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button onClick={() => {
                    setAddAssocOpen(false);
                    setAssocModelId('');
                    setAssocProviderId('');
                    setAssocProviderModel('');
                    setAssocTokenId('');
                  }}>Cancel</Button>
                  <Button
                    onClick={handleAddAssociation}
                    variant="contained"
                    disabled={!assocModelId || !assocProviderId || !assocProviderModel || !assocTokenId}
                    sx={{
                      backgroundImage: 'none',
                      backgroundColor: 'primary.main',
                      '&:hover': {
                        backgroundImage: 'none',
                        backgroundColor: 'primary.light',
                      },
                    }}
                  >
                    Save Association
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Box>}
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!name || !prompt || isCreating}
          sx={{
            backgroundImage: 'none',
            backgroundColor: 'primary.main',
            '&:hover': {
              backgroundImage: 'none',
              backgroundColor: 'primary.light',
            },
          }}
        >
          {isCreating ? 'Creating...' : 'Create Evaluator'}
        </Button>
        {errorMsg && (
          <Typography color="error" sx={{ mt: 1 }}>
            {errorMsg}
          </Typography>
        )}
      </Stack>
      <Dialog open={metricDialogOpen} onClose={() => setMetricDialogOpen(false)}>
        <DialogTitle>Create New Metric</DialogTitle>
        <DialogContent>
          <TextField
            label="Metric Name"
            value={newMetricName}
            onChange={e => setNewMetricName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description"
            value={newMetricDescription}
            onChange={e => setNewMetricDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetricDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateMetric} disabled={!newMetricName || creatingMetric} variant="contained">
            {creatingMetric ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={tokenDialogOpen} onClose={() => setTokenDialogOpen(false)}>
        <DialogTitle>Create New Token</DialogTitle>
        <DialogContent>
          <TextField
            label="Token Name"
            value={newTokenName}
            onChange={e => setNewTokenName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Token Value"
            value={newTokenValue}
            onChange={e => setNewTokenValue(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTokenDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateToken} disabled={!newTokenName || !newTokenValue || creatingToken} variant="contained">
            {creatingToken ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
} 