import { MouseEvent } from 'react';
import { useReactFlow, Node, NodeProps, Handle, Position } from '@xyflow/react';
import { Clock, CheckCircle2, Circle, MoreHorizontal, Paperclip, Info, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoalCardData } from '@/types';

// Custom Node Component
export const GoalCardNode = ({ data, id, selected }: NodeProps<Node<GoalCardData>>) => {
  const { setNodes } = useReactFlow();
  
  // Timer logic would go here or be lifted up. For UI, we show the state.
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleStatus = (e: MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          const newStatus = node.data.status === 'done' ? 'todo' : 'done';
          return { ...node, data: { ...node.data, status: newStatus } };
        }
        return node;
      })
    );
  };

  const toggleTimer = (e: MouseEvent) => {
    e.stopPropagation();
    // In a real app, this would trigger a global timer manager
    setNodes((nodes) =>
      nodes.map((node) => {
        const n = node as unknown as Node<GoalCardData>;
        const timer = n.data.timer;
        if (n.id === id && timer) {
          return { 
            ...n, 
            data: { 
              ...n.data, 
              timer: { ...timer, active: !timer.active } 
            } 
          };
        }
        return node;
      })
    );
  };

  const priorityColor = {
    low: 'border-l-4 border-l-emerald-500',
    medium: 'border-l-4 border-l-yellow-500',
    high: 'border-l-4 border-l-red-500',
  };

  return (
    <div
      className={cn(
        "group relative w-[280px] bg-[#18181b] rounded-xl border border-[#27272a] shadow-lg transition-all duration-200 overflow-hidden",
        selected ? "ring-2 ring-blue-500 border-transparent" : "hover:border-[#3f3f46]",
        data.priority && priorityColor[data.priority]
      )}
    >
      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn("font-semibold text-sm text-white leading-tight", data.status === 'done' && "line-through text-gray-500")}>
            {data.title}
          </h3>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
              <Paperclip size={14} />
            </button>
            <button className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
              <Info size={14} />
            </button>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-xs text-gray-400 line-clamp-2">{data.description}</p>
        )}

        {/* Subtasks Preview */}
        {data.subtasks && data.subtasks.length > 0 && (
          <div className="space-y-1">
            {data.subtasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-xs text-gray-400">
                <div className={cn("w-1.5 h-1.5 rounded-full", task.done ? "bg-green-500" : "bg-gray-600")} />
                <span className={task.done ? "line-through" : ""}>{task.text}</span>
              </div>
            ))}
            {data.subtasks.length > 3 && (
              <div className="text-[10px] text-gray-500 pl-3.5">
                +{data.subtasks.length - 3} more
              </div>
            )}
          </div>
        )}

        {/* Timer Section */}
        {data.timer && (
          <div className="flex items-center justify-between bg-black/20 rounded-lg p-2 mt-2">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
              <Clock size={12} />
              <span>{formatTime(data.timer.timeLeft)}</span>
            </div>
            <button 
              onClick={toggleTimer}
              className="p-1 hover:bg-white/10 rounded-full text-white transition-colors"
            >
              {data.timer.active ? <Pause size={12} /> : <Play size={12} />}
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <button 
            onClick={toggleStatus}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors",
              data.status === 'done' 
                ? "text-green-400 bg-green-400/10 hover:bg-green-400/20" 
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            {data.status === 'done' ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            <span>{data.status === 'done' ? 'Done' : 'Mark Done'}</span>
          </button>
          
          <button className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/5">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  );
};
