import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import SoloGame from "./pages/SoloGame.jsx";
import Challenge from "./pages/Challenge.jsx";
import Recovery from "./pages/Recovery.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/"          element={<Home />} />
      <Route path="/solo"      element={<SoloGame />} />
      <Route path="/challenge" element={<Challenge />} />
      <Route path="/recovery"  element={<Recovery />} />
    </Routes>
  </BrowserRouter>
);
