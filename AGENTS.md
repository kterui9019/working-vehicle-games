# AGENTS.md

AI エージェント向けのプロジェクトメモ。

## 概要

GitHub Pages 上の子ども向けゲーム集（1 リポジトリ・同居配信）。

| パス | 内容 | 技術 |
|------|------|------|
| `/` | ポータル | 静的 HTML |
| `/vehicles/` | さぎょうしゃ | Vite + Three.js |
| `/cook/` | おうちでコックさん | 静的 HTML/CSS/JS |
| `/toilet/` | トイレいけるかな？ | 静的 HTML/CSS/JS |

- 作業車エントリ: `vehicles/index.html` / `vehicles/src/main.js`
- クッキング: `cook/index.html` / `cook/app.js` / `cook/style.css`
- トイレ練習: `toilet/index.html` / `toilet/app.js` / `toilet/style.css`
- ポータル: ルート `index.html`

## デプロイ（GitHub Pages）

本番は **GitHub Pages** で公開。手動デプロイや別ホスティングへの切り替えは行わない（ユーザーが明示的に依頼した場合を除く）。

| 項目 | 値 |
|------|-----|
| 公開 URL | https://kterui9019.github.io/working-vehicle-games/ |
| リポジトリ | https://github.com/kterui9019/working-vehicle-games |
| デプロイ方法 | `main` への push → GitHub Actions（`.github/workflows/deploy.yml`） |
| ビルドコマンド | `npm run build`（`tools/build.mjs`） |
| 成果物 | `dist/`（index + cook/ + toilet/ + vehicles/） |

### 変更時の注意

- `vehicles/vite.config.js` の `base: "/working-vehicle-games/vehicles/"` は必須
- `dist/` は `.gitignore` 済み。コミットしない
- クッキング・トイレはビルド不要。`cook/` `toilet/` を `dist/` にコピーするだけ
- デプロイ確認は push 後、Actions 完了を待って公開 URL を確認

## ローカル開発

```bash
npm install
npm run dev          # 作業車
npm run build        # 全体ビルド
npx serve dist       # dist プレビュー（base パス込みは GitHub Pages 相当）
```

## コーディング方針

- ゲームごとに既存パターンに合わせる（作業車は Three.js / ジョイスティック、クッキング・トイレは DOM + CSS）
- スコープ外のリファクタや無関係ファイルの編集は避ける
- ユーザーが求めていない markdown は追加しない（README / AGENTS.md は例外）
