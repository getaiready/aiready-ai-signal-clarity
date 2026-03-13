'use client';

import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  MarkerType,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';

const nodeStyles = {
  agent:
    'px-4 py-2 shadow-md rounded-sm bg-black border border-cyber-purple/40 text-white font-mono text-[10px] uppercase tracking-widest',
  bus: 'px-6 py-3 shadow-lg rounded-sm bg-cyber-purple/10 border-2 border-cyber-purple text-white font-black font-mono text-[12px] uppercase tracking-[0.3em]',
  event:
    'px-3 py-1 shadow-sm rounded-full bg-white/5 border border-white/10 text-zinc-400 font-mono text-[8px] uppercase tracking-tighter',
};

interface SystemFlowProps {
  nodes: Node[];
  edges: Edge[];
  height?: string;
}

export default function SystemFlow({
  nodes,
  edges,
  height = '400px',
}: SystemFlowProps) {
  const defaultEdgeOptions = {
    animated: true,
    style: { stroke: '#bc00ff', strokeWidth: 1 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#bc00ff',
    },
  };

  const styledNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        className:
          node.data?.type === 'bus'
            ? nodeStyles.bus
            : node.data?.type === 'event'
              ? nodeStyles.event
              : nodeStyles.agent,
        style: { ...node.style, background: 'transparent', border: 'none' },
      })),
    [nodes]
  );

  return (
    <div
      style={{ height }}
      className="w-full glass-card border-white/5 overflow-hidden my-12"
    >
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={false}
        zoomOnScroll={false}
      >
        <Background color="#333" gap={20} />
        <Controls
          showInteractive={false}
          className="opacity-20 hover:opacity-100 transition-opacity"
        />
      </ReactFlow>
    </div>
  );
}
