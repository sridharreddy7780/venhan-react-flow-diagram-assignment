import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import NodeForm from "./NodeForm";
import EdgeForm from "./EdgeForm";
import sampleMetadata from "../metadata.json";
import CustomNode from "./CustomNode";
import "./Diagram.css";

const STORAGE_KEY = "dynamic-diagram-flow-v1";
const nodeTypes = { custom: CustomNode };

/**
 * dagre layout helper
 * returns nodes with updated positions
 */
function getDagreLayout(nodes, edges, direction = "LR", nodeWidth = 200, nodeHeight = 80, gap = 40) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: gap, ranksep: gap, marginx: 20, marginy: 20 });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((e) => {
    // dagre uses source->target edges, skip invalid ones
    if (e.source && e.target) g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const nodeWithPos = g.node(n.id);
    // if dagre didn't compute position, keep existing
    if (!nodeWithPos) return n;
    return {
      ...n,
      position: {
        x: nodeWithPos.x - nodeWidth / 2,
        y: nodeWithPos.y - nodeHeight / 2
      }
    };
  });
}

export default function Diagram() {
  return (
    <ReactFlowProvider>
      <FlowInner />
    </ReactFlowProvider>
  );
}

function FlowInner() {
  const rfInstanceRef = useRef(null);
  const containerRef = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [nodeFormOpen, setNodeFormOpen] = useState(false);
  const [edgeFormOpen, setEdgeFormOpen] = useState(false);

  // normalize helpers
  const normalizeNodes = useCallback((rawNodes) => {
    if (!Array.isArray(rawNodes)) return [];
    return rawNodes.map((n, i) => {
      const id = String(n.id ?? `n_missing_${i}`);
      const position = n.position ?? { x: 100 + i * 180, y: 100 + Math.floor(i / 4) * 120 };
      const data = { ...(n.data || {}), label: (n.data?.label ?? n.label ?? id), desc: (n.data?.desc ?? n.desc ?? "") };
      return { ...n, id, position, data, type: n.type ?? "custom" };
    });
  }, []);

  const normalizeEdges = useCallback((rawEdges) => {
    if (!Array.isArray(rawEdges)) return [];
    return rawEdges.map((e, i) => ({
      ...e,
      id: String(e.id ?? `e_missing_${i}`),
      animated: typeof e.animated === "boolean" ? e.animated : true,
      markerEnd: { type: "arrowclosed" },
      style: { strokeWidth: 2, stroke: e.style?.stroke ?? "#4f44c3ff" }
    }));
  }, []);

  // apply dagre layout given current container width -> dynamic node sizes
  const applyAutoLayout = useCallback((rawNodes, rawEdges) => {
    // pick container to estimate node width
    const container = containerRef.current;
    const containerWidth = container ? container.clientWidth : 1000;
    // compute node width heuristic (min 140, max 260)
    const nodeWidth = Math.max(140, Math.min(260, Math.floor(containerWidth / 5)));
    const nodeHeight = 80;
    const direction = containerWidth < 600 ? "TB" : "LR";
    try {
      const layouted = getDagreLayout(rawNodes, rawEdges, direction, nodeWidth, nodeHeight, 40);
      // return layouted nodes (positions updated)
      return layouted;
    } catch (err) {
      console.warn("dagre layout failed:", err);
      return rawNodes;
    }
  }, []);

  // Initial load: from localStorage or sample -> normalize -> layout -> set
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const n = normalizeNodes(parsed.nodes);
        const ed = normalizeEdges(parsed.edges);
        if (n.length || ed.length) {
          const layouted = applyAutoLayout(n, ed);
          // ensure data stays same but with positions
          setNodes(layouted);
          setEdges(ed);
          // fit view after a tick
          setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.12 }), 120);
          return;
        }
      }
    } catch (err) {
      console.warn("failed to parse saved diagram", err);
    }

    // fallback sample
    const n = normalizeNodes(sampleMetadata.nodes || []);
    const ed = normalizeEdges(sampleMetadata.edges || []);
    const layouted = applyAutoLayout(n, ed);
    setNodes(layouted);
    setEdges(ed);
    setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.12 }), 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  // handlers
  const onConnect = useCallback((connection) => {
    const id = `e${Date.now()}`;
    const newEdge = {
      id,
      source: connection.source,
      target: connection.target,
      animated: true,
      markerEnd: { type: "arrowclosed" },
      style: { strokeWidth: 2, stroke: "#5ba5ebff" },
      label: connection.label || ""
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  const onNodeDoubleClick = useCallback((ev, node) => {
    setSelectedNode(node);
    setNodeFormOpen(true);
  }, []);

  const onEdgeDoubleClick = useCallback((ev, edge) => {
    setSelectedEdge(edge);
    setEdgeFormOpen(true);
  }, []);

  const handleAddNode = useCallback((payload) => {
    const id = `n${Date.now()}`;
    const newNode = {
      id,
      type: "custom",
      position: payload.position || { x: 250, y: 150 },
      data: { label: payload.label || `Node ${nodes.length + 1}`, desc: payload.desc || "" }
    };
    // add then re-layout
    setNodes((nds) => {
      const merged = [...nds, newNode];
      const layouted = applyAutoLayout(merged, edges);
      // ensure onNodesChange won't be stale — return layouted
      return layouted;
    });
    setNodeFormOpen(false);
    // fitView after short delay
    setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.12 }), 150);
  }, [nodes.length, setNodes, edges, applyAutoLayout]);

  const handleUpdateNode = useCallback((id, changes) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...(changes.data || {}) }, position: changes.position ?? n.position } : n)));
    setNodeFormOpen(false);
    setSelectedNode(null);
  }, [setNodes]);

  const handleDeleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setNodeFormOpen(false);
    setSelectedNode(null);
    setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.12 }), 120);
  }, [setNodes, setEdges]);

  const handleUpdateEdge = useCallback((id, changes) => {
    setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, ...changes } : e)));
    setEdgeFormOpen(false);
    setSelectedEdge(null);
  }, [setEdges]);

  const handleDeleteEdge = useCallback((id) => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
    setEdgeFormOpen(false);
    setSelectedEdge(null);
    setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.12 }), 120);
  }, [setEdges]);

  // import metadata -> normalize -> layout -> set
  const importMetadata = useCallback((json) => {
    if (!json) return;
    if (!Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
      alert("Invalid metadata: expected nodes[] and edges[]");
      return;
    }
    const n = normalizeNodes(json.nodes);
    const ed = normalizeEdges(json.edges);
    const layouted = applyAutoLayout(n, ed);
    setNodes(layouted);
    setEdges(ed);
    setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.12 }), 120);
  }, [normalizeNodes, normalizeEdges, applyAutoLayout, setNodes, setEdges]);

  const exportMetadata = useCallback(() => {
    const payload = { nodes, edges };
    const dataStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  // listen to sidebar events
  useEffect(() => {
    const onLoad = (e) => importMetadata(e.detail);
    const onClear = () => {
      setNodes([]);
      setEdges([]);
      localStorage.removeItem(STORAGE_KEY);
    };
    window.addEventListener("load-sample", onLoad);
    window.addEventListener("clear-diagram", onClear);
    return () => {
      window.removeEventListener("load-sample", onLoad);
      window.removeEventListener("clear-diagram", onClear);
    };
  }, [importMetadata]);

  // fit view when node count changes (debounced)
  useEffect(() => {
    if (!rfInstanceRef.current) return;
    const t = setTimeout(() => rfInstanceRef.current.fitView({ padding: 0.12 }), 380);
    return () => clearTimeout(t);
  }, [nodes.length]);

  // ResizeObserver -> when container resizes, relayout & fit
  useEffect(() => {
    const container = containerRef.current || document.querySelector(".diagram-container") || document.querySelector(".canvas-wrapper");
    if (!container) return;
    let timeout = null;
    const ro = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        try {
          const curNodes = nodes.map(n => ({ ...n }));
          const curEdges = edges.map(e => ({ ...e }));
          const layouted = applyAutoLayout(curNodes, curEdges);
          // merge positions into existing nodes (to preserve data)
          setNodes((nds) => nds.map(n => {
            const found = layouted.find(l => l.id === n.id);
            return found ? { ...n, position: found.position } : n;
          }));
          rfInstanceRef.current?.fitView({ padding: 0.12 });
        } catch (err) {
          console.warn("Responsive relayout failed:", err);
        }
      }, 160);
    });
    ro.observe(container);
    return () => { ro.disconnect(); clearTimeout(timeout); };
  }, [nodes.length, edges.length, applyAutoLayout, setNodes]);

  return (
    <div className="canvas-wrapper diagram-container" ref={containerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => { rfInstanceRef.current = instance; }}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ width: "100%", height: "100%" }}
        attributionPosition="bottom-left"
        nodeTypes={nodeTypes}
      >
        <Background color="#f3f6f9" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeColor={(n) => (n.type === "custom" ? "#1f6feb" : "#ddd")} nodeColor={() => "#fff"} nodeBorderRadius={8} />
      </ReactFlow>

      <NodeForm
        open={nodeFormOpen}
        node={selectedNode}
        onClose={() => { setNodeFormOpen(false); setSelectedNode(null); }}
        onAdd={(payload) => handleAddNode(payload)}
        onUpdate={(id, changes) => handleUpdateNode(id, changes)}
        onDelete={(id) => handleDeleteNode(id)}
      />
      <EdgeForm
        open={edgeFormOpen}
        edge={selectedEdge}
        onClose={() => { setEdgeFormOpen(false); setSelectedEdge(null); }}
        onUpdate={(id, changes) => handleUpdateEdge(id, changes)}
        onDelete={(id) => handleDeleteEdge(id)}
      />

      <div className="mini-controls elevated">
        <button className="btn primary add-button" onClick={() => { setNodeFormOpen(true); setSelectedNode(null); }}>
          + Add Node
        </button>
        <button className="btn" onClick={exportMetadata}>Export</button>
        <label className="file-label btn">
          Import
          <input type="file" accept="application/json" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                const parsed = JSON.parse(ev.target.result);
                importMetadata(parsed);
              } catch (err) { alert("Invalid JSON file"); }
            };
            reader.readAsText(f);
            e.target.value = "";
          }} />
        </label>
      </div>
    </div>
  );
}
