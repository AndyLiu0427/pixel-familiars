# 像素魔寵 Pixel Familiars

離線也能掛機的像素風魔寵養成遊戲。瀏覽器直接玩,也可以安裝到電腦桌面,
不必一直開著分頁,關掉遊戲收益照樣累積。

An offline-capable idle pixel pet-raising game. Runs in any browser, installs
to the desktop as a PWA, and keeps earning while closed.

## 玩法

- 最多 4 隻魔寵自動戰鬥推關,每 10 波一場頭目戰,打贏進入新區域
- 擊殺掉金幣與經驗,魔寵升級,Lv.10 與 Lv.25 進化(幼體 → 成體 → 完全體)
- 寶石孵蛋抽新魔寵,5 種稀有度,11 種魔寵(含隱藏魔寵),40 抽保底傳說
- 合成升星:重複魔寵自動轉為碎片,升星最高 5 星(+25% 能力/星、等級上限 +10/星)
- 圖鑑:11 種 x 一般/異色(1% 機率)共 22 格,每格永久全隊加成,
  里程碑送寶石、免費蛋、隱藏魔寵「虛空龍」、黃金畫框
- 裝備:武器/護甲/護符三槽,怪物與頭目掉落,一鍵最強裝備、分解成塵晶熔鑄強化
- 每日登入獎勵 7 天循環;金幣買全隊強化:攻擊、生命、金幣掉落、離線收益上限
- 離線收益:關掉遊戲後按時間結算(預設上限 8 小時,可升級到 24 小時),
  回來時看廣告可以領雙倍

## 本地執行

零建置、零依賴。任何靜態伺服器都行:

```bash
npm start          # python3 -m http.server 8360
# 打開 http://localhost:8360
```

測試(核心邏輯 22 條):

```bash
npm test
```

## 部署(GitHub Pages)

整個資料夾就是成品,推上去即可:

```bash
gh repo create pixel-familiars --public --source . --push
gh api repos/{owner}/pixel-familiars/pages -X POST \
  -f build_type=legacy -f "source[branch]=main" -f "source[path]=/"
```

Netlify、Cloudflare Pages、Vercel 也都可以,拖進去就上線。
HTTPS 是 PWA 安裝與 AdSense 的必要條件,以上平台都內建。

## 廣告盈利設定(Google AdSense H5 Games Ads)

程式已內建 Ad Placement API 接入,未設定時使用模擬廣告,所有流程照常可玩。

1. 申請 [AdSense](https://adsense.google.com) 帳號(已有帳號可直接用)
2. 部署遊戲到正式網域,在 AdSense 新增並驗證該網站
3. 申請 [H5 Games Ads](https://adsense.google.com/start/h5-games-ads/)
   (AdSense 帳號內申請 Ad Placement API 權限)
4. 核准後,把發布商編號填入 `js/config.js`:

```js
adClient: 'ca-pub-你的編號',
```

### 廣告版位(獎勵式優先,體驗換收益)

| 版位 | 型態 | 觸發 |
| --- | --- | --- |
| 離線收益雙倍 | rewarded | 回到遊戲的歡迎視窗 |
| 免費魔寵蛋 | rewarded | 孵蛋頁,6 小時冷卻 |
| 25 寶石 | rewarded | 孵蛋頁,隨時 |
| 狩獵加速 x2 | rewarded | 戰鬥畫面,10 分鐘效果 |
| 過場廣告 | interstitial | 進入新區域,最少間隔 5 分鐘 |

獎勵式廣告是 H5 遊戲 eCPM 最高的格式,而且玩家主動觀看,
留存傷害最小。過場廣告有頻率保護,不會洗版。

## 專案結構

```
index.html            入口與 app shell
css/style.css         像素暗色奇幻主題
js/config.js          廣告編號與遊戲節奏參數
js/data.js            魔寵、區域、怪物、強化、平衡曲線
js/sprites.js         16x16 手工像素圖與渲染器
js/game.js            戰鬥模擬、離線結算(純邏輯,可測試)
js/save.js            localStorage 存檔、匯出匯入
js/ads.js             AdSense adBreak 包裝與開發模擬廣告
js/battle.js          Canvas 戰鬥場景與特效
js/ui.js              面板、彈窗、多語系 UI
js/main.js            啟動流程與遊戲迴圈
sw.js                 Service worker(離線快取)
tools/gen_icons.py    PWA 圖示產生器
test/logic.test.js    node --test 邏輯測試
```

## 發版注意

改動任何前端檔案後,把 `sw.js` 開頭的 `CACHE` 版本號 +1
(例如 `pixel-familiars-v2`),已安裝的玩家才會拿到新版。

## 授權

MIT
