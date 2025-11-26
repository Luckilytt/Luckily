import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";
import HostAvatar from "../../components/HostAvatar";
import PlayerCard from "../../components/PlayerCard";
import PhaseBanner from "../../components/PhaseBanner";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export default function GameRoom() {
  const router = useRouter();
  const { roomId } = router.query;

  // ---- 防止 SSR mismatch ----
  const [mounted, setMounted] = useState(false);

  const [socket, setSocket] = useState(null);
  const [phase, setPhase] = useState("DAY");
  const [players, setPlayers] = useState([]);
  const [aiText, setAiText] = useState("等待 AI 主持提示…");

  // ---- 初始化：仅在客户端 ----
  useEffect(() => {
    setMounted(true);

    const s = io(SOCKET_URL, { transports: ["websocket"] });
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // ---- 加入房间 & 监听事件 ----
  useEffect(() => {
    if (!mounted || !socket || !roomId) return;

    socket.emit("join_room", {
      roomId,
      playerId: socket.id,
    });

    const handleGameEvent = (ev) => {
      if (ev.type === "ai_message") {
        setAiText(ev.data.text || ev.data);
      }
      if (ev.type === "phase_change") {
        setPhase(ev.data.phase);
      }
      if (ev.type === "room_state") {
        setPlayers(ev.data.players || []);
      }
    };

    const handleRoomState = (state) => {
      setPlayers(state.players || []);
    };

    socket.on("game_event", handleGameEvent);
    socket.on("room_state", handleRoomState);

    return () => {
      socket.off("game_event", handleGameEvent);
      socket.off("room_state", handleRoomState);
    };
  }, [mounted, socket, roomId]);

  // 防止 SSR mismatch
  if (!mounted) return null;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-[#031018] to-[#00080a]">
      <div className="max-w-6xl mx-auto">
        
        {/* 顶部导航区域 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">游戏中 · 房间 {roomId}</h2>
            <PhaseBanner phase={phase} />
          </div>

          {socket && <HostAvatar socket={socket} />}
        </div>

        {/* 游戏主体 */}
        <div className="rounded-2xl p-6 player-card">
          
          {/* AI 主持文本区 */}
          <div className="text-lg font-semibold mb-3">AI 主持</div>
          <div className="text-gray-300 mb-4 min-h-[60px]">
            {aiText}
          </div>

          {/* 玩家区 */}
          <div className="grid grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => {
              const p = players[i] || {
                id: `empty-${i}`,
                name: "空位",
                speaking: false,
              };

              return (
                <PlayerCard key={p.id} player={p} isSpeaking={p.speaking} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
