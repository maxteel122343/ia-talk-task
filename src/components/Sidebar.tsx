import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { GoalCardData } from '@/types';

interface SidebarProps {
  tasks: GoalCardData[];
}

export const Sidebar = ({ tasks }: SidebarProps) => {
  const today = new Date();
  const nextDays = Array.from({ length: 5 }, (_, i) => addDays(today, i));

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => 
      task.dueDate && isSameDay(new Date(task.dueDate), date)
    );
  };

  return (
    <div className="w-[300px] h-full bg-[#09090b] border-r border-[#27272a] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[#27272a]">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CalendarIcon size={20} className="text-blue-500" />
          Agenda
        </h2>
        <p className="text-xs text-gray-500 mt-1">Your upcoming schedule</p>
      </div>

      {/* Calendar List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {nextDays.map((date, i) => {
          const dayTasks = getTasksForDay(date);
          const isToday = i === 0;

          return (
            <div key={i} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className={cn("text-sm font-medium", isToday ? "text-blue-400" : "text-gray-400")}>
                  {isToday ? "Today" : format(date, 'EEEE')}
                </h3>
                <span className="text-xs text-gray-600">{format(date, 'MMM d')}</span>
              </div>

              {dayTasks.length > 0 ? (
                <div className="space-y-2">
                  {dayTasks.map(task => (
                    <div key={task.id} className="group bg-[#18181b] border border-[#27272a] rounded-lg p-3 hover:border-blue-500/30 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("text-sm text-gray-200 line-clamp-2", task.status === 'done' && "line-through text-gray-500")}>
                          {task.title}
                        </span>
                        {task.priority === 'high' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                        {task.timer && (
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>{Math.floor(task.timer.timeLeft / 60)}m</span>
                          </div>
                        )}
                        {task.subtasks && (
                          <span>• {task.subtasks.filter(t => t.done).length}/{task.subtasks.length} subtasks</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-[#27272a] rounded-lg p-3 text-center">
                  <span className="text-xs text-gray-600">No tasks scheduled</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mini Stats */}
      <div className="p-4 border-t border-[#27272a] bg-[#18181b]/50">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#27272a] rounded-lg p-3">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Focus Time</span>
            <div className="text-lg font-mono font-medium text-white mt-1">2h 15m</div>
          </div>
          <div className="bg-[#27272a] rounded-lg p-3">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Completed</span>
            <div className="text-lg font-mono font-medium text-white mt-1">
              {tasks.filter(t => t.status === 'done').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
