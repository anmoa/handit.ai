/**
 * @fileoverview TracingPage component for displaying agent tracing information
 * Provides a page layout for viewing agent execution traces and details
 */

'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useGetAgentByIdQuery,
} from '@/services/agentsService';
import { Box, Card, Stack } from '@mui/material';

import { TracingTable } from '@/components/dashboard/agents/tracing-table';

/**
 * TracingPage component for displaying agent tracing information
 * @component
 * @returns {JSX.Element} Rendered page component
 * 
 * @description
 * This component provides:
 * - Agent tracing information display
 * - Integration with RTK Query for data fetching
 * - Responsive layout with Material-UI
 * - Loading state management
 * - URL parameter handling for agent selection
 */
export default function TracingPage() {
  // Get agent ID from URL parameters
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agentId');

  // Fetch agent details using RTK Query
  const { data: agentDetails, isLoading: isLoadingDetails } = useGetAgentByIdQuery(agentId, {
    skip: !agentId,
  });

  // Combine loading states
  const isLoading = isLoadingDetails;

  return (
    <Box
      sx={{
        m: 'var(--Content-margin)',
        p: 'var(--Content-padding)',
        pb: 0,
        width: 'var(--Content-width)',
      }}
    >
      <Stack spacing={4} sx={{ mt: 2, mr: 0, ml: 2 }}>
        {/* Tracing table component */}
        <TracingTable
          isLoading={isLoading}
          agentId={agentId}
          agentDetails={agentDetails}
        />
      </Stack>
    </Box>
  );
} 