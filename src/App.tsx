import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update, get } from "firebase/database";
import "./styles.css";

const firebaseConfig = {
  apiKey: "AIzaSyCcZBhmrpt8f3_oUHOf9eEhJVxlN0O35UE",
  authDomain: "ek-draft.firebaseapp.com",
  databaseURL:
    "https://ek-draft-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ek-draft",
  storageBucket: "ek-draft.firebasestorage.app",
  messagingSenderId: "93514910093",
  appId: "1:93514910093:web:afed5986b04ba02fb615c4",
  measurementId: "G-7XM15GM065",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ELITE_TEAMS = [
  "Manchester City",
  "Arsenal",
  "Liverpool",
  "Chelsea",
  "Manchester Utd",
  "Real Madrid",
  "Barcelona",
  "Atletico Madrid",
  "Girona",
  "Athletic Bilbao",
  "Inter",
  "Milan",
  "Juventus",
  "Napoli",
  "Roma",
  "Bayern Münih",
  "B. Dortmund",
  "B. Leverkusen",
  "RB Leipzig",
  "Stuttgart",
  "PSG",
  "Monaco",
  "Marsilya",
  "Lille",
  "Lyon",
  "Galatasaray",
  "Fenerbahçe",
  "Beşiktaş",
  "Trabzonspor",
  "Başakşehir",
];

const POSITIONS = [
  { id: "GK", name: "Kaleci" },
  { id: "RB", name: "Sağ Bek" },
  { id: "CB1", name: "Stoper (Sağ)" },
  { id: "CB2", name: "Stoper (Sol)" },
  { id: "LB", name: "Sol Bek" },
  { id: "CM1", name: "Orta Saha (Sağ)" },
  { id: "CM2", name: "Orta Saha (Merkez)" },
  { id: "CM3", name: "Orta Saha (Sol)" },
  { id: "RW", name: "Sağ Kanat" },
  { id: "ST", name: "Santrfor" },
  { id: "LW", name: "Sol Kanat" },
];

export default function App() {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [inRoom, setInRoom] = useState(false);

  const [roomData, setRoomData] = useState(null);
  const [localSpinning, setLocalSpinning] = useState(false);
  const [localTeam, setLocalTeam] = useState("ÇARK BEKLENİYOR...");

  const [draftInput, setDraftInput] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("GK");
  const [viewingPlayer, setViewingPlayer] = useState("");

  useEffect(() => {
    if (inRoom && roomId) {
      const roomRef = ref(db, `rooms/${roomId}`);
      onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setRoomData(data);
          if (!viewingPlayer && data.players && data.players.length > 0) {
            setViewingPlayer(data.players[0]);
          }
        }
      });
    }
  }, [inRoom, roomId]);

  useEffect(() => {
    if (roomData?.wheel?.triggerTime) {
      const now = Date.now();
      const diff = now - roomData.wheel.triggerTime;

      if (diff < 3000) {
        setLocalSpinning(true);
        let counter = 0;
        const interval = setInterval(() => {
          setLocalTeam(
            ELITE_TEAMS[Math.floor(Math.random() * ELITE_TEAMS.length)]
          );
          counter++;
          if (counter > 20) {
            clearInterval(interval);
            setLocalSpinning(false);
            setLocalTeam(roomData.wheel.resultTeam);
          }
        }, 100);
        return () => clearInterval(interval);
      } else {
        setLocalTeam(roomData.wheel.resultTeam || "ÇARK BEKLENİYOR...");
      }
    }
  }, [roomData?.wheel?.triggerTime]);

  const createRoom = () => {
    if (!playerName.trim()) return alert("Adını gir kanka!");
    const newRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    set(ref(db, `rooms/${newRoomId}`), {
      status: "lobby",
      host: playerName,
      players: [playerName],
      turnIndex: 0,
      rosters: { [playerName]: {} },
      jokers: { [playerName]: 3 },
      wheel: { triggerTime: null, resultTeam: "" },
    });
    setRoomId(newRoomId);
    setInRoom(true);
  };

  const joinRoom = async () => {
    if (!playerName.trim() || !roomId.trim())
      return alert("Adını ve Oda Kodunu gir!");
    const roomRef = ref(db, `rooms/${roomId.toUpperCase()}`);

    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const currentPlayers = data.players || [];

      if (!currentPlayers.includes(playerName)) {
        update(roomRef, {
          players: [...currentPlayers, playerName],
          [`rosters/${playerName}`]: {},
          [`jokers/${playerName}`]: 3,
        });
      }
      setRoomId(roomId.toUpperCase());
      setInRoom(true);
    } else {
      alert("Kanka böyle bir oda kodu bulunamadı!");
    }
  };

  const startGame = () => {
    update(ref(db, `rooms/${roomId}`), { status: "playing" });
  };

  const spinWheel = () => {
    let finalTeam;
    const currentTeam = roomData?.wheel?.resultTeam;
    do {
      finalTeam = ELITE_TEAMS[Math.floor(Math.random() * ELITE_TEAMS.length)];
    } while (finalTeam === currentTeam);

    update(ref(db, `rooms/${roomId}/wheel`), {
      triggerTime: Date.now(),
      resultTeam: finalTeam,
    });
  };

  const useJoker = () => {
    const myJokers = roomData?.jokers?.[playerName];
    if (myJokers > 0) {
      update(ref(db, `rooms/${roomId}`), {
        [`jokers/${playerName}`]: myJokers - 1,
      });
      spinWheel();
    }
  };

  const addPlayerToPitch = () => {
    if (!draftInput.trim()) return;
    const currentPlayer = roomData.players[roomData.turnIndex];

    if (roomData?.rosters?.[currentPlayer]?.[selectedPosition]) {
      alert("Kanka bu mevki zaten dolu! Lütfen menüden boş bir mevki seç.");
      return;
    }

    update(ref(db, `rooms/${roomId}`), {
      [`rosters/${currentPlayer}/${selectedPosition}`]: {
        name: draftInput,
        team: roomData.wheel.resultTeam,
      },
      turnIndex: (roomData.turnIndex + 1) % roomData.players.length,
      "wheel/resultTeam": "",
      "wheel/triggerTime": null,
    });

    setDraftInput("");
  };

  if (!inRoom) {
    return (
      <div className="container center-all">
        <h1 className="logo-text">
          EK DRAFT <span className="highlight-27">27</span>
        </h1>
        <div className="setup-box glass-panel">
          <input
            type="text"
            placeholder="Senin Adın"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button
            className="btn-gold"
            onClick={createRoom}
            style={{ marginTop: 10, width: "100%" }}
          >
            ODA OLUŞTUR
          </button>

          <div className="divider">VEYA</div>

          <input
            type="text"
            placeholder="Oda Kodu (örn: A1B2C)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button
            className="btn-outline"
            onClick={joinRoom}
            style={{ marginTop: 10, width: "100%" }}
          >
            ODAYA KATIL
          </button>
        </div>
      </div>
    );
  }

  if (roomData?.status === "lobby") {
    return (
      <div className="container center-all">
        <h1 className="logo-text">
          EK DRAFT <span className="highlight-27">27</span>
        </h1>
        <div className="setup-box glass-panel" style={{ marginTop: 20 }}>
          <h2 style={{ marginBottom: 10 }}>
            ODA: <span className="gold-text">{roomId}</span>
          </h2>
          <p style={{ marginBottom: 20, color: "#aaa" }}>
            Arkadaşlarına bu kodu ver, katılsınlar.
          </p>

          <h3>Lobi ({roomData?.players?.length || 1} Kişi)</h3>
          <ul style={{ marginTop: 15 }}>
            {roomData?.players?.map((p, i) => (
              <li key={i} className="lobby-player">
                {p}
              </li>
            ))}
          </ul>

          {roomData.host === playerName ? (
            <button
              className="btn-gold"
              onClick={startGame}
              style={{ marginTop: 25, width: "100%" }}
            >
              DRAFTI BAŞLAT
            </button>
          ) : (
            <p style={{ marginTop: 25, color: "#FFD700", fontStyle: "italic" }}>
              Kurucunun oyunu başlatması bekleniyor...
            </p>
          )}
        </div>
      </div>
    );
  }

  const isMyTurn = roomData?.players[roomData?.turnIndex] === playerName;
  const currentDrafter = roomData?.players[roomData?.turnIndex];
  const myJokers = roomData?.jokers?.[playerName] ?? 3;

  return (
    <div className="container">
      <div className="header glass-panel">
        <h1 className="logo-text" style={{ margin: 0, fontSize: "2.2rem" }}>
          EK DRAFT <span className="highlight-27">27</span>
        </h1>
        <h2 className="turn-indicator">
          SIRA: <span className="gold-text glow-text">{currentDrafter}</span>
        </h2>
      </div>

      <div className="main-content">
        <div className="draft-section">
          <div
            className={`roulette-box glass-panel ${
              localSpinning ? "spinning" : ""
            }`}
          >
            <h3>{localTeam}</h3>
          </div>

          {isMyTurn && !roomData?.wheel?.resultTeam && !localSpinning && (
            <button onClick={spinWheel} className="btn-spin pulse-anim">
              ÇARKI ÇEVİR
            </button>
          )}

          {roomData?.wheel?.resultTeam && !localSpinning && (
            <div className="selection-box glass-panel">
              {isMyTurn ? (
                <>
                  <div className="selection-header">
                    <p>MEVKİ VE OYUNCU SEÇ</p>
                    {myJokers > 0 && (
                      <button className="btn-joker" onClick={useJoker}>
                        🃏 JOKER ({myJokers})
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                  >
                    {POSITIONS.map((pos) => (
                      <option
                        key={pos.id}
                        value={pos.id}
                        disabled={roomData?.rosters?.[playerName]?.[pos.id]}
                      >
                        {pos.name}{" "}
                        {roomData?.rosters?.[playerName]?.[pos.id]
                          ? "(Dolu)"
                          : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Futbolcu Adı..."
                    value={draftInput}
                    onChange={(e) => setDraftInput(e.target.value)}
                  />
                  <button
                    className="btn-gold"
                    onClick={addPlayerToPitch}
                    style={{ marginTop: 10 }}
                  >
                    SAHAYA SÜR
                  </button>
                </>
              ) : (
                <div className="waiting-container">
                  <div className="loader-dot"></div>
                  <p className="waiting-text">
                    {currentDrafter} oyuncu seçiyor...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pitch-section">
          <div className="tabs">
            {roomData?.players?.map((p) => (
              <button
                key={p}
                className={`tab-btn ${viewingPlayer === p ? "active" : ""}`}
                onClick={() => setViewingPlayer(p)}
              >
                {p} Kadrosu
              </button>
            ))}
          </div>

          <div className="pitch">
            <div className="pitch-overlay"></div>
            <div className="pitch-lines"></div>
            {POSITIONS.map((pos) => {
              const player = roomData?.rosters?.[viewingPlayer]?.[pos.id];
              return (
                <div
                  key={pos.id}
                  className={`player-spot spot-${pos.id} ${
                    player ? "filled" : ""
                  }`}
                >
                  <div className="spot-dot"></div>
                  {player ? (
                    <div className="player-card premium-card">
                      <span className="card-name">{player.name}</span>
                      <span className="card-team">{player.team}</span>
                    </div>
                  ) : (
                    <span className="spot-label">{pos.id}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
