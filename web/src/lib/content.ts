export const NPCS = [
  { id: 'npc-01', name: '老石匠', role: '石城引路人', location: '石城之眼', layer: '谷中艺术', bio: '讲石墙怎样一块块垒起，也提醒来客把传说和史证分开。', opening: '先摸一摸石头，再问它从哪来。', source: '《夜郎谷建筑历程》整理' },
  { id: 'npc-02', name: '铜鼓师', role: '演出引导', location: '傩台', layer: '活态非遗', bio: '负责当晚演出与共绘节奏，引导玩家在表演和史实之间看清边界。', opening: '鼓点是今晚的路标，不是历史结论。', source: 'Demo 活动编排，待现场传承人与运营方复核' },
  { id: 'npc-03', name: '染纹师', role: '工坊导师', location: '百工工坊', layer: '活态非遗', bio: '带玩家完成可留存的纹样手作，并说明材料、步骤与使用边界。', opening: '先试一笔，颜色会替手留下记忆。', source: 'Demo 工坊占位角色，待合作方确认' },
  { id: 'npc-04', name: '陶火师', role: '信纹体验导师', location: '陶火台', layer: '谷中艺术', bio: '负责陶土与信纹体验，让玩家获得可在 Day2 使用的收藏。', opening: '火只负责留下痕迹，意义要由人来接。', source: 'Demo 体验设计' },
  { id: 'npc-05', name: '粮商', role: '粮草悬赏人', location: '晚宴入口', layer: '游戏演绎', bio: '发布粮草搬运与补给任务，是 Day2 粮仓玩法的叙事入口。', opening: '城里一碗饭，城外就是一段路。', source: '游戏演绎' },
  { id: 'npc-06', name: '山路行脚', role: '路线侦察人', location: '谷中岔路', layer: '游戏演绎', bio: '提供路线、哨站与隐藏点位提示，不承担历史讲解。', opening: '想看见车队，先把高处的眼睛守住。', source: '游戏演绎' },
  { id: 'npc-07', name: '谷中史官', role: '内容来源核验', location: '文化卡墙', layer: '史证', bio: '帮助玩家查看文化卡来源，区分史证、非遗、艺术与游戏演绎。', opening: '先看来源，再决定这句话能走多远。', source: '项目内容分层角色' },
  { id: 'npc-08', name: '说面人', role: '归面引导', location: '归面工坊', layer: '游戏演绎', bio: '根据玩家已完成的行为，帮助整理数字面与个人面语。', opening: '我不替你解释这张面，只把你走过的路摆出来。', source: '游戏演绎' }
] as const;

export const DINNER_MENU = [
  { id: 'dish-01', name: '酸汤时蔬', description: '以清爽酸汤配当季蔬菜的 Demo 菜单占位，正式菜品与过敏原以餐饮方确认为准。', tags: ['热食', '素食可选'], source: 'Demo 占位菜单，待餐饮供应商确认' },
  { id: 'dish-02', name: '糯米饭', description: '便于携带与分享的主食占位；现场版本需标注配料、份量和过敏原。', tags: ['主食'], source: 'Demo 占位菜单，待餐饮供应商确认' },
  { id: 'dish-03', name: '谷火烤豆腐', description: '以篝火夜为叙事命名的游戏演绎菜品，不宣称历史来源。', tags: ['小食', '游戏演绎命名'], source: '游戏演绎，待餐饮供应商确认' },
  { id: 'dish-04', name: '山野清茶', description: '晚宴间歇饮品占位；正式茶品、产地与冲泡说明由供应方补充。', tags: ['饮品'], source: 'Demo 占位菜单，待餐饮供应商确认' }
] as const;

export const PERFORMANCES = [
  { id: 'show-nuo-01', time: '19:20', title: '傩戏展演', location: '傩台', description: '观看现场审核后的展演内容；应用只做时间与地点引导。', reward: '信纹 +1', source: '项目圣经 §3；演出内容待现场方审核' },
  { id: 'show-mask-dance-01', time: '20:00', title: '傩面舞与篝火', location: '篝火场', description: '通过现场参与点亮信纹，并为共面仪式聚集玩家。', reward: '信纹 +1', source: '项目圣经 §3 / 游戏演绎' },
  { id: 'show-wall-01', time: '20:15', title: '傩面共绘', location: '归面工坊', description: '每位玩家选择唯一一道纹，共同点亮大面。', reward: '信纹 +1', source: '项目圣经 §5 / 游戏演绎' }
] as const;

export const EXPERIENCES = [
  { id: 'exp-stone-trace', title: '石城寻踪', location: '石城之眼', duration: 15, description: '通过现场标识寻找石构细节，完成后获得义纹。', source: '谷中艺术 / Demo 路线设计' },
  { id: 'exp-mask-craft', title: '傩意面具彩绘', location: '百工工坊', duration: 30, description: '制作夜郎艺术面或傩意面具，不称为传统傩神法面。', source: '项目圣经 §11.7 / 工坊活动' },
  { id: 'exp-npc-bounty', title: 'NPC 悬赏', location: '谷内多点', duration: 20, description: '帮助现场角色完成搬运、寻迹或核验，积累智纹和 Day2 物资。', source: '项目圣经 §3 / 游戏演绎' },
  { id: 'exp-mask-wall', title: '共面仪式', location: '归面工坊', duration: 10, description: '提交唯一一道纹，在大面上留下自己的位置。', source: '项目圣经 §5 / 游戏演绎' }
] as const;

export const BOUNTIES = [
  { id: 'bounty-stone', title: '找回石城路标', npc: '老石匠', place: '石城之眼', reward: '义纹', note: '到现场扫描路标，结果以账本为准。' },
  { id: 'bounty-craft', title: '留下一件手作', npc: '染纹师', place: '百工工坊', reward: '礼纹与收藏', note: '拍摄作品并由现场流程核验。' },
  { id: 'bounty-grain', title: '替晚宴送一袋粮', npc: '粮商', place: '晚宴入口', reward: 'Day2 粮草线索', note: '此条为游戏演绎；资源以 Day2 服务端结算为准。' }
] as const;
