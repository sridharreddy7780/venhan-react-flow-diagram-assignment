import React from "react";
import sampleMetadata from "../metadata.json";

export default function Sidebar() {

  const handleLoadSample = () => {
    // Emit a window event that Diagram listens to — simpler than prop drilling
    window.dispatchEvent(new CustomEvent("load-sample", { detail: sampleMetadata }));
  };

  const handleClear = () => {
    window.dispatchEvent(new CustomEvent("clear-diagram"));
  };

  const handleResetToSample = () => {
    window.dispatchEvent(new CustomEvent("load-sample", { detail: sampleMetadata }));
  };

  return (
    <div className="sidebar">
      <h2>DYNAMIC DIAGRAM</h2>
      <div className="sidebar-actions">
        <button onClick={handleLoadSample}>Load Sample</button>
        <button onClick={handleResetToSample}>Reset</button>
        <button onClick={handleClear}>Clear</button>
      </div>
      <div style={{ marginTop: 12, fontSize: 13 }}>
        <strong>Instructions</strong>
        <ol>
          <li>Double-click a node or edge to edit.</li>
          <li>Drag between nodes to create edges.</li>
          <li>Use Import/Export in the canvas corner.</li>
        </ol>
      </div>
    </div>
  );
}
