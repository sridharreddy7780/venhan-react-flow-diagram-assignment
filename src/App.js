import React, { useEffect } from "react";
import Diagram from "./components/Diagram";
import Sidebar from "./components/Sidebar";
import "./App.css";

export default function App() {
  
  useEffect(() => {
    document.title = "DYNAMIC-DIAGRAM-FLOW";
  }, []);

  return (
    <div className="app-root">
      <Sidebar />
      <Diagram />
    </div>
  );
}
