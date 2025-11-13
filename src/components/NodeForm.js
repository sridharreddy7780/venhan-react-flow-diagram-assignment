import React, { useEffect, useState } from "react";

export default function NodeForm({ open, node, onClose, onAdd, onUpdate, onDelete }) {
  const [label, setLabel] = useState("");
  const [desc, setDesc] = useState("");
  const [x, setX] = useState("");
  const [y, setY] = useState("");

  useEffect(() => {
    if (node) {
      setLabel(node.data?.label ?? "");
      setDesc(node.data?.desc ?? "");
      setX(node.position?.x ?? "");
      setY(node.position?.y ?? "");
    } else {
      setLabel("");
      setDesc("");
      setX("");
      setY("");
    }
  }, [node, open]);

  if (!open) return null;

  const isEdit = Boolean(node);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{isEdit ? "Edit Node" : "Add Node"}</h3>
        <div className="form-row">
          <label>Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Position X</label>
          <input value={x} onChange={(e) => setX(e.target.value)} type="number" />
          <label>Y</label>
          <input value={y} onChange={(e) => setY(e.target.value)} type="number" />
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>

          {isEdit ? (
            <>
              <button onClick={() => onDelete(node.id)} className="danger">Delete</button>
              <button onClick={() => onUpdate(node.id, { data: { label, desc }, position: { x: Number(x || node.position.x), y: Number(y || node.position.y) } })}>Save</button>
            </>
          ) : (
            <button onClick={() => onAdd({ label, desc, position: { x: Number(x || 250), y: Number(y || 150) } })}>Add</button>
          )}
        </div>
      </div>
    </div>
  );
}
