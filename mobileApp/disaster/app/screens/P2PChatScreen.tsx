import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";

export default function P2PChatScreen() {
  const [myId, setMyId] = useState("rescue-42"); // mock for now
  const [peerId, setPeerId] = useState("");
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Disconnected");

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const connect = () => {
    if (!peerId.trim()) return;
    setStatus(`Connected to ${peerId} ✅`);
  };

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { from: "me", text: input }]);
    setInput("");
  };

  return (
    <View className="flex-1 justify-center items-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <View className="bg-white rounded-2xl p-6 w-full max-w-md shadow border border-gray-200">
        
        {/* Title */}
        <Text className="text-2xl font-bold text-blue-700 mb-4 text-center">
          🚨 P2P Disaster Chat
        </Text>

        {/* My ID */}
        <View className="bg-gray-100 p-3 rounded-lg border border-gray-300 mb-4">
          <Text className="text-gray-700 text-sm text-center">
            Your ID: <Text className="font-mono font-semibold">{myId}</Text>
          </Text>
        </View>

        {/* Peer ID input */}
        <View className="flex-row gap-2 mb-4">
          <TextInput
            placeholder="Enter Peer ID (e.g. rescue-99)"
            value={peerId}
            onChangeText={setPeerId}
            className="flex-1 border p-3 rounded-lg"
          />
          <TouchableOpacity
            onPress={connect}
            className="bg-blue-600 px-4 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">Connect</Text>
          </TouchableOpacity>
        </View>

        {/* Chat box */}
        <View className="h-64 border bg-gray-50 rounded-lg mb-4 p-3">
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View
                className={`flex-row ${
                  item.from === "me" ? "justify-end" : "justify-start"
                }`}
              >
                <Text
                  className={`px-3 py-2 my-1 max-w-[70%] rounded-xl ${
                    item.from === "me"
                      ? "bg-green-500 text-white rounded-br-none"
                      : "bg-white border border-gray-200 rounded-bl-none"
                  }`}
                >
                  {item.text}
                </Text>
              </View>
            )}
          />
        </View>

        {/* Input + Send */}
        <View className="flex-row gap-2">
          <TextInput
            placeholder="Type message..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            className="flex-1 border p-3 rounded-lg"
          />
          <TouchableOpacity
            onPress={send}
            className="bg-green-500 px-5 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">Send</Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <Text className="text-center mt-4 text-sm font-medium">
          Status:{" "}
          <Text className={status.includes("Connected") ? "text-green-600" : "text-red-600"}>
            {status}
          </Text>
        </Text>
      </View>
    </View>
  );
}
