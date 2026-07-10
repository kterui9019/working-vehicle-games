# kids-games（working-vehicle-games）

子ども向けブラウザゲーム集。GitHub Pages で公開しています。

## 公開サイト

**https://kterui9019.github.io/working-vehicle-games/**

| パス | ゲーム |
|------|--------|
| `/` | ポータル（ゲーム選択） |
| `/vehicles/` | さぎょうしゃ（ショベル・トラクター・ブルドーザー） |
| `/cook/` | おうちでコックさん（ハンバーグ・オムライス・ピザ） |

## 開発

```bash
npm install
npm run dev          # 作業車ゲーム（Vite）
# クッキングは静的 HTML なので cook/ をブラウザで開くか、任意の静的サーバで
npx serve cook
```

## デプロイ

`main` ブランチへの push で GitHub Actions が自動ビルド・デプロイします。

- ワークフロー: `.github/workflows/deploy.yml`
- ビルド: `npm run build` → `dist/`（portal + cook + vehicles）
- リポジトリ: https://github.com/kterui9019/working-vehicle-games

### 注意

GitHub Pages はサブパス（`/working-vehicle-games/`）で配信されます。

- 作業車: `vehicles/vite.config.js` の `base: "/working-vehicle-games/vehicles/"` を変更しない
- クッキング: 相対パス参照のため `cook/` 配下で完結させる
