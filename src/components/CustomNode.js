import React from "react";
import "./Diagram.css"; // ensure styles are available

export default function CustomNode({ data, id }) {
  const { label, desc, onDelete } = data || {};

  return (
    <div className="custom-node">
      <div className="custom-node-left" />
      <div className="custom-node-body">
        <div className="custom-node-header">
          <div className="custom-node-label">{label}</div>

          {onDelete && (
            <button
              className="node-cancel-btn"
              onClick={(e) => {
                e.stopPropagation(); // prevent selecting / dragging the node
                if (typeof onDelete === "function") onDelete(id);
              }}
              title="Delete node"
            >
              <span className="cancel-icon">✕</span>
            </button>
          )}
        </div>

        {desc ? <div className="custom-node-desc">{desc}</div> : null}
      </div>
    </div>
  );
}
