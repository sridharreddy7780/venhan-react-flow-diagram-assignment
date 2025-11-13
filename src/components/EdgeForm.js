import React, { useEffect, useState } from "react";

export default function EdgeForm({ open, edge, onClose, onUpdate, onDelete }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(edge?.label ?? "");
  }, [edge, open]);

  if (!open) return null;

  const isEdit = Boolean(edge);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{isEdit ? "Edit Edge" : "Add Edge"}</h3>
        <div className="form-row">
          <label>Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>

          {isEdit ? (
            <>
              <button onClick={() => onDelete(edge.id)} className="danger">Delete</button>
              <button onClick={() => onUpdate(edge.id, { label })}>Save</button>
            </>
          ) : (
            <button onClick={() => { /* create edges via connect UI — use onConnect from Diagram */ }}>Add</button>
          )}
        </div>
      </div>
    </div>
  );
}
