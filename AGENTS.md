# AGENTS.md

## プロジェクト概要

このリポジトリは、子供向けのボイスチェンジャーアプリです。
音声を録音し、エフェクトをかけて再生します。

- フレームワーク: Expo SDK 54
- ルーティング: expo-router
- 言語: TypeScript / React Native
- 主な画面:
  - `app/index.tsx`
  - `app/recordings.tsx`
- 録音・再生処理:
  - `hooks/useVoiceRecorder.ts`
  - `hooks/useVoicePlayer.ts`
- ファイル操作:
  - `utils/fileManager.ts`

## 開発コマンド

依存関係のインストール:

```bash
npm install
```

スマホ実機で確認する場合:

```bash
npx expo start --tunnel
```

Lint の実行:

```bash
npm run lint
```

その他のスクリプト:

```bash
npm run start
npm run android
npm run ios
npm run web
```

## 動作確認

変更をコミットする前に、必ず以下を実行してください。

```bash
npm run lint
```

型チェックが必要な変更では以下も実行してください。

```bash
npx tsc --noEmit
```

画面表示や録音・再生などの挙動を変更した場合は、Expo Go を使ってスマホ実機でも確認してください。
WSL や Termux と PC を組み合わせて開発している場合は、`--tunnel` の利用を推奨します。

Android ネイティブ連携や `android/` 配下を変更した場合は、Expo Go では確認できません。
その場合は APK または開発ビルドで実機確認してください。

## Android / APK ビルド

このプロジェクトは Android ネイティブ連携を含むため、`android/` を git 管理対象にしています。
`android/.gitignore` により、Gradle キャッシュや APK などのビルド成果物は除外します。

ローカルで release APK を作る場合:

```bash
cd android
./gradlew assembleRelease
```

出力先:

```bash
android/app/build/outputs/apk/release/app-release.apk
```

この release APK は現在 debug keystore で署名されています。
個人確認用には使えますが、正式配布用の署名ではありません。

GitHub Actions で APK を作る場合:

- `.github/workflows/android-apk.yml` を使用します。
- `main` 向け Pull Request の作成・更新時に実行されます。
- GitHub の Actions 画面から `workflow_dispatch` で手動実行できます。
- 成功後、workflow run の `Artifacts` から `app-release` をダウンロードできます。
- artifact の保存期間は 7 日です。

## コーディング方針

- 既存の Expo Router 構成に従ってください。
- 状態を持つ処理や複数画面で使う処理は、必要に応じて hooks にまとめてください。
- ファイル保存・削除・リネームなどの処理は、原則として `utils/fileManager.ts` に集約してください。
- 変更はできるだけ小さく、目的に対して直接的にしてください。
- 関係のないファイルの書き換えや大きなリファクタリングは避けてください。
- 既存の TypeScript / React Native の書き方に合わせてください。
- 可能な限り、すでに導入されている Expo API を優先して使ってください。

## Expo / モバイル開発メモ

スマホ実機で確認する場合は、基本的に以下を使ってください。

```bash
npx expo start --tunnel
```

録音ファイルは現在、アプリ専用の保存領域に保存されています。
Android の Files アプリから見える場所に保存したい場合は、Android の scoped storage の制約があるため、Storage Access Framework や共有・エクスポート機能の利用を検討してください。

音程変更は React Native のみではなく、Android ネイティブ連携で実装しています。
Android 側の `AndroidPitchPlayerModule.kt` が ExoPlayer を使い、`PlaybackParameters(speed = 1.0f, pitch = ...)` で再生速度を固定したまま音程を変更します。
`expo-av` が既に依存している ExoPlayer を利用しており、Android 標準の `MediaPlayer` 方式は採用していません。

## Git 運用

- 変更作業は feature/fix ブランチを作成して行ってください。
- コミットは目的ごとに小さくまとめてください。
- コミット前に `npm run lint` を実行してください。
- ブランチを push し、`main` 向けに Pull Request を作成してください。

## 既知の注意点

- 現在 `expo-av` を使用しており、Expo SDK 54 では非推奨警告が出る場合があります。
- `expo-av` から `expo-audio` / `expo-video` への移行は、明示的に依頼された場合のみ行ってください。
