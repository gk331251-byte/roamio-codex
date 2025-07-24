import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { sendMessage, fetchChatStream, validatePremium } from '../lib/api';
import { auth } from '../firebase';

export default function GroupChat({ visible, onClose, groupId }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [premium, setPremium] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsub = fetchChatStream(groupId, setMessages);
    return () => unsub && unsub();
  }, [groupId]);

  useEffect(() => {
    validatePremium().then(r => setPremium(!!r.isPremium)).catch(() => setPremium(false));
  }, []);

  useEffect(() => {
    if (flatRef.current && messages.length) {
      flatRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    const user = auth.currentUser;
    if (!user || !text.trim()) return;
    await sendMessage(groupId, user.uid, user.displayName || user.email || 'anon', text.trim());
    setText('');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        <View className="flex-row justify-between items-center p-2 border-b">
          <Text className="font-semibold text-lg">Group Chat</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-blue-600">Close</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          ref={flatRef}
          className="flex-1 p-2"
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text className="mb-1 text-sm">
              <Text className="font-bold mr-1">{item.senderName}:</Text>
              {item.text}
            </Text>
          )}
        />
        {premium ? (
          <View className="flex-row items-center p-2 border-t">
            <TextInput
              className="flex-1 border rounded px-2 mr-2"
              value={text}
              onChangeText={setText}
            />
            <TouchableOpacity onPress={handleSend} className="bg-blue-600 px-3 py-1 rounded">
              <Text className="text-white">Send</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="p-2 border-t">
            <Text className="text-center text-sm">Upgrade to Quest+ to join the chat</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
