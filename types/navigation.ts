export type SequenceCreationStackParamList = {
  'select-child': undefined;
  'sequence-settings': undefined;
  'groups-setup': undefined;
  'add-tasks/[groupId]': { groupId: string; groupIndex: number; totalGroups: number };
  'review-create': undefined;
};

// For Expo Router typed navigation
export type SequenceCreationRoute = keyof SequenceCreationStackParamList;