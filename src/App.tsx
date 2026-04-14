import React, { useEffect, useState } from "react";
import './App.css';

// Types
type Chord = {
  position: number;
  chord: string;
};

type Line = {
  text: string;
  chords: Chord[];
};

const CHORDS = ["C", "Cm", "D", "Dm", "E", "Em", "F", "G", "Am"];

const SCALE = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
];

const FLAT_MAP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

function transposeChord(chord: string, step: number) {
  const match = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;

  let [, root, suffix] = match;
  root = FLAT_MAP[root] || root;

  const index = SCALE.indexOf(root);
  if (index === -1) return chord;

  const newIndex = (index + step + 12) % 12;
  return SCALE[newIndex] + suffix;
}

function encodeData(data: Line[]) {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

function decodeData(str: string): Line[] | null {
  try {
    const json = decodeURIComponent(atob(str));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function App() {
  const [rawLyrics, setRawLyrics] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number>(0);

  const [hoveredChord, setHoveredChord] = useState<{
    lineIndex: number;
    chordIndex: number;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");

    if (data) {
      const parsed = decodeData(data);
      if (parsed) setLines(parsed);
    }
  }, []);

  const handleConvert = () => {
    const parsed = rawLyrics.split("\n").map((line) => ({
      text: line,
      chords: [],
    }));
    setLines(parsed);
  };

  const handleClick = (
    e: React.MouseEvent<HTMLDivElement>,
    lineIndex: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const charWidth = 8;
    const position = Math.round(x / charWidth);

    setSelectedLine(lineIndex);
    setSelectedPosition(position);
  };

  const addChord = (chord: string) => {
    if (selectedLine === null) return;

    setLines((prev) => {
      const copy = [...prev];
      copy[selectedLine].chords.push({
        position: selectedPosition,
        chord,
      });
      return copy;
    });
    setSelectedLine(null);
  };

  const removeChord = (lineIndex: number, chordIndex: number) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[lineIndex].chords.splice(chordIndex, 1);
      return copy;
    });
  };

  const transposeAll = (step: number) => {
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        chords: line.chords.map((c) => ({
          ...c,
          chord: transposeChord(c.chord, step),
        })),
      }))
    );
  };

  const exportData = () => {
    const dataStr = JSON.stringify(lines, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "song.json";
    a.click();

    URL.revokeObjectURL(url);
  };

  const generateShareLink = async () => {
    const encoded = encodeData(lines);
    const url = `${window.location.origin}?data=${encoded}`;

    await navigator.clipboard.writeText(url);
    alert("Link kopyalandı! 🚀");
  };

  const renderLine = (line: Line, lineIndex: number) => {
    return (
      <div
        key={lineIndex}
        onClick={(e) => handleClick(e, lineIndex)}
        style={{
          fontFamily: "monospace",
          cursor: "pointer",
          marginBottom: 24,
        }}
      >
        <div style={{ position: "relative", height: 20 }}>
          {line.chords.map((c, chordIndex) => (
            <div
              key={chordIndex}
              style={{
                position: "absolute",
                left: c.position * 8,
                display: "inline-block",
              }}
              onMouseEnter={() =>
                setHoveredChord({ lineIndex, chordIndex })
              }
              onMouseLeave={() => setHoveredChord(null)}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ fontWeight: "bold" }}>{c.chord}</span>

              {hoveredChord &&
                hoveredChord.lineIndex === lineIndex &&
                hoveredChord.chordIndex === chordIndex && (
                  <span
                    onClick={() => removeChord(lineIndex, chordIndex)}
                    style={{
                      marginLeft: 4,
                      color: "red",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    ×
                  </span>
                )}
            </div>
          ))}
        </div>

        <div
          style={{ textAlign: 'left' }}
        >{line.text}</div>
      </div>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Chord Editor</h1>

      <textarea
        placeholder="Şarkı sözlerini buraya yapıştır..."
        value={rawLyrics}
        onChange={(e) => setRawLyrics(e.target.value)}
        style={{ width: "100%", height: 120, marginBottom: 10 }}
      />

      <button onClick={handleConvert}>Satırlara Böl</button>

      <div style={{ marginTop: 10 }}>
        <button onClick={() => transposeAll(-1)}>-1</button>
        <button onClick={() => transposeAll(1)} style={{ marginLeft: 8 }}>
          +1
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={exportData}>Export JSON</button>
        <button onClick={generateShareLink} style={{ marginLeft: 8 }}>
          Link ile paylaş
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        {lines.map((line, i) => renderLine(line, i))}
      </div>

      {selectedLine !== null && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: 20,
            background: "#fff",
            padding: 10,
            border: "1px solid #ccc",
          }}
        >
          <div>Akor seç:</div>
          {CHORDS.map((c) => (
            <button
              key={c}
              onClick={() => addChord(c)}
              style={{ margin: 4 }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
