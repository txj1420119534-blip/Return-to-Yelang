import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../output/playwright');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5173';
const mobileWidth = Number(process.env.YELANG_QA_WIDTH ?? 390);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const contextOptions = {
  viewport: { width: mobileWidth, height: mobileWidth === 375 ? 812 : 844 },
  deviceScaleFactor: 2,
  locale: 'zh-CN',
  permissions: ['camera', 'geolocation'],
  geolocation: { latitude: 26.583, longitude: 106.717 }
};
let context = await browser.newContext(contextOptions);
let page = await context.newPage();
page.setDefaultTimeout(15000);

async function snap(name) {
  await page.screenshot({ path: join(outDir, name), fullPage: false, timeout: 8000 });
  console.log('shot', name);
}

async function settleMotion() {
  await page.evaluate(async () => {
    const finite = document.getAnimations().filter((animation) => animation.effect?.getTiming().iterations !== Infinity);
    await Promise.allSettled(finite.map((animation) => animation.finished));
  });
}

try {
  for (const path of ['/day1', '/day2', '/battle', '/ending', '/admin']) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/enroll');
  }
  console.log('anonymous route guards OK');

  await page.evaluate(() => {
    localStorage.setItem('yelang.session', JSON.stringify({
      player_id: 'expired-player',
      token: 'expired-token',
      event_id: 'expired-event',
      state: 'DAY1',
      name: '旧行程玩家'
    }));
    sessionStorage.setItem('yelang.opening.seen', '1');
  });
  await page.goto(`${baseUrl}/day1`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/enroll');
  await page.getByText('当前行程凭证已失效，请重新领取白面。', { exact: true }).waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => localStorage.getItem('yelang.session')), null);
  console.log('expired session recovery OK');

  await context.close();
  context = await browser.newContext(contextOptions);
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${baseUrl}/enroll`, { waitUntil: 'domcontentloaded' });
  await page.locator('.cinematic--opening').waitFor({ state: 'visible' });
  await settleMotion();
  await snap('01-opening-cinematic.png');
  await page.locator('#player-name').waitFor({ state: 'visible', timeout: 9000 });
  await snap('02-enroll-white-mask.png');

  await page.locator('#player-name').fill('评委甲');
  await page.getByRole('button', { name: '领取白色面具' }).click();
  await page.waitForURL('**/day1');
  await settleMotion();
  await page.locator('.app-brand-logo').waitFor({ state: 'visible' });
  assert.equal(await page.getByText('贵客松项目').count(), 0);
  assert.equal(await page.getByText('当前主线').count(), 0);
  assert.equal(await page.getByText('附近悬赏').count(), 0);
  await page.getByRole('heading', { name: '傩面之义' }).waitFor({ state: 'visible' });
  await page.getByText('MASK VIRTUES', { exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('heading', { name: '今日行动' }).waitFor({ state: 'visible' });
  for (const label of ['仁', '义', '礼', '智', '信']) await page.locator('.frag-pip b', { hasText: label }).waitFor({ state: 'visible' });
  const virtueImages = page.locator('.frag-pip img');
  assert.equal(await virtueImages.count(), 5);
  assert.equal(await virtueImages.evaluateAll((images) => images.every((image) => image.getAttribute('src')?.startsWith('/assets/day1/virtue-') && image.complete && image.naturalWidth > 0)), true);
  await page.getByLabel('选择演示时辰').selectOption('19:20');
  assert.equal((await page.locator('.live-clock time').textContent())?.trim(), '19:20');
  await snap('03-day1-workbench.png');
  await page.getByRole('button', { name: '打开地图' }).click();
  await page.getByRole('heading', { name: '谷中地图' }).waitFor();
  await page.getByRole('button', { name: '放大地图' }).click();
  await page.getByText('125%', { exact: true }).waitFor();
  const day1MapImage = page.locator('.valley-map .map-base-image');
  assert.equal(await day1MapImage.evaluate((image) => image.getAttribute('src') === '/assets/ui/map.jpg' && image.complete && image.naturalWidth > 0), true);
  assert.equal(await page.locator('.valley-map svg').count(), 0);
  await snap('03a-day1-map-dialog.png');
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '打开当日日程' }).click();
  await page.getByRole('heading', { name: /DAY ONE · 完整日程/ }).waitFor();
  const day1ScheduleDialog = page.getByRole('dialog');
  await day1ScheduleDialog.getByText('19:20', { exact: true }).waitFor();
  await day1ScheduleDialog.getByText('20:15', { exact: true }).waitFor();
  assert.equal(await day1ScheduleDialog.getByText(/大面破裂/).count(), 0);
  await snap('03b-day1-schedule-dialog.png');
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '打开个人傩面' }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await snap('03c-personal-mask-qr.png');
  await page.getByRole('button', { name: '关闭', exact: true }).click();

  await page.getByRole('link', { name: /探索/ }).first().click();
  await page.waitForURL('**/day1/explore');
  await page.getByRole('heading', { name: '让景点进入镜头' }).waitFor();
  await page.getByRole('button', { name: '拍摄并识别' }).waitFor();
  await page.getByText('调试模式', { exact: true }).click();
  for (const beast of ['寻源兽·鱼', '破界兽·飞鸟', '照心兽·日面', '负山兽·驮城', '听世兽·长喙', '两极兽·双首']) {
    await page.getByRole('button', { name: new RegExp(beast) }).waitFor({ state: 'visible' });
  }
  assert.equal(await page.getByText('附近可探索').count(), 0);
  await page.getByRole('button', { name: /寻源兽·鱼/ }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.getByText('来源 · 《夜郎神兽》项目设定', { exact: true }).waitFor();
  await snap('04-explore-result.png');
  await page.getByRole('button', { name: '关闭', exact: true }).click();

  await page.getByRole('link', { name: /返回工具台/ }).click();
  await page.getByRole('link', { name: /收藏/ }).first().click();
  await page.waitForURL('**/day1/collection');
  assert.equal(await page.locator('input[type="file"]').count(), 0);
  await page.getByRole('button', { name: '打开相机' }).click();
  await page.waitForFunction(() => {
    const video = document.querySelector('.craft-camera video');
    return video instanceof HTMLVideoElement && video.videoWidth > 0 && video.videoHeight > 0;
  });
  await page.getByRole('button', { name: '拍下手作' }).click();
  await page.locator('#craft-name').fill('评委的手作');
  await page.getByRole('button', { name: '保存到展区' }).click();
  await page.getByRole('heading', { name: '评委的手作' }).waitFor({ state: 'visible' });
  await snap('04b-collection-camera.png');
  await page.getByRole('button', { name: '删除藏品评委的手作' }).click();
  await page.getByRole('heading', { name: '展区还空' }).waitFor({ state: 'visible' });
  await page.getByRole('link', { name: /返回工具台/ }).click();
  await page.getByRole('link', { name: /归面/ }).click();
  await page.waitForURL('**/day1/mask');
  await snap('05-mask-rite.png');
  await page.getByRole('button', { name: /整理面语/ }).click();
  await page.getByRole('link', { name: /前往傩面共绘/ }).click();
  await page.waitForURL('**/paint-wall');
  await page.locator('.virtue-picker label', { hasText: '礼' }).click();
  const chosenCell = page.getByRole('button', { name: /共面第 8 格/ });
  await chosenCell.click();
  assert.equal(await chosenCell.getAttribute('aria-pressed'), 'true');
  await chosenCell.locator('img').waitFor({ state: 'visible' });
  await chosenCell.getByText('礼', { exact: true }).waitFor();
  await page.getByRole('button', { name: /确认落下唯一一笔/ }).click();
  await page.getByRole('button', { name: '这一笔已写入' }).waitFor({ state: 'visible' });
  assert.equal(await page.getByText('道纹已由账本确认').count(), 0);
  assert.equal(await page.locator('.wall-dance img').evaluate((image) => image.getAttribute('src') === '/assets/day1/dance.png' && image.complete && image.naturalWidth > 0), true);
  await snap('06-paint-wall-written.png');

  const day2 = page.locator('.day-switcher button').nth(1);
  await day2.waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelectorAll('.day-switcher button')[1]?.hasAttribute('disabled'));
  await day2.click();
  await page.locator('.cinematic--rupture').waitFor({ state: 'visible' });
  await snap('07-mask-rupture.png');
  const continueToDay2 = page.getByRole('button', { name: '进入 DAY 02' });
  if (await continueToDay2.isVisible().catch(() => false)) await continueToDay2.click();
  await page.waitForURL('**/day2', { timeout: 9000 });
  await settleMotion();
  const rulesDialog = page.getByRole('dialog');
  await rulesDialog.getByRole('heading', { name: '开城之战 · 完整玩法' }).waitFor();
  for (const rule of ['先取资源', '按阵营行动', '扫码才会结算', '粮草改变伤害', '争哨站看路线']) await rulesDialog.getByText(rule, { exact: true }).waitFor();
  await rulesDialog.getByRole('button', { name: '我已知晓，进入战局' }).click();
  assert.equal(await page.locator('.day2-map-dock').count(), 0);
  assert.equal(await page.locator('.day2-map').count(), 0);
  assert.equal(await page.getByText('PREPARING', { exact: true }).count(), 0);
  await page.getByRole('button', { name: '切换阵营' }).waitFor();
  await page.getByText('仅 Demo 版本', { exact: true }).waitFor();
  await page.getByRole('link', { name: /护送任务/ }).waitFor();
  await snap('08-day2-workbench.png');
  await page.getByRole('button', { name: '打开地图' }).click();
  await page.getByRole('heading', { name: /开城之战 · 地图/ }).waitFor();
  await page.locator('.day2-map').waitFor({ state: 'visible' });
  const day2MapImage = page.locator('.day2-map .map-base-image');
  assert.equal(await day2MapImage.evaluate((image) => image.getAttribute('src') === '/assets/ui/map.jpg' && image.complete && image.naturalWidth > 0), true);
  assert.equal(await page.locator('.map-route').count(), 3);
  assert.equal(await page.locator('.map-route.is-selected').count(), 0);
  await settleMotion();
  await snap('08b-day2-map-dialog.png');
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '打开当日日程' }).click();
  await page.getByRole('heading', { name: /DAY TWO · 完整日程/ }).waitFor();
  for (const time of ['09:00–11:00', '11:00–12:00', '12:00–12:20', '12:20–12:40', '12:40–13:00', '13:00']) await page.getByRole('dialog').getByText(time, { exact: true }).waitFor();
  await page.getByRole('button', { name: '关闭', exact: true }).click();

  await page.getByRole('link', { name: /资源/ }).first().click();
  await page.waitForURL('**/day2/resources');
  await page.getByText('粮草数量将影响伤害倍率。', { exact: true }).waitFor();
  await snap('09-day2-resources.png');
  await page.getByRole('link', { name: /返回工具台/ }).click();

  await page.locator('a[href="/day2/tasks"]').click();
  await page.waitForURL('**/day2/tasks');
  for (const task of ['搬运城门工材', '护送密封补给', '侦察任意哨站', '向队友说面']) await page.getByRole('heading', { name: task }).waitFor();
  await settleMotion();
  await snap('09b-day2-tasks.png');
  await page.getByRole('link', { name: /返回工具台/ }).click();

  await page.getByRole('button', { name: '切换阵营' }).click();
  await page.getByText('演示阵营已切换为新火盟。', { exact: true }).waitFor();
  await page.getByRole('link', { name: /伏击任务/ }).waitFor();
  await page.getByRole('link', { name: /攻城掠地/ }).waitFor();
  await page.getByRole('button', { name: '切换阵营' }).click();
  await page.getByText('演示阵营已切换为守文盟。', { exact: true }).waitFor();
  await page.getByRole('link', { name: /护送任务/ }).first().click();
  await page.getByRole('button', { name: /确认报名护送/ }).click();
  await page.getByText(/报名已写入/).waitFor({ state: 'visible' });
  await snap('10-convoy-registered.png');
  await page.getByRole('button', { name: '打开地图' }).click();
  await page.locator('.map-route--a.is-selected').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '模拟扫描起点' }).click();
  await page.getByText(/模拟扫码已核验/).waitFor();
  await page.getByRole('button', { name: '模拟扫描终点' }).click();
  await page.getByText(/护送车 A 抵达终点|模拟扫码已核验/).waitFor();
  await page.getByRole('link', { name: /返回工具台/ }).click();
  await page.locator('.tool-card.is-disabled', { hasText: '任务' }).waitFor();

  await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /运营总览/ }).waitFor();
  await snap('11-admin-mobile.png');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.reload({ waitUntil: 'networkidle' });
  await snap('12-admin-desktop.png');

  console.log(`OK final pre-UI-material walk complete at ${mobileWidth}px`);
} catch (error) {
  await snap('zz-error.png');
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
