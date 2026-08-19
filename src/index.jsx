import React from "react";
import { createRoot } from "react-dom/client";
import { applyVocab } from "./vocab.js";
import App from "./app.jsx";

applyVocab(); // 저장된 커스텀 어휘를 문장 데이터에 반영한 뒤 렌더
createRoot(document.getElementById("root")).render(<App />);
