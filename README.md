# working-vehicle-games

子ども向けの作業車ゲーム（ショベルカー・トラクター）。Vite + Three.js で動くブラウザゲームです。

## 公開サイト

GitHub Pages でホスティングしています。

**https://kterui9019.github.io/working-vehicle-games/**

## 開発

```bash
npm install
npm run dev
```

`http://localhost:5173` でローカルプレビューできます。

## デプロイ

`main` ブランチへの push で GitHub Actions が自動ビルド・デプロイします。

- ワークフロー: `.github/workflows/deploy.yml`
- ビルド出力: `dist/`
- リポジトリ: https://github.com/kterui9019/working-vehicle-games

手動で再デプロイする場合は、GitHub の Actions タブから「Deploy to GitHub Pages」を `workflow_dispatch` で実行できます。

### 注意

GitHub Pages はサブパス（`/working-vehicle-games/`）で配信されるため、`vite.config.js` の `base` を変更しないでください。ローカル開発は `npm run dev` を使えば `base` の影響を受けません。