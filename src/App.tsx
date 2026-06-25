import { useState, useRef, useEffect } from 'react';
import { Database, Server, AlertTriangle, Cpu, CheckCircle2, LayoutTemplate, Lock, Zap, Shield, Info, TrendingUp, Sparkles, Send, User as UserIcon, X, Pencil, History as HistoryIcon, Trophy, Medal, Award, Crown, Star, ChevronDown, ChevronUp, CheckSquare, Loader2 } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, YAxis, ReferenceLine } from 'recharts';
import Markdown from 'react-markdown';
import FutureVision from './components/FutureVision';
import WeeklyReflection from './components/WeeklyReflection';
import WorkspaceConnect from './components/WorkspaceConnect';
import EndOfDaySurvey from './components/EndOfDaySurvey';
import AdaptiveTimingSimulation from './components/AdaptiveTimingSimulation';
import IdentityShiftTracker from './components/IdentityShiftTracker';
import AIPreparation from './components/AIPreparation';
import { getAccessToken } from './lib/firebase';

const PRISMA_CODE = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum VerticalType {
  HEALTH
  WORK
  WEALTH
  RELATIONSHIPS
  GROWTH
}

enum SystemState {
  LOCKED
  ACTIVE
  MAINTAIN
}

model User {
  id               String             @id @default(uuid())
  email            String             @unique
  timezone         String             @default("UTC")
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  systemDefinitions SystemDefinition[]
  systemLogs       SystemLog[]
}

model SystemDefinition {
  id           String       @id @default(uuid())
  userId       String
  user         User         @relation(fields: [userId], references: [id])
  vertical     VerticalType
  name         String
  description  String?
  state        SystemState  @default(LOCKED)
  
  // ACTIVE state: primary focus requirement
  activeGoal   Int          // e.g., 60 minutes
  // MAINTAIN state: minimum viable effort
  maintainGoal Int          // e.g., 10 minutes
  metricUnit   String       // e.g., "minutes", "reps", "dollars"

  currentStreak Int         @default(0)
  longestStreak Int         @default(0)

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  logs         SystemLog[]
  cascadeRules CascadeRule[] @relation("SourceSystem")
  targetRules  CascadeRule[] @relation("TargetSystem")
}

model CascadeRule {
  id               String           @id @default(uuid())
  
  sourceSystemId   String
  sourceSystem     SystemDefinition @relation("SourceSystem", fields: [sourceSystemId], references: [id])
  
  targetSystemId   String
  targetSystem     SystemDefinition @relation("TargetSystem", fields: [targetSystemId], references: [id])

  requiredStreak   Int              // e.g., 14 days
  targetState      SystemState      // e.g., ACTIVE

  isTriggered      Boolean          @default(false)
  createdAt        DateTime         @default(now())
}

model SystemLog {
  id                 String           @id @default(uuid())
  userId             String
  user               User             @relation(fields: [userId], references: [id])
  systemDefinitionId String
  systemDefinition   SystemDefinition @relation(fields: [systemDefinitionId], references: [id])
  
  date               DateTime         @db.Date
  value              Int
  isSuccess          Boolean          
  stateAtLog         SystemState      
  
  createdAt          DateTime         @default(now())

  @@unique([userId, systemDefinitionId, date])
}`;

const NESTJS_CODE = `import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from './prisma.service';

@Injectable()
export class SystemCascadeService {
  private readonly logger = new Logger(SystemCascadeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('system-cascade') private readonly cascadeQueue: Queue,
  ) {}

  /**
   * Called dynamically when a user logs an activity or daily via cron.
   */
  async evaluateCascadeRules(userId: string, systemId: string): Promise<void> {
    const system = await this.prisma.systemDefinition.findUnique({
      where: { id: systemId },
      include: { cascadeRules: { where: { isTriggered: false } } },
    });

    if (!system || system.cascadeRules.length === 0) return;

    for (const rule of system.cascadeRules) {
      if (system.currentStreak >= rule.requiredStreak) {
        // Enqueue a job to handle state transition asynchronously
        await this.cascadeQueue.add('trigger-cascade', {
          ruleId: rule.id,
          userId,
          sourceSystemId: systemId,
          targetSystemId: rule.targetSystemId,
          targetState: rule.targetState,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        });
      }
    }
  }

  /**
   * Worker processor logic for state transitions.
   */
  async processCascadeTransition(jobData: any): Promise<void> {
    const { ruleId, targetSystemId, targetState, sourceSystemId } = jobData;

    await this.prisma.$transaction(async (tx) => {
      await tx.cascadeRule.update({
        where: { id: ruleId },
        data: { isTriggered: true },
      });

      // Unlock/Activate the new target system
      await tx.systemDefinition.update({
        where: { id: targetSystemId },
        data: { state: targetState },
      });

      // Demote source system to MAINTAIN to prevent cognitive overload
      await tx.systemDefinition.update({
        where: { id: sourceSystemId },
        data: { state: 'MAINTAIN' },
      });
      
      this.logger.log(\`Cascaded system \${sourceSystemId} to \${targetSystemId}\`);
    });

    // Trigger notification (adaptive timing logic elsewhere)
    // await this.notificationQueue.add('send-cascade-notification', { userId, targetSystemId });
  }
}`;

const MOCK_SYSTEMS = [
  { 
    id: 1, 
    name: 'Health & Fitness', 
    vertical: 'HEALTH', 
    state: 'ACTIVE', 
    progress: 12, 
    required: 14, 
    metric: '60 mins/day', 
    criteria: 'Requires a 14-day continuous streak to trigger a cascade, which will unlock the Wealth system and demote this to Maintain.',
    trend: '+8.4%',
    todayCompleted: false,
    history: Array.from({length: 30}, (_, i) => {
      const val = i < 28 ? Math.floor(Math.random() * 30) + 60 : 0;
      return { 
        day: i + 1, 
        value: val,
        note: val > 0 ? `Completed ${val} mins of intense workout. ${val > 80 ? 'Felt great, pushed the limits today!' : 'Solid session.'}` : 'Rest day.'
      };
    }),
    microHabits: [
      { name: 'Put on workout clothes', trigger: 'After morning coffee', minThreshold: 'Immediate action' },
      { name: 'Dynamic stretch routine', trigger: 'Arriving at gym/mat', minThreshold: '5 mins' },
      { name: 'Core exercises', trigger: 'After main workout', minThreshold: '10 mins' }
    ]
  },
  { 
    id: 2, 
    name: 'Financial Growth', 
    vertical: 'WEALTH', 
    state: 'LOCKED', 
    progress: 0, 
    required: 14, 
    prerequisite: 'Health (14d Streak)', 
    metric: 'N/A', 
    todayCompleted: false,
    criteria: 'Currently locked. Will automatically unlock and become ACTIVE when the Health system reaches its 14-day streak milestone.',
    history: [],
    microHabits: [
      { name: 'Review daily expenses', trigger: 'After dinner', minThreshold: 'Log 1 item' },
      { name: 'Transfer to savings', trigger: 'Payday morning', minThreshold: '10% of income' }
    ]
  },
  { 
    id: 3, 
    name: 'Deep Work Focus', 
    vertical: 'WORK', 
    state: 'MAINTAIN', 
    progress: 45, 
    required: 0, 
    metric: '15 mins/day', 
    todayCompleted: true,
    criteria: 'Previously active. Now requires only 15 mins/day of minimum viable effort to prevent streak decay. Does not block other cascades.',
    history: [],
    microHabits: [
      { name: 'Clear desk', trigger: 'Starting work block', minThreshold: '1 min' },
      { name: 'Close email/slack tabs', trigger: 'Before deep work timer', minThreshold: 'Complete immediately' }
    ]
  },
  { 
    id: 4, 
    name: 'Reading Habit', 
    vertical: 'GROWTH', 
    state: 'MAINTAIN', 
    progress: 12, 
    required: 0, 
    metric: '10 pages/day', 
    todayCompleted: false,
    criteria: 'Baseline habit established. Read a minimum of 10 pages daily to maintain mental growth.',
    history: [],
    microHabits: [
      { name: 'Place book on pillow', trigger: 'Making bed in morning', minThreshold: 'Immediate action' },
      { name: 'Read 1 page', trigger: 'Getting into bed', minThreshold: '1 page' }
    ]
  },
];

function StatusBadge({ state, criteria }: { state: string, criteria: string }) {
  let colorClass = '';
  let Icon = Lock;
  let label = '';

  switch (state) {
    case 'LOCKED':
      colorClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      Icon = Lock;
      label = 'LOCKED';
      break;
    case 'ACTIVE':
      colorClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      Icon = Zap;
      label = 'ACTIVE';
      break;
    case 'MAINTAIN':
      colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      Icon = Shield;
      label = 'MAINTAIN';
      break;
  }

  return (
    <div className="group relative inline-flex items-center justify-center">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider border ${colorClass} cursor-help transition-colors hover:bg-white/5`}>
        <Icon className="w-3 h-3" />
        {label}
        <Info className="w-3.5 h-3.5 ml-0.5 opacity-60" />
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-[#131316] text-xs text-slate-300 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-2xl translate-y-1 group-hover:translate-y-0">
        <div className="font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" /> Progression Criteria
        </div>
        <p className="leading-relaxed text-slate-400">{criteria}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-white/10"></div>
        <div className="absolute top-[calc(100%-1px)] left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#131316]"></div>
      </div>
    </div>
  );
}

function LogProgressModal({ sys, onClose }: { sys: typeof MOCK_SYSTEMS[0], onClose: (success: boolean) => void }) {
  const [value, setValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const recentHistory = sys.history ? sys.history.slice(-5).reverse() : [];
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [isTasksLoading, setIsTasksLoading] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      const token = await getAccessToken();
      if (!token) return;
      setIsTasksLoading(true);
      try {
        const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const listsData = await listsRes.json();
        
        if (listsData.items && listsData.items.length > 0) {
          const firstListId = listsData.items[0].id;
          const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${firstListId}/tasks?showCompleted=false`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const tasksData = await tasksRes.json();
          if (tasksData.items) {
            setTasks(tasksData.items.map((t: any) => ({ ...t, listId: firstListId })));
          }
        }
      } catch (e) {
        console.error('Error fetching tasks:', e);
      } finally {
        setIsTasksLoading(false);
      }
    };
    fetchTasks();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedTask) {
      const taskObj = tasks.find(t => t.id === selectedTask);
      if (taskObj) {
        const token = await getAccessToken();
        if (token) {
          try {
            await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskObj.listId}/tasks/${taskObj.id}`, {
              method: 'PATCH',
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status: 'completed' })
            });
            console.log('Task completed in Google Tasks');
          } catch (error) {
            console.error('Failed to complete task:', error);
          }
        }
      }
    }

    // In a real app, this would dispatch to the API/BullMQ
    console.log(`Logged ${value} for ${sys.name}`);
    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131316] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
        <button onClick={() => onClose(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-between mb-1 pr-8">
          <h3 className="text-xl font-semibold text-slate-100">Log Progress</h3>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            title="Toggle History"
          >
            <HistoryIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-6">Enter your daily metric for <span className="text-slate-200 font-medium">{sys.name}</span>.</p>
        
        {showHistory && recentHistory.length > 0 && (
          <div className="mb-6 bg-black/20 rounded-xl p-4 border border-white/5">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Recent Logs</h4>
            <div className="space-y-2">
              {recentHistory.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Day {entry.day}</span>
                  <span className="font-mono text-slate-200">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Metric ({sys.metric})</label>
            <div className="relative">
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-lg"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
              <CheckSquare className="w-3.5 h-3.5" /> Link to Google Task
              {isTasksLoading && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
            </label>
            <div className="relative">
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-slate-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none"
              >
                <option value="">Do not link a task</option>
                {tasks.map(task => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">Selecting a task will automatically mark it as completed in Google Tasks when you submit.</p>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl py-3 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Submit & Evaluate
          </button>
        </form>
      </div>
    </div>
  );
}

function MaintainSummary() {
  const maintainSystems = MOCK_SYSTEMS.filter(s => s.state === 'MAINTAIN');
  const completed = maintainSystems.filter(s => s.todayCompleted).length;
  const total = maintainSystems.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mb-8 p-6 rounded-2xl bg-[#131316] border border-white/10 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Daily Baseline Health
          </h3>
          <p className="text-sm text-slate-400 mt-1">Your progress toward today's minimum viable effort goals.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-medium text-slate-200">{completed}<span className="text-slate-500 text-xl">/{total}</span></div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Completed</div>
        </div>
      </div>
      
      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MilestoneBadges() {
  const BADGES = [
    { id: 1, title: 'Consistency King', description: 'Maintained an active streak for 30 consecutive days.', icon: <Crown className="w-6 h-6 text-yellow-400" />, unlocked: true, date: '2 days ago' },
    { id: 2, title: 'Cascade Initiator', description: 'Unlocked your first system via a cascade milestone.', icon: <Zap className="w-6 h-6 text-indigo-400" />, unlocked: true, date: '12 days ago' },
    { id: 3, title: 'Iron Will', description: 'Logged progress on a day when you were tracking behind.', icon: <Shield className="w-6 h-6 text-emerald-400" />, unlocked: true, date: '1 month ago' },
    { id: 4, title: 'System Architect', description: 'Build and maintain 5 concurrent active systems.', icon: <Trophy className="w-6 h-6 text-slate-600" />, unlocked: false, date: null },
    { id: 5, title: 'Year of Focus', description: 'Log progress consistently for 365 days.', icon: <Star className="w-6 h-6 text-slate-600" />, unlocked: false, date: null },
  ];

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold text-slate-100 tracking-tight mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-amber-400" />
        Cascade Milestones & Badges
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {BADGES.map(badge => (
          <div key={badge.id} className={`p-5 rounded-2xl border transition-all ${badge.unlocked ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/20 border-white/5 opacity-60'}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl flex-shrink-0 ${badge.unlocked ? 'bg-white/5' : 'bg-white/5 grayscale'}`}>
                {badge.icon}
              </div>
              <div>
                <h4 className={`font-medium mb-1 ${badge.unlocked ? 'text-slate-200' : 'text-slate-500'}`}>{badge.title}</h4>
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">{badge.description}</p>
                {badge.unlocked ? (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-500/80">Unlocked {badge.date}</span>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-600">
                    <Lock className="w-3 h-3" /> Locked
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemItem({ sys }: { sys: typeof MOCK_SYSTEMS[0] }) {
  const [chartPeriod, setChartPeriod] = useState<7 | 30>(7);
  const [isLogging, setIsLogging] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editedMetric, setEditedMetric] = useState(sys.metric);
  const [justLogged, setJustLogged] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{day: number, value: number, note?: string} | null>(null);
  const [showMicroHabits, setShowMicroHabits] = useState(false);
  const [showVarianceHeatmap, setShowVarianceHeatmap] = useState(false);
  const displayHistory = sys.history?.slice(-chartPeriod) || [];

  const goalValueMatch = sys.metric && sys.metric.match(/\d+/);
  const goalValue = goalValueMatch ? parseInt(goalValueMatch[0]) : null;
  const dataMaxVal = Math.max(...displayHistory.map((d: any) => d.value), goalValue || 0);
  const dataMax = dataMaxVal > 0 ? Math.ceil(dataMaxVal * 1.05) : 100;
  
  let offPercentage = "100%";
  if (goalValue !== null && dataMax > 0) {
    const offset = (dataMax - goalValue) / dataMax;
    offPercentage = `${Math.max(0, Math.min(100, offset * 100))}%`;
  }

  const last7Days = sys.history?.slice(-7) || [];
  let projectedValue = 0;
  let isProjectingHit = false;
  let suggestedMetric = '';
  let suggestionReason = '';

  if (last7Days.length > 1 && goalValue !== null) {
    const n = last7Days.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    let successCount = 0;
    last7Days.forEach((d, i) => {
      sumX += i;
      sumY += d.value;
      sumXY += i * d.value;
      sumX2 += i * i;
      if (d.value >= goalValue) successCount++;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    projectedValue = slope * n + intercept;
    isProjectingHit = projectedValue >= goalValue;

    const successRate = successCount / n;
    const unit = sys.metric.replace(/\d+/, '').trim();
    if (successRate >= 0.8) {
      const increased = Math.round(goalValue * 1.1);
      suggestedMetric = `${increased} ${unit}`;
      suggestionReason = `You've hit your goal ${Math.round(successRate * 100)}% of the time recently. Consider a 10% increase.`;
    } else if (successRate <= 0.4) {
      const decreased = Math.round(goalValue * 0.9);
      suggestedMetric = `${decreased} ${unit}`;
      suggestionReason = `You've hit your goal ${Math.round(successRate * 100)}% of the time recently. A 10% decrease might help build momentum.`;
    }
  }

  let movingAverage7d = null;
  if (last7Days.length > 0) {
    const sum = last7Days.reduce((acc, d) => acc + d.value, 0);
    movingAverage7d = Math.round((sum / last7Days.length) * 10) / 10;
  }

  const handleCloseLog = (success: boolean) => {
    setIsLogging(false);
    if (success) {
      setJustLogged(true);
      setTimeout(() => setJustLogged(false), 2000);
    }
  };

  return (
    <>
    <div className={`flex flex-col rounded-xl bg-white/[0.02] border border-white/5 transition-colors overflow-hidden ${sys.state === 'ACTIVE' || sys.state === 'MAINTAIN' ? 'hover:bg-white/[0.04]' : ''}`}>
      <div 
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 ${sys.state === 'ACTIVE' || sys.state === 'MAINTAIN' ? 'cursor-pointer' : ''}`}
        onClick={() => {
          if (!isEditingGoal && (sys.state === 'ACTIVE' || sys.state === 'MAINTAIN')) {
            setIsLogging(true);
          }
        }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h4 className="font-medium text-slate-200">{sys.name}</h4>
            <StatusBadge state={sys.state} criteria={sys.criteria} />
          </div>
          <div className="text-xs text-slate-500 font-medium flex items-center flex-wrap gap-x-4 gap-y-2 mt-0.5">
            <span>Vertical: <span className="text-slate-400">{sys.vertical}</span></span>
            {sys.prerequisite && <span className="text-rose-400/80">Requires: {sys.prerequisite}</span>}
            {sys.microHabits && sys.microHabits.length > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMicroHabits(!showMicroHabits); }}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors py-0.5"
              >
                {showMicroHabits ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Micro-habits</span>
              </button>
            )}
          </div>
        </div>
      
      <div className="flex items-center gap-6 text-sm">
        <div className="flex flex-col items-end min-w-[100px]">
          <span className="text-xs text-slate-500 mb-0.5">Daily Goal</span>
          <div className="flex items-center gap-2">
            {isEditingGoal ? (
              <div className="relative">
                <input
                  type="text"
                  value={editedMetric}
                  onChange={(e) => setEditedMetric(e.target.value)}
                  onBlur={() => {
                    // Delay to allow clicking the suggestion button
                    setTimeout(() => setIsEditingGoal(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      setIsEditingGoal(false);
                    }
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setEditedMetric(sys.metric);
                      setIsEditingGoal(false);
                    }
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  className="w-24 bg-[#0A0A0B] border border-indigo-500/50 rounded px-2 py-0.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
                {suggestedMetric && (
                  <div className="absolute top-full right-0 mt-2 w-52 p-3 bg-[#131316] border border-indigo-500/30 rounded-xl shadow-xl z-50 text-left animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> AI Suggestion
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                      {suggestionReason}
                    </p>
                    <button
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditedMetric(suggestedMetric);
                        setIsEditingGoal(false);
                      }}
                      className="w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-[10px] font-medium transition-colors"
                    >
                      Update to {suggestedMetric}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <span className="font-mono text-slate-300">{editedMetric}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingGoal(true);
                  }}
                  className="text-slate-500 hover:text-indigo-400 transition-colors p-0.5"
                  title="Edit Goal"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
          {movingAverage7d !== null && (
            <span className="text-[10px] text-slate-500 mt-1 font-mono">
              7d avg: <span className="text-slate-400">{movingAverage7d} {sys.metric.replace(/\d+/, '').trim()}</span>
            </span>
          )}
        </div>
        {sys.state === 'ACTIVE' && (
          <div className={`relative flex flex-col items-end min-w-[100px] sm:min-w-[180px] transition-all duration-300 group/projection ${justLogged ? 'ring-2 ring-emerald-500/50 bg-emerald-500/10 rounded-xl p-2 -my-2 -mr-2 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}>
            {last7Days.length > 1 && goalValue !== null && (
               <div className="absolute bottom-full right-0 mb-3 w-56 p-4 bg-[#131316] text-slate-300 text-[10px] font-sans whitespace-normal rounded-xl shadow-2xl border border-white/10 opacity-0 group-hover/projection:opacity-100 pointer-events-none transition-all duration-200 z-50 text-center translate-y-2 group-hover/projection:translate-y-0">
                 <div className="font-semibold text-indigo-400 mb-1.5 flex items-center justify-center gap-1.5 text-xs">
                   <Sparkles className="w-3.5 h-3.5" />
                   Projected Completion
                 </div>
                 <div className="text-slate-400 mb-2.5 text-xs">Based on your last 7 days, your estimated next value is <strong className="text-white">{Math.round(projectedValue)}</strong> {sys.metric.split(' ')[1] || 'units'}.</div>
                 {isProjectingHit ? (
                   <span className="text-emerald-400 font-medium text-xs bg-emerald-500/10 px-2 py-1 rounded">On track to hit goal!</span>
                 ) : (
                   <span className="text-amber-400 font-medium text-xs bg-amber-500/10 px-2 py-1 rounded">May fall short of goal.</span>
                 )}
               </div>
            )}
            <span className="text-xs text-slate-500 mb-1 flex items-center justify-between w-full">
              <span>{chartPeriod}-Day Progression</span>
              <span className="text-indigo-400 font-mono">{sys.progress}/{sys.required}</span>
            </span>
            <div className="flex items-center gap-3 w-full mt-1">
              {sys.trend && (
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium whitespace-nowrap border border-emerald-500/20 group relative cursor-help">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {sys.trend}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2.5 bg-[#131316] text-slate-300 text-[10px] font-sans whitespace-normal rounded-lg shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-10 text-center translate-y-1 group-hover:translate-y-0">
                      Recent momentum ({sys.trend}) accelerates the unlock conditions for your next dependent system.
                    </div>
                  </div>
                  <div className="flex items-center bg-white/5 rounded p-0.5 border border-white/10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setChartPeriod(7); }}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors ${chartPeriod === 7 ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      7D
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setChartPeriod(30); }}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors ${chartPeriod === 30 ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      30D
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowVarianceHeatmap(!showVarianceHeatmap); }}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors ml-1 border-l border-white/10 pl-2 ${showVarianceHeatmap ? 'text-amber-400' : 'text-slate-400 hover:text-slate-300'}`}
                      title="Toggle Variance Heatmap"
                    >
                      Heatmap
                    </button>
                  </div>
                </div>
              )}
              <div className="flex-1 h-10 opacity-80 hover:opacity-100 transition-opacity min-w-[60px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={displayHistory} 
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    onClick={(nextState: any, event: any) => {
                      if (event) event.stopPropagation();
                      if (nextState && nextState.activePayload && nextState.activePayload.length > 0) {
                        setSelectedPoint(nextState.activePayload[0].payload);
                      } else {
                        setSelectedPoint(null);
                      }
                    }}
                  >
                  <YAxis hide domain={[0, dataMax]} />
                  <defs>
                    <linearGradient id={`colorValue${sys.id}`} x1="0" y1="0" x2="0" y2="1">
                      {goalValue !== null ? (
                        showVarianceHeatmap ? (
                          <>
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.5}/>
                            <stop offset={offPercentage} stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset={offPercentage} stopColor="#ef4444" stopOpacity={0.1}/>
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.5}/>
                          </>
                        ) : (
                          <>
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9}/>
                            <stop offset={offPercentage} stopColor="#6366f1" stopOpacity={0.5}/>
                            <stop offset={offPercentage} stopColor="#6366f1" stopOpacity={0.15}/>
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0}/>
                          </>
                        )
                      ) : (
                        <>
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </>
                      )}
                    </linearGradient>
                    <linearGradient id={`strokeValue${sys.id}`} x1="0" y1="0" x2="0" y2="1">
                      {goalValue !== null && showVarianceHeatmap ? (
                        <>
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset={offPercentage} stopColor="#10b981" />
                          <stop offset={offPercentage} stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </>
                      ) : (
                        <>
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#818cf8" />
                        </>
                      )}
                    </linearGradient>
                  </defs>
                  {goalValue !== null && (
                    <ReferenceLine 
                      y={goalValue} 
                      stroke="#475569" 
                      strokeDasharray="3 3" 
                      strokeOpacity={0.8}
                      strokeWidth={1}
                    />
                  )}
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={`url(#strokeValue${sys.id})`} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill={`url(#colorValue${sys.id})`}
                    isAnimationActive={true}
                    activeDot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <g 
                          className="cursor-pointer" 
                          onClick={(e) => { e.stopPropagation(); setSelectedPoint(payload); }}
                        >
                          <circle cx={cx} cy={cy} r={8} fill="#818cf8" className="opacity-40 animate-ping" style={{ transformOrigin: `${cx}px ${cy}px` }} />
                          <circle cx={cx} cy={cy} r={5} fill="#818cf8" stroke="#fff" strokeWidth={2} />
                        </g>
                      );
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              {selectedPoint && (
                <div 
                  className="absolute z-50 bottom-full mb-2 right-0 w-48 p-3 bg-[#131316] text-slate-300 text-xs font-sans rounded-xl shadow-2xl border border-indigo-500/30 text-center flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={(e) => { e.stopPropagation(); setSelectedPoint(null); }} className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                  <div className="font-medium text-indigo-400">Day {selectedPoint.day}</div>
                  <div className="text-xl font-semibold text-white">{selectedPoint.value} <span className="text-[10px] text-slate-500 font-normal uppercase tracking-wider">{sys.metric.split(' ')[1] || 'units'}</span></div>
                  <div className="text-slate-400 mt-1 leading-relaxed text-[11px]">{selectedPoint.note || 'No notes logged.'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
        {sys.state === 'MAINTAIN' && (
          <div className={`flex flex-col items-end min-w-[100px] transition-all duration-300 ${justLogged ? 'ring-2 ring-emerald-500/50 bg-emerald-500/10 rounded-xl p-2 -my-2 -mr-2 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}>
             <span className="text-xs text-slate-500 mb-2">Streak</span>
             <div className="flex items-center gap-2">
               <div className="relative flex items-center justify-center w-8 h-8">
                 <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                   <circle cx="18" cy="18" r="15" fill="none" className="stroke-white/10" strokeWidth="3" />
                   <circle 
                     cx="18" cy="18" r="15" fill="none" 
                     className="stroke-emerald-400 transition-all duration-1000 ease-out" 
                     strokeWidth="3" 
                     strokeDasharray="94.2" 
                     strokeDashoffset={sys.todayCompleted || justLogged ? 0 : 94.2} 
                     strokeLinecap="round" 
                   />
                 </svg>
                 <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-emerald-400">
                   {sys.progress}
                 </span>
               </div>
               <span className="text-xs font-mono text-emerald-400/80">Days</span>
             </div>
          </div>
        )}
         {sys.state === 'LOCKED' && (
          <div className="flex flex-col items-end min-w-[100px]">
             <span className="text-xs text-slate-500 mb-1">Status</span>
             <span className="text-xs text-slate-400 uppercase tracking-wider">Awaiting Cascade</span>
          </div>
        )}
      </div>
      </div>

      {showMicroHabits && sys.microHabits && sys.microHabits.length > 0 && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-black/20 animate-in slide-in-from-top-2 duration-200">
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
             {sys.microHabits.map((habit, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 rounded-xl bg-[#131316] border border-white/5 shadow-inner">
                   <div className="text-sm font-medium text-slate-200">{habit.name}</div>
                   <div className="flex flex-col gap-1">
                     <div className="flex items-center justify-between text-[11px]">
                       <span className="text-slate-500">Trigger</span>
                       <span className="text-indigo-300/80 text-right">{habit.trigger}</span>
                     </div>
                     <div className="flex items-center justify-between text-[11px]">
                       <span className="text-slate-500">Min. Success</span>
                       <span className="text-emerald-400/80 text-right">{habit.minThreshold}</span>
                     </div>
                   </div>
                </div>
             ))}
           </div>
        </div>
      )}
    </div>
    {isLogging && <LogProgressModal sys={sys} onClose={handleCloseLog} />}
    </>
  );
}

function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'model', content: "Hello! I'm your AI architect. To build your Life Operating System, let's start by getting to know you. What's your name?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, message: userMessage })
      });

      if (!res.ok) throw new Error('Failed to fetch response');
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'model', content: data.text }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I'm having trouble connecting to the network right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)] bg-[#131316] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
        <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm">
          <Sparkles className="w-4 h-4" /> AI Identity Architect
        </div>
        <button onClick={onComplete} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Skip to Dashboard</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-300 border border-white/10 markdown-body'}`}>
              <Markdown>{msg.content}</Markdown>
            </div>
            {msg.role === 'user' && (
               <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 flex-shrink-0 mt-1">
                 <UserIcon className="w-4 h-4 text-slate-400" />
               </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 justify-start">
             <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="bg-white/5 text-slate-400 border border-white/10 rounded-2xl px-5 py-4 text-sm flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white/[0.02] border-t border-white/5">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Define your goals..."
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-300 font-sans selection:bg-indigo-500/30 flex flex-col">
      <header className="border-b border-white/5 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-sm font-semibold text-slate-100 tracking-tight flex items-center gap-3">
              System Architecture
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Nominal
              </span>
            </h1>
          </div>
        </div>
      </header>

      {!hasCompletedOnboarding ? (
        <main className="flex-1 flex items-center justify-center p-6 w-full max-w-6xl mx-auto">
          <Onboarding onComplete={() => setHasCompletedOnboarding(true)} />
        </main>
      ) : (
        <main className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12 w-full">
          <nav className="w-full md:w-64 flex-shrink-0 flex flex-col gap-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'overview' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
          >
            <LayoutTemplate className="w-4 h-4" />
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('prisma')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'prisma' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
          >
            <Database className="w-4 h-4" />
            Prisma Schema
          </button>
          <button 
            onClick={() => setActiveTab('nestjs')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'nestjs' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
          >
            <Server className="w-4 h-4" />
            NestJS Service
          </button>
          <button 
            onClick={() => setActiveTab('edgecases')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'edgecases' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
          >
            <AlertTriangle className="w-4 h-4" />
            Edge Cases
          </button>
          <button 
            onClick={() => setActiveTab('vision')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'vision' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
          >
            <Sparkles className="w-4 h-4" />
            Future Vision
          </button>
          <button 
            onClick={() => setActiveTab('identity')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'identity' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
          >
            <UserIcon className="w-4 h-4" />
            Identity Shift
          </button>
          <button 
            onClick={() => setActiveTab('prep')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'prep' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
          >
            <CheckCircle2 className="w-4 h-4" />
            AI Preparation
          </button>
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <MaintainSummary />
              <div>
                <h2 className="text-2xl font-semibold text-slate-100 tracking-tight mb-4">First Principles Architecture</h2>
                <p className="text-slate-400 leading-relaxed max-w-3xl">
                  The Life Operating System relies on minimizing cognitive load while maintaining progressive momentum. To do this structurally, the database and services must understand that habits are not binary (on/off), but exist on a spectrum of active focus vs. baseline maintenance. 
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-xs font-semibold tracking-wider text-slate-500 mb-2 uppercase">State 1</div>
                  <h3 className="text-lg font-medium text-slate-200 mb-2">Locked</h3>
                  <p className="text-sm text-slate-400">Hidden from daily view. Prevents premature optimization and cognitive overwhelm. Unlocked via <code className="text-indigo-400 bg-indigo-400/10 px-1 py-0.5 rounded">CascadeRule</code>.</p>
                </div>
                <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <div className="text-xs font-semibold tracking-wider text-indigo-400 mb-2 uppercase">State 2</div>
                  <h3 className="text-lg font-medium text-indigo-200 mb-2">Active</h3>
                  <p className="text-sm text-indigo-300/70">The primary focus. Tracks granular metrics (e.g., 60 mins/day). Generates high-engagement notifications.</p>
                </div>
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs font-semibold tracking-wider text-emerald-500 mb-2 uppercase">State 3</div>
                  <h3 className="text-lg font-medium text-emerald-200 mb-2">Maintain</h3>
                  <p className="text-sm text-emerald-300/70">Baseline effort. Tracks minimum viable action (e.g., 10 mins/day). Designed purely to keep the identity/habit alive.</p>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold text-slate-100 tracking-tight mb-6 flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-indigo-400" />
                    Systems List
                  </h3>
                  <div className="space-y-3">
                    {MOCK_SYSTEMS.map((sys) => (
                      <SystemItem key={sys.id} sys={sys} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col">
                   <h3 className="text-xl font-semibold text-slate-100 tracking-tight mb-6 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                    Daily Operations
                  </h3>
                  <div className="flex flex-col gap-6 h-full">
                    <div className="flex-1">
                      <WorkspaceConnect />
                    </div>
                    <EndOfDaySurvey systems={MOCK_SYSTEMS} />
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <WeeklyReflection systems={MOCK_SYSTEMS} />
              </div>

              <MilestoneBadges />
            </div>
          )}

          {activeTab === 'prisma' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-100 tracking-tight">Data Layer (Prisma)</h2>
                <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-md border border-white/10">schema.prisma</span>
              </div>
              <div className="bg-[#131316] border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <pre className="p-6 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed">
                  <code>{PRISMA_CODE}</code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'nestjs' && (
            <div className="animate-in fade-in duration-500">
               <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-100 tracking-tight">Cascade Worker Logic (NestJS)</h2>
                <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-md border border-white/10">cascade.service.ts</span>
              </div>
              <div className="bg-[#131316] border border-white/10 rounded-2xl overflow-hidden mb-6">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <pre className="p-6 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed">
                  <code>{NESTJS_CODE}</code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'edgecases' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-xl font-semibold text-slate-100 tracking-tight">Edge Case Mitigation</h2>
              
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 mb-1">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-medium text-lg">Failure 1: Midnight Timezone Skews</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  <strong className="text-slate-300">Issue:</strong> If BullMQ runs a nightly "streak verification" job at UTC midnight, a user in PST who hasn't logged their evening activity will arbitrarily lose their streak, breaking the cascade logic.
                </p>
                <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Structural Mitigation</h4>
                  <p className="text-sm text-slate-300">
                    Never use generic UTC cron jobs for user-specific streaks. Store <code className="text-indigo-300 bg-indigo-500/10 px-1 py-0.5 rounded text-xs">timezone</code> on the User model. Schedule BullMQ delayed jobs explicitly based on the user's localized midnight (e.g., calculate standard midnight for their TZ and schedule the job with <code className="text-indigo-300 bg-indigo-500/10 px-1 py-0.5 rounded text-xs">delay: msToNextLocalMidnight</code>). Provide a 2-hour grace period for late loggers.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 mb-1">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-medium text-lg">Failure 2: Mid-Streak Abandonment & Thrashing</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  <strong className="text-slate-300">Issue:</strong> A user hits 13/14 days on Health, misses day 14, and drops back to 0. The Wealth system remains locked. If this happens twice, psychological abandonment spikes due to "thrashing" and perceived failure.
                </p>
                <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Structural Mitigation</h4>
                  <p className="text-sm text-slate-300">
                    Implement <strong className="text-white">Streak Shields</strong>. Do not reset streaks strictly to 0 on a single failure. If <code className="text-indigo-300 bg-indigo-500/10 px-1 py-0.5 rounded text-xs">currentStreak &gt; 7</code>, a missed day subtracts 2 days from the streak instead of wiping it. Combine this with the MAINTAIN state: if they fail the ACTIVE goal (60 mins) but hit the MAINTAIN goal (10 mins), the streak pauses rather than breaking.
                  </p>
                </div>
              </div>

              <AdaptiveTimingSimulation />
            </div>
          )}

          {activeTab === 'vision' && (
            <FutureVision />
          )}

          {activeTab === 'identity' && (
            <IdentityShiftTracker />
          )}

          {activeTab === 'prep' && (
            <AIPreparation />
          )}
        </div>
      </main>
      )}
    </div>
  );
}
