# AGENTS.md

AI エージェント向けのプロジェクトメモ。

## 概要

- Vite + Three.js の静的フロントエンドゲーム
- モード: ショベルカー（`src/Game.js`）、トラクター（`src/TractorGame.js`）
- エントリ: `src/main.js` / `index.html`

## デプロイ（GitHub Pages）

本番は **GitHub Pages** で公開している。手動デプロイや別ホスティングへの切り替えは行わない（ユーザーが明示的に依頼した場合を除く）。

| 項目 | 値 |
|------|-----|
| 公開 URL | https://kterui9019.github.io/working-vehicle-games/ |
| リポジトリ | https://github.com/kterui9019/working-vehicle-games |
| デプロイ方法 | `main` への push → GitHub Actions（`.github/workflows/deploy.yml`） |
| ビルドコマンド | `npm run build` |
| 成果物 | `dist/` |

### 変更時の注意

- `vite.config.js` の `base: "/working-vehicle-games/"` は GitHub Pages のサブパス配信に必須。不用意に削除・変更しない。
- `dist/` は `.gitignore` 済み。コミットしない。
- デプロイ確認は push 後、Actions の完了を待って公開 URL を確認する。

## ローカル開発

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド（ローカル確認用）
npm run preview  # dist のプレビュー（base パス込み）
```

## コーディング方針

- 既存の Three.js / ジョイスティック UI のパターンに合わせる
- スコープ外のリファクタや無関係ファイルの編集は避ける
- ユーザーが求めていない markdown ファイルは追加しない（README / AGENTS.md は例外）