'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  Box,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { CaretDown as CaretDownIcon, MagnifyingGlass, X } from '@phosphor-icons/react';

import { parseTitle } from '@/lib/text';

export function AgentSwitch({ onAgentChange, agentId, agents }) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedAgent, setSelectedAgent] = React.useState(null);

  React.useEffect(() => {
    if (agents && !agentId) {
      setSelectedAgent(agents[0]);
      onAgentChange(agents[0]);
    } else if (agents) {
      const foundAgent = agents.find((agent) => agent.id === parseInt(agentId));
      setSelectedAgent(foundAgent);
    }
  }, [agents, agentId, onAgentChange]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const onChange = (agent) => {
    setSelectedAgent(agent);
    onAgentChange(agent);
    handleClose();
  };

  const filteredAgents = agents?.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <React.Fragment>
      {agents && agents.length >= 1 && (
        <Stack
          sx={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'row',
            paddingLeft: '1vh',
            paddingTop: '1vh',
          }}
        >
          <Stack
            direction="row"
            onClick={handleOpen}
            spacing={2}
            sx={{
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <Typography
                  color="var(--Workspaces-name-color)"
                  variant="h5"
                  sx={{ fontWeight: 600, fontSize: '1.4rem' }}
                >
                  {parseTitle(selectedAgent?.name)}
                </Typography>
                <Box
                  sx={{
                    height: '24px',
                    width: '24px',
                    backgroundColor: 'rgba(117, 120, 255, 0.2)',
                    marginLeft: '12px',
                    marginTop: '2px',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CaretDownIcon
                    style={{
                      fontSize: '14px',
                      color: 'var(--mui-palette-primary-main)',
                      fontWeight: 'bold',
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Stack>
        </Stack>
      )}

      <Dialog 
        open={open} 
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Select Agent</Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleClose}
              aria-label="close"
            >
              <X />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agent..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MagnifyingGlass />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {filteredAgents.map((agent) => (
              <ListItem key={agent.id} disablePadding>
                <ListItemButton
                  selected={selectedAgent?.id === agent.id}
                  onClick={() => onChange(agent)}
                  sx={{
                    borderRadius: 1,
                    '&.Mui-selected': {
                      bgcolor: 'primary.lighter',
                      '&:hover': {
                        bgcolor: 'primary.light',
                      },
                    },
                  }}
                >
                  <ListItemText 
                    primary={parseTitle(agent.name)}
                    primaryTypographyProps={{
                      fontWeight: selectedAgent?.id === agent.id ? 600 : 400,
                    }}
      />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
