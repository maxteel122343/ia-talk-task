import { useCallback, useState, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { GoalCardNode } from '@/components/GoalCardNode';
import { AIInterface } from '@/components/AIInterface';
import { Sidebar } from '@/components/Sidebar';
import { model, SYSTEM_INSTRUCTION } from '@/services/ai';
import { GoalCardData } from '@/types';

// Initial nodes for demo
const initialNodes: Node<GoalCardData>[] = [
  {
    id: '1',
    type: 'goalCard',
    position: { x: 250, y: 100 },
    data: {
      id: '1',
      title: 'Launch MVP',
      description: 'Deploy the initial version of the productivity app.',
      status: 'in-progress',
      priority: 'high',
      dueDate: new Date(),
      timer: { active: false, timeLeft: 1500, totalTime: 1500 },
      subtasks: [
        { id: 's1', text: 'Setup project', done: true },
        { id: 's2', text: 'Implement Canvas', done: false },
        { id: 's3', text: 'Connect AI', done: false },
      ]
    },
  },
  {
    id: '2',
    type: 'goalCard',
    position: { x: 600, y: 300 },
    data: {
      id: '2',
      title: 'User Testing',
      description: 'Gather feedback from early adopters.',
      status: 'todo',
      priority: 'medium',
      dueDate: new Date(Date.now() + 86400000), // Tomorrow
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#3b82f6' } },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCameraFrame, setLastCameraFrame] = useState<string | null>(null);

  const nodeTypes = useMemo(() => ({ goalCard: GoalCardNode }), []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3b82f6' } } as Edge, eds)),
    [setEdges],
  );

  // Handle AI Actions
  const handleAIActions = useCallback((actions: any[]) => {
    actions.forEach(action => {
      console.log("Executing action:", action);
      switch (action.type) {
        case 'CREATE_CARD':
          const newNode: Node<GoalCardData> = {
            id: uuidv4(),
            type: 'goalCard',
            position: { x: action.data.x || Math.random() * 500, y: action.data.y || Math.random() * 500 },
            data: {
              id: uuidv4(),
              title: action.data.title,
              description: action.data.description,
              status: 'todo',
              priority: action.data.priority || 'medium',
              dueDate: action.data.dueDate ? new Date(action.data.dueDate) : undefined,
              subtasks: action.data.subtasks || [],
              timer: action.data.timer ? { active: false, timeLeft: action.data.timer * 60, totalTime: action.data.timer * 60 } : undefined
            }
          };
          setNodes((nds) => [...nds, newNode]);
          break;
        
        case 'UPDATE_CARD':
          setNodes((nds) => nds.map(node => {
            if (node.id === action.id) {
              return { ...node, data: { ...node.data, ...action.data } };
            }
            return node;
          }));
          break;

        case 'DELETE_CARD':
          setNodes((nds) => nds.filter(node => node.id !== action.id));
          break;

        case 'CONNECT_CARDS':
          setEdges((eds) => addEdge({ 
            id: `e${action.source}-${action.target}`, 
            source: action.source, 
            target: action.target, 
            animated: true,
            style: { stroke: '#3b82f6' }
          }, eds));
          break;
      }
    });
  }, [setNodes, setEdges]);

  const sendMessageToAI = async (text: string) => {
    if (!model) {
      setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: "AI is not configured (missing API key)." }]);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsProcessing(true);

    try {
      // Prepare context from current canvas state
      const canvasState = JSON.stringify(nodes.map(n => ({ id: n.id, data: n.data, position: n.position })));
      
      const parts: any[] = [
        { text: `Current Canvas State: ${canvasState}` },
        { text: `User Message: ${text}` }
      ];

      // Add image if available (simulating "Vision")
      if (lastCameraFrame) {
         parts.push({
           inlineData: {
             mimeType: "image/jpeg",
             data: lastCameraFrame
           }
         });
         parts.push({ text: "Attached is the current view from my camera. Analyze it for context." });
      }

      const response = await model.generateContent({
        model: "gemini-2.5-flash", // Using standard flash for text+image reasoning
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      const responseText = response.text || "";
      
      // Parse JSON actions if present
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      let cleanText = responseText;

      if (jsonMatch) {
        try {
          const json = JSON.parse(jsonMatch[1]);
          if (json.actions) {
            handleAIActions(json.actions);
          }
          // Remove the JSON block from the chat display
          cleanText = responseText.replace(/```json\n[\s\S]*?\n```/, '').trim();
        } catch (e) {
          console.error("Failed to parse AI actions:", e);
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: cleanText }]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Timer Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((nds) => nds.map(node => {
        if (node.data.timer && node.data.timer.active && node.data.timer.timeLeft > 0) {
          return {
            ...node,
            data: {
              ...node.data,
              timer: {
                ...node.data.timer,
                timeLeft: node.data.timer.timeLeft - 1
              }
            }
          };
        }
        return node;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [setNodes]);

  // Extract tasks for sidebar
  const tasks = useMemo(() => nodes.map(n => n.data), [nodes]);

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar tasks={tasks} />

      {/* Main Canvas Area */}
      <div className="flex-1 relative h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#09090b]"
        >
          <Background color="#27272a" gap={20} size={1} variant={BackgroundVariant.Dots} />
          <Controls className="bg-[#18181b] border-[#27272a] fill-white" />
          <MiniMap 
            className="bg-[#18181b] border-[#27272a]" 
            nodeColor="#3b82f6" 
            maskColor="rgba(0,0,0, 0.6)"
          />
        </ReactFlow>

        {/* AI Interface Overlay */}
        <AIInterface 
          onSendMessage={sendMessageToAI} 
          isProcessing={isProcessing}
          messages={messages}
          onCameraFrame={setLastCameraFrame}
        />
      </div>
    </div>
  );
}
