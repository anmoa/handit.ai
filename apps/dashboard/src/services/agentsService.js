/**
 * @fileoverview Agents API service
 * Provides RTK Query endpoints for agent management and monitoring
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithSandbox } from './baseQuery';
import { fetchBaseQuery } from '@reduxjs/toolkit/query';

/**
 * Gets current environment parameters
 * @function
 * @returns {Object} Environment parameters
 * @property {string} environment - Current environment ('production' or custom)
 * 
 * @description
 * Retrieves environment settings from localStorage if available,
 * falls back to 'production' if not set or in server context
 */
const getEnvironmentParams = () => {
  if (typeof window !== 'undefined') {
    const environment = localStorage.getItem('environment') || 'production';
    return { environment };
  }
  return { environment: 'production' };
};

/**
 * RTK Query API for agent management
 * @type {Object}
 * 
 * @description
 * This API provides endpoints for:
 * - Agent CRUD operations
 * - Node and connection management
 * - Metrics and insights retrieval
 * - Entry management and flow analysis
 * - Agent cloning and upload
 */
export const agentsApi = createApi({
  reducerPath: 'agentsApi',
  baseQuery: baseQueryWithSandbox,
  tagTypes: ['agents', 'metrics', 'insights', 'entries'],
  endpoints: (builder) => ({
    /**
     * Get all agents
     * @type {QueryEndpoint}
     */
    getAgents: builder.query({
      query: ({ tourAgent = false } = {}) => ({
        url: 'agents',
        params: {
          ...getEnvironmentParams(),
          ...(tourAgent && { tourAgent: 'true' }),
        },
      }),
      providesTags: ['agents'],
    }),

    /**
     * Get agent by ID
     * @type {QueryEndpoint}
     */
    getAgentById: builder.query({
      query: (id) => ({
        url: `agents/${id}`,
        params: getEnvironmentParams(),
      }),
      providesTags: ['agents'],
    }),

    /**
     * Create new agent
     * @type {MutationEndpoint}
     */
    createAgent: builder.mutation({
      query: (data) => ({
        url: 'agents',
        method: 'POST',
        body: data,
        params: getEnvironmentParams(),
      }),
      invalidatesTags: ['agents'],
    }),

    /**
     * Update existing agent
     * @type {MutationEndpoint}
     */
    updateAgent: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `agents/${id}`,
        method: 'PUT',
        body: data,
        params: getEnvironmentParams(),
      }),
      invalidatesTags: ['agents'],
    }),

    /**
     * Create agent node
     * @type {MutationEndpoint}
     */
    createAgentNode: builder.mutation({
      query: (data) => ({
        url: 'agents/nodes',
        method: 'POST',
        body: data,
        params: getEnvironmentParams(),
      }),
      invalidatesTags: ['agents'],
    }),

    /**
     * Create agent connection
     * @type {MutationEndpoint}
     */
    createAgentConnection: builder.mutation({
      query: (data) => ({
        url: 'agents/connections',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['agents'],
    }),

    /**
     * Get agent metrics
     * @type {QueryEndpoint}
     */
    getAgentMetrics: builder.query({
      query: (agentId) => ({
        url: `agents/${agentId}/metrics`,
        params: getEnvironmentParams(),
      }),
      providesTags: (result, error, agentId) => [{ type: 'metrics', id: agentId }],
    }),

    /**
     * Get agent correct entries
     * @type {QueryEndpoint}
     */
    getAgentCorrectEntries: builder.query({
      query: (agentId) => ({
        url: `agents/${agentId}/correct-entries`,
        params: getEnvironmentParams(),
      }),
    }),

    /**
     * Get agent insights
     * @type {QueryEndpoint}
     */
    getAgentInsights: builder.query({
      query: (agentId) => ({
        url: `agents/${agentId}/insights`,
      }),
      providesTags: (result, error, agentId) => [{ type: 'insights', id: agentId }],
    }),

    /**
     * Get agent entries with chunked response handling
     * @type {QueryEndpoint}
     */
    getAgentEntries: builder.query({
      query: ({ agentId, ...params }) => ({
        url: `agents/${agentId}/entries`,
        params: {
          ...params,
          ...getEnvironmentParams(),
        },
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'chunked'
        },
        responseHandler: async (response) => {
          const reader = response.body.getReader();
          let result = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += new TextDecoder().decode(value);
          }

          return JSON.parse(result);
        }
      }),
      providesTags: (result, error, { agentId, ...params }) => [{ type: 'entries', id: agentId, ...params }],
    }),

    /**
     * Get single agent entry
     * @type {QueryEndpoint}
     */
    getAgentEntry: builder.query({
      query: ({ agentId, entryId }) => ({
        url: `agents/${agentId}/entries/${entryId}`,
      }),
      providesTags: (result, error, { agentId, entryId }) => [
        { type: 'entries', id: `${agentId}-${entryId}` }
      ],
    }),

    /**
     * Get node metrics
     * @type {QueryEndpoint}
     */
    getNodeMetrics: builder.query({
      query: ({ agentId, nodeId }) => ({
        url: `agents/${agentId}/nodes/${nodeId}/metrics`,
      }),
      providesTags: (result, error, { agentId, nodeId }) => [
        { type: 'metrics', id: `${agentId}-${nodeId}` }
      ],
    }),

    /**
     * Get node insights
     * @type {QueryEndpoint}
     */
    getNodeInsights: builder.query({
      query: ({ agentId, nodeId }) => ({
        url: `agents/${agentId}/nodes/${nodeId}/insights`,
      }),
      providesTags: (result, error, { agentId, nodeId }) => [
        { type: 'insights', id: `${agentId}-${nodeId}` }
      ],
    }),

    /**
     * Get node entries
     * @type {QueryEndpoint}
     */
    getNodeEntries: builder.query({
      query: ({ agentId, nodeId, ...params }) => ({
        url: `agents/${agentId}/nodes/${nodeId}/entries`,
        params,
      }),
      providesTags: (result, error, { agentId, nodeId }) => [
        { type: 'entries', id: `${agentId}-${nodeId}` }
      ],
    }),

    /**
     * Update agent node
     * @type {MutationEndpoint}
     */
    updateAgentNode: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `agents/nodes/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['agents'],
    }),

    /**
     * Delete agent node
     * @type {MutationEndpoint}
     */
    deleteAgentNode: builder.mutation({
      query: (id) => ({
        url: `agents/nodes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['agents'],
    }),

    /**
     * Delete agent connection
     * @type {MutationEndpoint}
     */
    deleteAgentConnection: builder.mutation({
      query: (id) => ({
        url: `agents/connections/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['agents'],
    }),

    /**
     * Get agent metrics comparison for last month
     * @type {QueryEndpoint}
     */
    getAgentMetricsComparisonLastMonth: builder.query({
      query: (agentId) => ({
        url: `agents/${agentId}/comparison-metrics-last-month`,
      }),
    }),

    /**
     * Get entry flow with chunked response handling
     * @type {QueryEndpoint}
     */
    getEntryFlow: builder.query({
      query: ({ entryId, agentId, mockFail = false }) => ({
        url: `agents/${agentId}/entries/${entryId}/flow`,
        params: { mockFail },
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'chunked'
        },
        responseHandler: async (response) => {
          const reader = response.body.getReader();
          let result = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += new TextDecoder().decode(value);
          }

          return JSON.parse(result);
        }
      }),
    }),

    /**
     * Clone existing agent
     * @type {MutationEndpoint}
     */
    cloneAgent: builder.mutation({
      query: (agentId) => ({
        url: `/agents/${agentId}/clone`,
        method: 'POST',
        params: getEnvironmentParams(),
      }),
      invalidatesTags: ['agents'],
    }),

    /**
     * Get agent entry detail with chunked response handling
     * @type {QueryEndpoint}
     */
    getAgentEntryDetail: builder.query({
      query: ({ agentId, entryId }) => ({
        url: `agents/${agentId}/entries/${entryId}`,
        params: getEnvironmentParams(),
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'chunked'
        },
        responseHandler: async (response) => {
          const reader = response.body.getReader();
          let result = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += new TextDecoder().decode(value);
          }

          return JSON.parse(result);
        }
      }),
      providesTags: (result, error, { agentId, entryId }) => [
        { type: 'entries', id: `${agentId}-${entryId}-detail` }
      ],
    }),

    /**
     * Upload agent file
     * @type {MutationEndpoint}
     */
    uploadAgent: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);

        return {
          url: 'agents/upload',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['agents'],
    }),
  }),
});

// Export generated hooks
export const {
  useGetAgentsQuery,
  useGetAgentByIdQuery,
  useCreateAgentMutation,
  useUpdateAgentMutation,
  useCreateAgentNodeMutation,
  useCreateAgentConnectionMutation,
  // Monitoring hooks
  useGetAgentMetricsQuery,
  useGetAgentInsightsQuery,
  useGetAgentEntriesQuery,
  useGetAgentEntryQuery,
  useGetNodeMetricsQuery,
  useGetNodeInsightsQuery,
  useGetNodeEntriesQuery,
  useUpdateAgentNodeMutation,
  useDeleteAgentNodeMutation,
  useDeleteAgentConnectionMutation,
  useGetAgentMetricsComparisonLastMonthQuery,
  useGetEntryFlowQuery,
  useCloneAgentMutation,
  useGetAgentEntryDetailQuery,
  useUploadAgentMutation,
  useGetAgentCorrectEntriesQuery,
} = agentsApi;
