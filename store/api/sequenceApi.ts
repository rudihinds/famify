import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '../../lib/supabase';
import type { Sequence, CreateSequenceInput } from '../../types/sequence';

/**
 * RTK Query API for sequence-related operations
 * Provides caching, invalidation, and optimistic updates
 */
export const sequenceApi = createApi({
  reducerPath: 'sequenceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    prepareHeaders: async (headers) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('authorization', `Bearer ${session.access_token}`);
        headers.set('apikey', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '');
      }
      return headers;
    },
  }),
  tagTypes: ['Sequence', 'ActiveSequence'],
  endpoints: (builder) => ({
    /**
     * Get all sequences for a parent
     */
    getSequences: builder.query<Sequence[], string>({
      queryFn: async (parentId) => {
        const { data, error } = await supabase
          .from('sequences')
          .select(`
            *,
            groups (
              id,
              name,
              active_days,
              task_instances (
                id,
                template_id,
                famcoin_value,
                effort_score
              )
            )
          `)
          .eq('parent_id', parentId)
          .order('created_at', { ascending: false });

        if (error) return { error };
        return { data: data || [] };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Sequence' as const, id })),
              { type: 'Sequence', id: 'LIST' },
            ]
          : [{ type: 'Sequence', id: 'LIST' }],
    }),

    /**
     * Get active sequences for multiple children
     */
    getActiveSequencesByChildren: builder.query<Record<string, any>, string[]>({
      queryFn: async (childIds) => {
        if (!childIds.length) return { data: {} };

        const { data, error } = await supabase
          .from('sequences')
          .select(`
            *,
            groups!inner (
              id,
              name,
              active_days,
              task_instances (
                id,
                template_id,
                famcoin_value,
                effort_score,
                task_completions (
                  id,
                  completed_at,
                  approved_at
                )
              )
            )
          `)
          .in('child_id', childIds)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString());

        if (error) return { error };

        // Process data to create map of childId -> sequence
        const sequencesByChild: Record<string, any> = {};
        data?.forEach(sequence => {
          if (sequence.child_id) {
            sequencesByChild[sequence.child_id] = {
              id: sequence.id,
              period: sequence.type,
              startDate: sequence.start_date,
              endDate: sequence.end_date,
              budgetCurrency: sequence.budget_currency,
              budgetFamcoins: sequence.budget_famcoins,
              status: sequence.status,
              totalTasks: sequence.groups.reduce((sum: number, group: any) => 
                sum + group.task_instances.length, 0
              ),
              completedTasks: sequence.groups.reduce((sum: number, group: any) => 
                sum + group.task_instances.filter((task: any) => 
                  task.task_completions?.some((tc: any) => tc.completed_at)
                ).length, 0
              ),
              avgTasksPerDay: Math.ceil(
                sequence.groups.reduce((sum: number, group: any) => 
                  sum + group.task_instances.length, 0
                ) / 7
              ),
              progress: 0 // Calculate based on dates and completions
            };
          }
        });

        return { data: sequencesByChild };
      },
      providesTags: ['ActiveSequence'],
    }),

    /**
     * Get a single sequence for editing
     */
    getSequenceById: builder.query<any, string>({
      queryFn: async (sequenceId) => {
        const { data, error } = await supabase
          .from('sequences')
          .select(`
            *,
            groups (
              id,
              name,
              active_days,
              task_instances (
                id,
                template_id,
                famcoin_value,
                effort_score
              )
            )
          `)
          .eq('id', sequenceId)
          .single();

        if (error) return { error };
        return { data };
      },
      providesTags: (result, error, id) => [{ type: 'Sequence', id }],
    }),

    /**
     * Create a new sequence
     */
    createSequence: builder.mutation<{ sequenceId: string }, CreateSequenceInput>({
      queryFn: async (input) => {
        // This would typically call the sequenceService.createSequence method
        // For now, we'll keep the existing implementation
        const { sequenceService } = await import('../../services/sequenceService');
        try {
          const result = await sequenceService.createSequence(input);
          return { data: result };
        } catch (error) {
          return { error };
        }
      },
      invalidatesTags: [{ type: 'Sequence', id: 'LIST' }, 'ActiveSequence'],
    }),

    /**
     * Update an existing sequence
     */
    updateSequence: builder.mutation<{ sequenceId: string }, { id: string; input: CreateSequenceInput }>({
      queryFn: async ({ id, input }) => {
        const { sequenceService } = await import('../../services/sequenceService');
        try {
          const result = await sequenceService.updateSequence(id, input);
          return { data: result };
        } catch (error) {
          return { error };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Sequence', id },
        { type: 'Sequence', id: 'LIST' },
        'ActiveSequence',
      ],
    }),

    /**
     * Delete a sequence
     */
    deleteSequence: builder.mutation<void, string>({
      queryFn: async (sequenceId) => {
        const { error } = await supabase
          .from('sequences')
          .delete()
          .eq('id', sequenceId);

        if (error) return { error };
        return { data: undefined };
      },
      invalidatesTags: (result, error, id) => [
        { type: 'Sequence', id },
        { type: 'Sequence', id: 'LIST' },
        'ActiveSequence',
      ],
    }),
  }),
});

export const {
  useGetSequencesQuery,
  useGetActiveSequencesByChildrenQuery,
  useGetSequenceByIdQuery,
  useCreateSequenceMutation,
  useUpdateSequenceMutation,
  useDeleteSequenceMutation,
} = sequenceApi;