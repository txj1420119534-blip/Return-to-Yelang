import { Dialog } from './Dialog';

type ScheduleItem = {
  time: string;
  dateTime: string;
  title: string;
  detail: string;
};

const DAY_ONE_SCHEDULE: ScheduleItem[] = [
  { time: '09:00', dateTime: '09:00', title: '博物馆短片与选面', detail: '观看开场短片，从五种面型中选择初始倾向。' },
  { time: '09:30–11:30', dateTime: '09:30', title: '展品探索', detail: '扫描博物馆展品，收集文化证据与面纹碎片。' },
  { time: '13:00', dateTime: '13:00', title: '入谷领白面', detail: '抵达夜郎谷，登记姓名并领取白色傩面。' },
  { time: '13:20–17:00', dateTime: '13:20', title: '自由观览、体验与悬赏', detail: '自由选择谷中景观、手作、NPC 与悬赏任务。' },
  { time: '17:00–18:20', dateTime: '17:00', title: '归面工坊', detail: '整理当天行为，完成个人数字傩面。' },
  { time: '18:30', dateTime: '18:30', title: '夜郎晚宴', detail: '按菜单了解菜品、食材来源与文化故事。' },
  { time: '19:20', dateTime: '19:20', title: '傩戏展演', detail: '进入夜间仪式，观看傩戏与角色演绎。' },
  { time: '20:00', dateTime: '20:00', title: '傩面舞与篝火', detail: '随鼓点共舞，让个人面纹汇入大面。' },
  { time: '20:15', dateTime: '20:15', title: '傩面共绘', detail: '每位玩家落下唯一一笔，完成共同傩面。' }
];

const DAY_TWO_SCHEDULE: ScheduleItem[] = [
  { time: '09:00–11:00', dateTime: '09:00', title: '资源获取', detail: '完成 NPC 任务，获取工材、粮草、铜令与民心。' },
  { time: '11:00–12:00', dateTime: '11:00', title: '午餐 · 战术准备', detail: '确认阵营分工、行动路线与资源安排。' },
  { time: '12:00–12:20', dateTime: '12:00', title: '第一轮攻防', detail: '护送与伏击开始，城门、粮仓和哨站同步结算。' },
  { time: '12:20–12:40', dateTime: '12:20', title: '第二轮攻防', detail: '根据首轮战况调整路线与资源使用。' },
  { time: '12:40–13:00', dateTime: '12:40', title: '第三轮攻防', detail: '在最终资源状态下完成决胜行动。' },
  { time: '13:00', dateTime: '13:00', title: '战斗结算', detail: '服务端冻结战局并生成战术结果与文化结局。' }
];

export function ScheduleDialog({ open, day, onClose }: { open: boolean; day: 1 | 2; onClose: () => void }) {
  const schedule = day === 1 ? DAY_ONE_SCHEDULE : DAY_TWO_SCHEDULE;
  return (
    <Dialog open={open} title={`DAY ${day === 1 ? 'ONE' : 'TWO'} · 完整日程`} eyebrow="谷中行止" onClose={onClose} className="schedule-dialog">
      <p className="schedule-intro">时间用于现场引导；最终以主持人与运营通知为准。</p>
      <ol className="schedule-list" aria-label={`第${day === 1 ? '一' : '二'}日完整日程`}>
        {schedule.map((item) => (
          <li key={`${item.time}-${item.title}`}>
            <time dateTime={item.dateTime}>{item.time}</time>
            <div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
