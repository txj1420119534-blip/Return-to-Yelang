import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Dialog } from '../components/Dialog';
import { MaskView } from '../components/MaskView';
import { ScannerPanel } from '../components/ScannerPanel';
import { BackLink, EmptyPanel, SourceCard, ToolGrid, type ToolItem } from '../components/Workbench';
import { ErrRite, FragmentPips, LayerSeal, RiteButton } from '../components/ui';
import { post } from '../lib/api';
import { BOUNTIES, NPCS, PERFORMANCES } from '../lib/content';
import { usePreview } from '../lib/hooks';
import { useSession } from '../lib/session';
import { displayPatternName, SCENES, VIRTUE_OPTIONS, type VirtueId } from '../lib/types';

const DAY1_TOOLS: ToolItem[] = [
  { to: '/day1/explore', number: '01', title: '探索', subtitle: '相机识景 · 得见来处', glyph: '寻', tone: 'jade' },
  { to: '/day1/records', number: '02', title: '记录', subtitle: '文化卡 · 来源与证据', glyph: '录', tone: 'paper' },
  { to: '/day1/collection', number: '03', title: '收藏', subtitle: '拍下手作 · 查看藏品', glyph: '藏', tone: 'bronze' },
  { to: '/day1/banquet', number: '04', title: '晚宴', subtitle: '菜品 · 时辰与说明', glyph: '宴', tone: 'ember' },
  { to: '/day1/npcs', number: '05', title: '谷中人物', subtitle: 'NPC · 位置与口信', glyph: '人', tone: 'stone' },
  { to: '/day1/performances', number: '06', title: '演出', subtitle: '傩台 · 篝火与共绘', glyph: '演', tone: 'blood' },
  { to: '/day1/experiences', number: '07', title: '体验', subtitle: '夜郎集市 · 八站体验', glyph: '作', tone: 'jade' },
  { to: '/day1/bounties', number: '08', title: '悬赏', subtitle: '附近任务 · 现场核验', glyph: '令', tone: 'bronze' },
  { to: '/day1/mask', number: '09', title: '归面 / 共绘', subtitle: '查看数字面 · 留唯一一笔', glyph: '面', tone: 'ember', badge: '解锁 DAY2' }
];

const MARKET_STATIONS = [
  {
    id: 'market-ranxin', station: '染心坊', activity: '夜郎蜡染', role: '显心', keyword: '我', image: '/assets/day1/market/market-ranxin.png',
    body: '夜郎人相信，布本无色，心落其上，才有了纹样。\n\n蜡封住的地方不会被染透，就像一个人一路成长，也总有一些东西，不愿被世界改变。\n\n来到这里，不是为了染一块布。而是从夜郎的蓝与白之间，留下一个只属于自己的生命印记。\n\n世界可以给你颜色。但真正的你，要自己留下。'
  },
  {
    id: 'market-wanwu', station: '万物坊', activity: '黄平泥哨', role: '唤醒', keyword: '醒', image: '/assets/day1/market/market-wanwu.png',
    body: '泥土本来不会说话。有人把它捏成鸟、兽、人，再吹入一口气，它便有了声音。\n\n这像极了宋培伦赋予石头生命——材料从来没有高低，真正决定它有没有灵魂的，是创造它的人。\n\n所以这里卖的不是泥哨。每个人都在寻找那一声，属于自己的声音。\n\n泥土有了气，便有了声音。人找到自己，生命才真正开始。'
  },
  {
    id: 'market-huaming', station: '画命馆', activity: '画我漫画', role: '照见', keyword: '见', image: '/assets/day1/market/market-huaming.jpg', imageAlt: '/assets/day1/market/market-huaming-sign.jpg',
    body: '人这一生看过无数张脸，却最难真正看清自己的脸。\n\n画师只用几笔，便把一个人的神态、习惯甚至藏不住的性格留在纸上。\n\n在《重返夜郎国》里，这里不是画像摊，而是一面镜子。你来画“我”。最后看见的，也许是那个被自己忽略很久的人。\n\n别人画的是你的脸。你要认出的，是脸后的自己。'
  },
  {
    id: 'market-baigong', station: '百工坊', activity: '夜郎手作', role: '造物', keyword: '做', image: '/assets/day1/market/market-baigong.jpg',
    body: '夜郎没有真正消失。它藏进木头、陶土、铜铃、傩面和一双双仍愿意做东西的手里。\n\n宋培伦没有等待别人替夜郎留下什么，而是亲手搬石、造屋、塑像，把心里的夜郎一点点做了出来。\n\n所以来到这里，不能只买。你必须亲手创造一样东西。\n\n想象只能留在心里。双手，才能让它来到人间。'
  },
  {
    id: 'market-wufang', station: '五方市', activity: '丑东西集市', role: '交换', keyword: '换', image: '/assets/day1/market/market-wufang.png',
    body: '古老的夜郎，因道路而相遇，也因交换而繁盛。有人带来粮食，有人带来器物，有人带来故事。\n\n但真正的交换，从来不只是物与物。\n\n在《重返夜郎国》中，这里可以成为整个游戏最热闹的“人间场”——交易、合作、争夺、谈判、帮助，都在这里发生。\n\n一个人拥有多少，并不重要。重要的是，你愿意拿什么与这个世界交换。\n\n你拿走一样东西。也一定会留下某样东西。'
  },
  {
    id: 'market-qinghuo', station: '青火窑', activity: '夜郎陶艺', role: '淬炼', keyword: '炼', image: '/assets/day1/market/market-qinghuo.png',
    body: '泥要经过火，才能成为器。人也是如此。\n\n宋培伦用几十年把荒坡变成夜郎谷，真正留下来的，从来不是一时的热血，而是经得住时间与孤独的那团火。\n\n来到青火窑，每个人都像一块尚未完成的泥。生命里的碰撞、失败、争执与失去，不一定是在毁掉你。有些火，是来成就你的。\n\n未经火，只是一团泥。穿过火，才知道自己能成为什么。'
  },
  {
    id: 'market-guixin', station: '归心驿', activity: '夜郎茶', role: '归心', keyword: '归', image: '/assets/day1/market/market-guixin.png',
    body: '夜郎山中，赶路的人都会停一次。不是因为路走不动了，而是因为心走得太快。\n\n一盏茶，把山风、草木、火候和时间都收进水里。人坐下来，杂念才慢慢沉下去。\n\n宋培伦把几十年交给一座谷，也不是因为快，而是因为心定。\n\n所以这里不是茶铺。是夜郎留给每个赶路人的一次停顿。\n\n走得再远，也要知道心在哪里。茶入口，人才重新回来。'
  },
  {
    id: 'market-huanshan', station: '唤山台', activity: '金竹芦笙', role: '唤醒', keyword: '唤', image: '/assets/day1/market/market-huanshan.png',
    body: '古老山谷里，最先穿过雾的，往往不是人，是声音。\n\n一根竹很轻。当气息进入其中，它便能越过山岭，把远处的人重新召回。\n\n芦笙因此不只是乐器。它是在告诉后来的人：只要还有人愿意吹响，旧的生命就能在新的身体里继续。\n\n宋培伦用石头让夜郎重新显形。这里的人，用一口气，让夜郎重新发声。\n\n石头让夜郎被看见。芦笙让夜郎再次被听见。'
  }
] as const;

const NPC_IMAGE_BY_ID: Record<string, string> = {
  'npc-01': '/assets/day2/npc-laoshijiang.png',
  'npc-02': '/assets/day2/npc-tonggushi.png',
  'npc-03': '/assets/day2/npc-ranwenshi.png',
  'npc-04': '/assets/day2/npc-taohuoshi.png',
  'npc-05': '/assets/day2/npc-liangshang.png',
  'npc-06': '/assets/day2/npc-xingjiao.png',
  'npc-07': '/assets/day2/npc-shiguan.png',
  'npc-08': '/assets/day2/npc-shuomian.png'
};

const BANQUET_POSTERS = [
  { src: '/assets/day1/meal1.png', alt: '夜郎云岭·天麻乌鸡汤菜单' },
  { src: '/assets/day1/meal2.png', alt: '夜郎谷香·苦荞金饼菜单' },
  { src: '/assets/day1/meal3.png', alt: '夜郎炙香·可乐猪菜单' },
  { src: '/assets/day1/meal4.png', alt: '夜郎山野·黑马羊锅菜单' }
] as const;

const PAGE_HELP = {
  hub: { body: '工具台只负责带你抵达现场功能。奖励、进度与 DAY2 解锁都来自服务端账本。', steps: ['从探索开始，扫描景点；Demo 可使用调试模式。', '记录、收藏、人物与演出会逐渐补全你的行程。', '完成归面与傩面共绘后，顶部 DAY2 才会开启。'] },
  explore: { body: '将二维码或景点标识完整放入镜头。Demo 识别可使用页面下方的调试模式。', steps: ['授权后置相机，让景点或二维码进入画面。', '识别成功后等待服务端返回文化卡、来源和奖励。', '若同一点位已经扫描，服务端可能只返回内容、不重复发奖。'] },
  records: { body: '这里按文化卡展示你已收集的信息，并明确区分史证、活态非遗、谷中艺术和游戏演绎。' },
  collection: { body: '使用设备相机拍下自己的现场手作，改名保存后会立即进入本机展区；也可以从展区删除。' },
  banquet: { body: '菜单为当前活动占位信息。正式菜品、配料和过敏原必须以餐饮供应方现场标识为准。' },
  npcs: { body: '人物卡告诉你 NPC 的位置、职责与内容边界。这里不替代现场对话与核验。' },
  performances: { body: '演出页只做时间、地点、内容边界与可能奖励说明；表演内容以现场审核版本为准。' },
  experiences: { body: '依次查看夜郎集市八站：名称、体验内容与关键词以《夜郎集市》为准。' },
  bounties: { body: '悬赏只是任务指引，不是领取按钮。抵达指定地点并完成核验后，账本才会变化。' },
  mask: { body: '数字面只记录你已经完成的行为。面语可由服务生成；共绘每人只能留下唯一一道纹。' }
};

export function Day1HubPage() {
  const { preview } = usePreview();
  return (
    <AppShell day={1} pageTitle="今夜工具" help={PAGE_HELP.hub} hideContext>
      <FragmentPips fragments={preview.fragments} eyebrow="MASK VIRTUES" title="傩面之义" />
      <div className="section-heading"><div><p>TODAY</p><h3>今日行动</h3></div><span>{DAY1_TOOLS.length} 项</span></div>
      <ToolGrid items={DAY1_TOOLS} />
    </AppShell>
  );
}

type ScanResult = {
  content_card: { title: string; body: string; layer: string; source?: string; image_url?: string | null; audio_url?: string | null };
  fragment_gain: { pattern: string; delta: number };
};

export function ExplorePage() {
  const { local, refresh: refreshSession } = useSession();
  const { refresh: refreshPreview } = usePreview();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');

  async function scan(code: string) {
    if (!local) throw new Error('玩家会话已失效，请重新入场。');
    setError('');
    try {
      const response = await post<ScanResult>('/api/scan', { player_id: local.player_id, code });
      setResult(response);
      await Promise.allSettled([refreshPreview(), refreshSession()]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      throw new Error(message);
    }
  }

  return (
    <AppShell day={1} pageTitle="探索 · 识景得纹" help={PAGE_HELP.explore}>
      <BackLink to="/day1" />
      <ScannerPanel
        title="让景点进入镜头"
        hint="相机会自动开启。让现场二维码完整进入取景框，再识别当前画面。"
        onDetected={scan}
        allowManual
        manualOptions={SCENES.map((scene) => ({ code: scene.code, label: scene.title, description: scene.layer }))}
      />
      <ErrRite message={error} />
      <Dialog open={Boolean(result)} title={result?.content_card.title || '识景结果'} eyebrow="景点已核验" onClose={() => setResult(null)}>
        {result && <>
          <LayerSeal layer="展览介绍" />
          {result.content_card.image_url && <img className="exhibit-result-image" src={result.content_card.image_url} alt={result.content_card.title} />}
          <p className="result-body is-longform">{result.content_card.body}</p>
          {result.content_card.source && <p className="source-note">展览内容 · {result.content_card.source}</p>}
          <div className="reward-stamp"><span>{displayPatternName(result.fragment_gain.pattern)}</span><p>{result.fragment_gain.delta > 0 ? `面纹 +${result.fragment_gain.delta}` : '此处已记录，本次不重复发奖'}</p></div>
        </>}
      </Dialog>
    </AppShell>
  );
}

export function RecordsPage() {
  const { preview, loading, error } = usePreview();
  return (
    <AppShell day={1} pageTitle="记录 · 文化卡" help={PAGE_HELP.records}>
      <BackLink to="/day1" />
      <p className="page-lede">每张卡都保留内容层级与来源。没有来源的故事，不会被包装成史证。</p>
      {loading && !preview.cards.length && <p className="loading-line" role="status">册页正在展开…</p>}
      <ErrRite message={error} />
      <div className="card-stack">
        {preview.cards.map((card) => <SourceCard key={card.id} layer={card.layer} title={card.title} body={card.body} source={card.source} />)}
        {!loading && !preview.cards.length && <EmptyPanel title="册页还白" body="先去探索一个现场点位，文化卡会在服务端核验后落到这里。" />}
      </div>
    </AppShell>
  );
}

type LocalCraft = { id: string; name: string; image: string; createdAt: string };

function readLocalCrafts(key: string): LocalCraft[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((item): item is LocalCraft => Boolean(item?.id && item?.name && item?.image)) : [];
  } catch {
    return [];
  }
}

export function CollectionPage() {
  const { local } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryKey = `yelang.craft-gallery.${local?.player_id || 'device'}`;
  const [crafts, setCrafts] = useState<LocalCraft[]>(() => readLocalCrafts(galleryKey));
  const [cameraOn, setCameraOn] = useState(false);
  const [draftImage, setDraftImage] = useState('');
  const [draftName, setDraftName] = useState('我的手作');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  function stopCraftCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  useEffect(() => () => stopCraftCamera(), []);

  async function startCraftCamera() {
    setError('');
    setStatus('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前浏览器无法调用设备相机，请使用支持相机权限的手机浏览器。');
      return;
    }
    try {
      stopCraftCamera();
      setDraftImage('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setStatus('相机已开启，请把手作放进画面。');
    } catch {
      setError('未能取得相机权限，请在浏览器设置中允许相机后重试。');
    }
  }

  function captureCraft() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('相机画面尚未准备好，请稍候再拍。');
      return;
    }
    const maxEdge = 960;
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      setError('当前设备无法保存相机画面。');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setDraftImage(canvas.toDataURL('image/jpeg', 0.78));
    stopCraftCamera();
    setStatus('照片已拍下，改名后即可保存到展区。');
  }

  function updateGallery(next: LocalCraft[]) {
    try {
      localStorage.setItem(galleryKey, JSON.stringify(next));
      setCrafts(next);
      return true;
    } catch {
      setError('设备存储空间不足，暂时无法保存这张照片。');
      return false;
    }
  }

  function saveCraft() {
    const name = draftName.trim();
    if (!draftImage) {
      setError('请先使用相机拍下手作。');
      return;
    }
    if (!name) {
      setError('请为这件手作写下名字。');
      return;
    }
    const next = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, image: draftImage, createdAt: new Date().toISOString() }, ...crafts];
    if (!updateGallery(next)) return;
    setDraftImage('');
    setDraftName('我的手作');
    setError('');
    setStatus(`“${name}”已进入下方展区。`);
  }

  function deleteCraft(id: string) {
    const target = crafts.find((craft) => craft.id === id);
    if (!updateGallery(crafts.filter((craft) => craft.id !== id))) return;
    setStatus(target ? `“${target.name}”已从本机展区删除。` : '藏品已删除。');
  }

  return (
    <AppShell day={1} pageTitle="收藏 · 我的手作展区" help={PAGE_HELP.collection}>
      <BackLink to="/day1" />
      <section className="craft-camera paper-slip" aria-labelledby="craft-camera-title">
        <div className={`capture-preview ${cameraOn ? 'is-live' : ''}`}>
          <video ref={videoRef} muted playsInline aria-label="手作拍摄实时画面" />
          {draftImage && <img src={draftImage} alt="刚拍下的手作" />}
          {!cameraOn && !draftImage && <div><span aria-hidden="true">作</span><p>打开相机，拍下你的手作</p></div>}
        </div>
        <h2 id="craft-camera-title">拍摄并收藏</h2>
        <div className="craft-camera__actions">
          <button type="button" className="compact-action" onClick={() => void startCraftCamera()}>{draftImage ? '重新拍摄' : cameraOn ? '重新开启相机' : '打开相机'}</button>
          <button type="button" className="compact-action is-primary" disabled={!cameraOn} onClick={captureCraft}>拍下手作</button>
        </div>
        <label htmlFor="craft-name">藏品名称</label>
        <input id="craft-name" value={draftName} maxLength={28} disabled={!draftImage} onChange={(event) => setDraftName(event.currentTarget.value)} />
        <button type="button" className="compact-action is-primary craft-save" disabled={!draftImage || !draftName.trim()} onClick={saveCraft}>保存到展区</button>
      </section>
      <ErrRite message={error} />
      <p className="success-line" role="status" aria-live="polite">{status}</p>
      <div className="section-heading"><div><p>EXHIBITION</p><h3>我的展区</h3></div><span>{crafts.length} 件</span></div>
      {crafts.length ? <div className="craft-gallery">
        {crafts.map((craft) => (
          <article key={craft.id}>
            <img src={craft.image} alt={craft.name} />
            <div><h3>{craft.name}</h3><time dateTime={craft.createdAt}>{new Date(craft.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></div>
            <button type="button" aria-label={`删除藏品${craft.name}`} onClick={() => deleteCraft(craft.id)}>删除</button>
          </article>
        ))}
      </div> : <EmptyPanel title="展区还空" body="打开相机拍下第一件手作，改名保存后会立即出现在这里。" />}
    </AppShell>
  );
}

export function BanquetPage() {
  return (
    <AppShell day={1} pageTitle="晚宴 · 今夜菜单" help={PAGE_HELP.banquet}>
      <BackLink to="/day1" />
      <section className="banquet-hero"><div><p>晚宴时辰</p><time>18:30</time><span>晚宴入口 · 以现场席次为准</span></div></section>
      <p className="allergen-warning">正式配料与过敏原请询问现场餐饮人员，并以现场席次与出品为准。</p>
      <section className="menu-gallery" aria-label="夜郎风物宴菜单">
        {BANQUET_POSTERS.map((poster, index) => <figure key={poster.src}><img src={poster.src} alt={poster.alt} /><figcaption>{String(index + 1).padStart(2, '0')} / 04</figcaption></figure>)}
      </section>
    </AppShell>
  );
}

export function NpcsPage() {
  return (
    <AppShell day={1} pageTitle="谷中人物 · NPC" help={PAGE_HELP.npcs}>
      <BackLink to="/day1" />
      <p className="page-lede">他们站在谷中不同位置。先看清角色的内容层级，再听他说话。</p>
      <div className="accordion-list">
        {NPCS.map((npc) => (
          <details key={npc.id}><summary><img className="npc-portrait" src={NPC_IMAGE_BY_ID[npc.id]} alt="" aria-hidden="true" /><div><LayerSeal layer={npc.layer} /><h3>{npc.name} · {npc.role}</h3><p>{npc.location}</p></div><i aria-hidden="true">＋</i></summary><div className="accordion-body"><blockquote>“{npc.opening}”</blockquote><p>{npc.bio}</p><footer>来源 · {npc.source}</footer></div></details>
        ))}
      </div>
    </AppShell>
  );
}

export function PerformancesPage() {
  return (
    <AppShell day={1} pageTitle="演出 · 今夜时刻" help={PAGE_HELP.performances}>
      <BackLink to="/day1" />
      <div className="timeline">
        {PERFORMANCES.map((show) => (
          <article key={show.id}><time>{show.time}</time><i aria-hidden="true" /><div><h3>{show.title}</h3><p className="location-line">{show.location} · {show.reward}</p><p>{show.description}</p><footer>来源 · {show.source}</footer></div></article>
        ))}
      </div>
      <Link to="/day1/mask" className="wide-link">先归面，再前往共绘 <span aria-hidden="true">→</span></Link>
    </AppShell>
  );
}

export function ExperiencesPage() {
  const [selected, setSelected] = useState<(typeof MARKET_STATIONS)[number] | null>(null);
  return (
    <AppShell day={1} pageTitle="体验 · 夜郎集市" help={PAGE_HELP.experiences}>
      <BackLink to="/day1" />
      <div className="experience-grid">
        {MARKET_STATIONS.map((experience, index) => (
          <article
            key={experience.id}
            className="source-card paper-slip experience-card"
            role="button"
            tabIndex={0}
            onClick={() => setSelected(experience)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              setSelected(experience);
            }}
          >
            <div className="source-card-head"><LayerSeal layer="体验" /><span>关键词 · {experience.keyword}</span></div>
            <img src={experience.image} alt="" aria-hidden="true" />
            <h3>{String(index + 1).padStart(2, '0')} · {experience.station}</h3>
            <p>{experience.activity}</p>
            <span className="experience-card__cta">查看集市详情 <b aria-hidden="true">→</b></span>
          </article>
        ))}
      </div>
      <Dialog open={Boolean(selected)} title={selected ? `${selected.station} · ${selected.activity}` : '集市详情'} eyebrow="夜郎集市" onClose={() => setSelected(null)} className="experience-dialog">
        {selected && <>
          <div className="experience-detail-images">
            <img src={selected.image} alt={`${selected.station}${selected.activity}现场`} />
            {'imageAlt' in selected && selected.imageAlt && <img src={selected.imageAlt} alt={`${selected.station}摊位`} />}
          </div>
          <div className="experience-detail-meta"><span>神职 · {selected.role}</span><span>生命关键词 · {selected.keyword}</span></div>
          <p className="result-body is-longform">{selected.body}</p>
        </>}
      </Dialog>
    </AppShell>
  );
}

export function BountiesPage() {
  return (
    <AppShell day={1} pageTitle="悬赏 · 附近任务" help={PAGE_HELP.bounties}>
      <BackLink to="/day1" />
      <div className="bounty-list">
        {BOUNTIES.map((bounty, index) => (
          <article key={bounty.id} className="stone-slab"><span>{String(index + 1).padStart(2, '0')}</span><div><p>{bounty.npc} · {bounty.place}</p><h3>{bounty.title}</h3><strong>可能奖励 · {bounty.reward}</strong><small>{bounty.note}</small></div></article>
        ))}
      </div>
    </AppShell>
  );
}

export function MaskRitePage() {
  const { local, snapshot, refresh: refreshSession } = useSession();
  const { preview, refresh } = usePreview();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedVirtue, setSelectedVirtue] = useState<VirtueId | null>(preview.selected_virtue ?? null);

  useEffect(() => {
    if (preview.selected_virtue) setSelectedVirtue(preview.selected_virtue);
  }, [preview.selected_virtue]);

  function previewVirtue(virtue: VirtueId) {
    setSelectedVirtue(virtue);
    sessionStorage.setItem('yelang.paint.virtue', virtue);
  }

  async function writeMotto() {
    if (!local) return;
    setBusy(true);
    setError('');
    try {
      await post('/api/ai/mask-motto');
      await Promise.allSettled([refresh(), refreshSession()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  const riteState = preview.state || snapshot?.player.state || local?.state;
  const canEnterWall = Boolean(riteState && ['MASK_CRAFTING', 'FIRE_NIGHT', 'FACTION_LOCKED', 'DAY2_PREPARING', 'BATTLE_R1', 'BATTLE_R2', 'BATTLE_R3', 'ENDING'].includes(riteState));

  return (
    <AppShell day={1} pageTitle="归面 · 数字面" help={PAGE_HELP.mask}>
      <BackLink to="/day1" />
      <div className="mask-rite-stage"><MaskView parts={preview.svg_parts} virtue={selectedVirtue} virtueMode glow /><p>{preview.name || '未名白面'}</p><blockquote>{preview.motto || '你做过的事尚在落墨。'}</blockquote></div>
      <fieldset className="stroke-picker virtue-picker mask-virtue-picker">
        <legend>选一德预览你的傩面</legend>
        {VIRTUE_OPTIONS.map((virtue) => (
          <label key={virtue.id} className={selectedVirtue === virtue.id ? 'is-selected' : ''}>
            <input type="radio" name="mask-virtue" value={virtue.id} checked={selectedVirtue === virtue.id} onChange={() => previewVirtue(virtue.id)} />
            <img className="virtue-mark" src={`/assets/virtues-cutout/${virtue.id}.png`} alt="" aria-hidden="true" />
            <strong>{virtue.name}</strong>
          </label>
        ))}
      </fieldset>
      <ErrRite message={error} />
      <div className="mask-actions"><RiteButton kind="ink" disabled={busy} onClick={() => void writeMotto()}>{busy ? '面语落墨中…' : '请说面人整理面语'}</RiteButton>{canEnterWall ? <Link to="/paint-wall" className="wide-link is-ember">前往傩面共绘 <span aria-hidden="true">→</span></Link> : <span className="wide-link is-disabled" aria-disabled="true">先生成面语，再进入共绘</span>}</div>
    </AppShell>
  );
}
