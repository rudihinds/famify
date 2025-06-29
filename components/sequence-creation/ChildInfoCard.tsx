import React from 'react';
import { View, Text, Image } from 'react-native';
import { User } from 'lucide-react-native';

interface ChildInfoCardProps {
  child: {
    id: string;
    name: string;
    age: number;
    avatar_url?: string;
  };
}

const ChildInfoCard: React.FC<ChildInfoCardProps> = ({ child }) => {
  return (
    <View className="flex-row items-center">
      {/* Avatar */}
      <View className="mr-3">
        {child.avatar_url ? (
          <Image 
            source={{ uri: child.avatar_url }} 
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center">
            <User size={24} color="#6366f1" />
          </View>
        )}
      </View>
      
      {/* Info */}
      <View>
        <Text className="text-base font-semibold text-gray-900">{child.name}</Text>
        <Text className="text-sm text-gray-500">Age {child.age}</Text>
      </View>
    </View>
  );
};

export default ChildInfoCard;