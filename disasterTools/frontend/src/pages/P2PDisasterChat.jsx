import React, { useEffect, useRef, useState } from "react";
import Peer from "peerjs";

// Generate short readable disaster tags
function generateTag() {
  const words = ["rescue", "team", "safe", "camp", "hope", "aid", "alpha", "bravo", "delta"];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(Math.random() * 100);
  return `${randomWord}-${number}`;
}

export default function P2PDisasterChat() {
  const [myId, setMyId] = useState("");
  
  const [peerId, setPeerId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Disconnected");

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const tag = generateTag();
    const peer = new Peer(tag);

    peer.on("open", (id) => setMyId(id));

    peer.on("connection", (conn) => {
      connRef.current = conn;
      setStatus("Connected ✅");
      conn.on("data", (data) =>
        setMessages((m) => [...m, { from: "them", text: data }])
      );
    });

    peerRef.current = peer;
    return () => peer.destroy();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connect = () => {
    if (!peerId || !peerRef.current) return;
    const conn = peerRef.current.connect(peerId);
    connRef.current = conn;

    conn.on("open", () => setStatus("Connected ✅"));
    conn.on("data", (data) =>
      setMessages((m) => [...m, { from: "them", text: data }])
    );
  };

  const send = () => {
    if (connRef.current && input.trim()) {
      connRef.current.send(input);
      setMessages((m) => [...m, { from: "me", text: input }]);
      setInput("");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8 w-full max-w-lg border border-gray-200">
        {/* Title */}
        <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">
          🚨 P2P Disaster Chat
        </h2>

        {/* My ID */}
        <div className="bg-gray-100 p-3 rounded-lg text-center border border-gray-300 mb-4">
          <p className="text-gray-700 text-sm">
            Your ID: <span className="font-mono font-semibold">{myId || "..."}</span>
          </p>
        </div>

        {/* Peer ID Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="border flex-1 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            placeholder="Enter Peer ID (e.g. rescue-42)"
            value={peerId}
            onChange={(e) => setPeerId(e.target.value)}
          />
          <button
            onClick={connect}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md font-medium transition duration-300"
          >
            Connect
          </button>
        </div>

        {/* Chat Box */}
        <div className="h-64 overflow-y-auto border p-3 bg-gray-50 rounded-lg mb-4 shadow-inner">
          {messages.length === 0 && (
            <p className="text-gray-400 text-center">No messages yet...</p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.from === "me" ? "justify-end" : "justify-start"
              }`}
            >
              <span
                className={`px-3 py-2 my-1 max-w-xs break-words rounded-xl shadow ${
                  msg.from === "me"
                    ? "bg-green-500 text-white rounded-br-none"
                    : "bg-white border border-gray-200 rounded-bl-none"
                }`}
              >
                {msg.text}
              </span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input & Send */}
        <div className="flex gap-2">
          <input
            type="text"
            className="border flex-1 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
            placeholder="Type message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button
            onClick={send}
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg shadow-md font-medium transition duration-300"
          >
            Send
          </button>
        </div>

        {/* Status */}
        <div className="text-center mt-4 text-sm font-medium">
          Status:{" "}
          <span
            className={`${
              status.includes("Connected") ? "text-green-600" : "text-red-600"
            }`}
          >
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
