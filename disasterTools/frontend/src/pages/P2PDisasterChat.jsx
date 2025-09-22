import React, { useEffect, useRef, useState } from "react";
import Peer from "peerjs";

export default function DisasterMessenger() {
  const [myName, setMyName] = useState(localStorage.getItem("myName") || "");
  const [peerInput, setPeerInput] = useState("");
  const [connections, setConnections] = useState({});
  const [messages, setMessages] = useState(() =>
    JSON.parse(localStorage.getItem("chatHistory") || "{}")
  );
  const [activePeer, setActivePeer] = useState(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [showRequestMenu, setShowRequestMenu] = useState(false);

  const peerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Helpers
  const saveMessages = (data) =>
    localStorage.setItem("chatHistory", JSON.stringify(data));
  const savePeers = (peers) =>
    localStorage.setItem("connectedPeers", JSON.stringify(peers));

  // Ask for name
  useEffect(() => {
    if (!myName) {
      const name = prompt("Enter your name (unique ID):", "");
      if (name) {
        const cleanName = name.trim();
        setMyName(cleanName);
        localStorage.setItem("myName", cleanName);
      }
    }
  }, []);

  // Init PeerJS
  useEffect(() => {
    if (!myName) return;

    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    const p = new Peer(myName);

    p.on("open", (id) => {
      console.log("Peer ready:", id);
      setStatus("Ready for connections");

      const savedPeers = JSON.parse(
        localStorage.getItem("connectedPeers") || "[]"
      );
      savedPeers.forEach((pid) => {
        if (!connections[pid]) {
          const conn = p.connect(pid);
          conn.on("open", () => setupConnection(conn));
          conn.on("error", (err) => console.error("Connection error:", err));
        }
      });
    });

    p.on("connection", (conn) => setupConnection(conn));

    p.on("error", (err) => {
      console.error("Peer error:", err);
      if (err.type === "unavailable-id") {
        alert(
          `The ID "${myName}" is already in use. Please choose a different name.`
        );
      }
    });

    peerRef.current = p;
    return () => p.destroy();
  }, [myName]);

  // Setup connection
  const setupConnection = (conn) => {
    const pid = conn.peer;
    setConnections((c) => ({ ...c, [pid]: conn }));
    setMessages((m) => {
      const updated = { ...m, [pid]: m[pid] || [] };
      saveMessages(updated);
      return updated;
    });
    if (!activePeer) setActivePeer(pid);
    setStatus(`Connected to ${pid}`);

    const savedPeers = JSON.parse(
      localStorage.getItem("connectedPeers") || "[]"
    );
    if (!savedPeers.includes(pid)) savePeers([...savedPeers, pid]);

    conn.on("data", (data) => {
      setMessages((m) => {
        const updated = { ...m, [pid]: [...(m[pid] || []), data] };
        saveMessages(updated);
        return updated;
      });
    });

    conn.on("close", () => {
      setConnections((c) => {
        const copy = { ...c };
        delete copy[pid];
        return copy;
      });
      setStatus(`Disconnected from ${pid}`);
    });

    conn.on("error", (err) => console.error("Connection error:", err));
  };

  // Connect to peer
  const connectToPeer = () => {
    if (!peerInput || connections[peerInput]) return;
    const conn = peerRef.current.connect(peerInput.trim());
    conn.on("open", () => setupConnection(conn));
    conn.on("error", (err) =>
      alert(`Failed to connect to ${peerInput}: ${err}`)
    );
    setPeerInput("");
  };

  // Send message
  const send = (text, type = "text") => {
    if (!text || !activePeer) return;
    const packet = { from: myName, text, type };

    // Save locally (mark as "me")
    setMessages((m) => {
      const updated = {
        ...m,
        [activePeer]: [...(m[activePeer] || []), { ...packet, from: "me" }],
      };
      saveMessages(updated);
      return updated;
    });

    // Send to peer
    connections[activePeer]?.send(packet);
    setInput("");
  };

  // Send location
  const sendLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const packet = {
        from: myName,
        type: "location",
        text: `https://www.google.com/maps?q=${latitude},${longitude}`,
      };
      queueOrSend(packet);

      setMessages((m) => {
        const updated = {
          ...m,
          [activePeer]: [...(m[activePeer] || []), { ...packet, from: "me" }],
        };
        saveMessages(updated);
        return updated;
      });
    });
  };

  // Queue or send
  const queueOrSend = (packet) => {
    if (navigator.onLine && connections[activePeer]) {
      connections[activePeer].send(packet);
    } else {
      const offlineQueue = JSON.parse(
        localStorage.getItem("offlineQueue") || "[]"
      );
      localStorage.setItem(
        "offlineQueue",
        JSON.stringify([...offlineQueue, { peer: activePeer, packet }])
      );
    }
  };

  // Retry offline queue
  useEffect(() => {
    const handleOnline = () => {
      const offlineQueue = JSON.parse(
        localStorage.getItem("offlineQueue") || "[]"
      );
      const remaining = [];
      offlineQueue.forEach(({ peer, packet }) => {
        if (connections[peer]) {
          connections[peer].send(packet);
        } else remaining.push({ peer, packet });
      });
      localStorage.setItem("offlineQueue", JSON.stringify(remaining));
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [connections]);

  // Emergency + request
  const emergencyMsgs = [
    { label: "🚨 SOS", text: "🚨 EMERGENCY! Need immediate help!" },
    { label: "💧 Need Water", text: "Need drinking water urgently." },
    { label: "🍞 Need Food", text: "Need food supplies ASAP." },
  ];

  const requestCategories = [
    { label: "💊 Medicine", value: "Medicine" },
    { label: "🥖 Food", value: "Food" },
    { label: "🚰 Water", value: "Water" },
    { label: "🏥 SOS", value: "SOS" },
    { label: "🛏 Shelter", value: "Shelter" },
  ];

  const sendRequest = (category) => {
    if (!activePeer) return;
    const packet = {
      from: myName,
      type: "request",
      category,
      text: `Requesting ${category}`,
    };

    queueOrSend(packet);
    setMessages((m) => {
      const updated = {
        ...m,
        [activePeer]: [...(m[activePeer] || []), { ...packet, from: "me" }],
      };
      saveMessages(updated);
      return updated;
    });

    setShowRequestMenu(false);
  };

  // Change ID
  const refreshId = () => {
    const name = prompt("Enter a new name for this device:", myName || "");
    if (!name) return;
    const newName = name.trim();
    setMyName(newName);
    localStorage.setItem("myName", newName);

    setMessages({});
    saveMessages({});
    setConnections({});
    setActivePeer(null);
    localStorage.removeItem("connectedPeers");
    localStorage.removeItem("offlineQueue");

    setStatus("ID changed, chat reset");
  };

  // Disconnect
  const disconnectAll = () => {
    Object.values(connections).forEach((c) => c.close());
    setConnections({});
    setActivePeer(null);
    setStatus("Disconnected");
    localStorage.removeItem("connectedPeers");
  };

  const peers = Object.keys(connections);
  useEffect(
    () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
    [messages, activePeer]
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <p className="text-sm text-gray-600 mb-1">Your Name (ID):</p>
          <p className="font-mono font-semibold break-all text-blue-700">
            {myName}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => navigator.clipboard.writeText(myName)}
              className="bg-blue-500 text-white px-2 py-1 text-xs rounded"
            >
              Copy
            </button>
            <button
              onClick={refreshId}
              className="bg-yellow-500 text-white px-2 py-1 text-xs rounded"
            >
              Change
            </button>
          </div>
        </div>

        <div className="p-3 border-b flex gap-2">
          <input
            className="flex-1 border rounded p-2 text-sm"
            placeholder="Peer Name"
            value={peerInput}
            onChange={(e) => setPeerInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connectToPeer()}
          />
          <button
            onClick={connectToPeer}
            className="bg-green-500 text-white px-3 rounded text-sm"
          >
            +
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {peers.length === 0 && (
            <p className="text-center text-gray-400 mt-4">No peers yet</p>
          )}
          {peers.map((p) => (
            <button
              key={p}
              onClick={() => setActivePeer(p)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-100 border-b ${
                activePeer === p ? "bg-blue-50 font-medium" : ""
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="p-2 text-xs text-center text-gray-500 border-t">
          Status: {status}
        </div>
        <button
          onClick={disconnectAll}
          className="m-2 bg-red-500 text-white rounded px-2 py-1 text-xs"
        >
          Disconnect All
        </button>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {activePeer ? (
          <>
            <div className="p-4 border-b bg-white font-semibold flex justify-between items-center">
              <span>Chat with {activePeer}</span>
              <div className="flex gap-2">
                <button
                  onClick={sendLocation}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 text-xs rounded"
                >
                  Send Location
                </button>
                {emergencyMsgs.map((e) => (
                  <button
                    key={e.label}
                    onClick={() => send(e.text)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs rounded"
                  >
                    {e.label}
                  </button>
                ))}
                {/* Request Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowRequestMenu((s) => !s)}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 text-xs rounded"
                  >
                    📝 Request
                  </button>
                  {showRequestMenu && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow">
                      {requestCategories.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => sendRequest(cat.value)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
              {(messages[activePeer] || []).map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.from === "me" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-3 py-2 rounded-lg max-w-xs break-words shadow ${
                      m.from === "me"
                        ? "bg-green-500 text-white"
                        : "bg-white border"
                    }`}
                  >
                    {m.type === "request" ? (
                      <div className="p-2 bg-purple-100 border rounded">
                        <p className="font-semibold">{m.category}</p>
                        <p className="text-sm">{m.text}</p>
                        {m.coords && (
                          <a
                            href={`https://www.google.com/maps?q=${m.coords.lat},${m.coords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline text-xs"
                          >
                            📍 View Location
                          </a>
                        )}
                      </div>
                    ) : m.type === "location" ? (
                      m.text ? (
                        <a
                          href={m.text}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          📍 View Location
                        </a>
                      ) : (
                        `📍 Coordinates: ${m.coords.lat}, ${m.coords.lng}`
                      )
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white border-t flex gap-2">
              <input
                className="flex-1 border rounded p-2"
                placeholder="Type message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
              />
              <button
                onClick={() => send(input)}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a peer to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
