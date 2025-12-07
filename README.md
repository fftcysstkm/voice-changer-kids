# Voice Changer Kids

子供向けのボイスチェンジャーアプリです。
声を録音し、「Monster（低い声）」「Normal（普通）」「Alien（高い声）」のエフェクトをかけて再生できます。

## 開発環境での実行方法 (Development)

このプロジェクトは Expo を使用しています。
WSL (Windows Subsystem for Linux) 環境で開発する場合、ネットワーク接続の問題を回避するために `--tunnel` オプションの使用を推奨します。

### 1. 依存関係のインストール
```bash
npm install
```

### 2. アプリの起動 (WSL/Tunnelモード)
以下のコマンドを実行すると、QRコードが表示されます。
Expo GoアプリでQRコードを読み取って実行してください。

```bash
npx expo start --tunnel
```

> **Note**: 初回実行時に `@expo/ngrok` のインストールを求められる場合がありますが、画面の指示に従ってインストールしてください。

## クラウドでのビルド方法 (EAS Build)

スマホに直接インストールできるアプリ (APKファイル) を作成するには、EAS Build を使用します。

### 1. Expo CLI へのログイン
ビルドには Expo アカウントが必要です。
```bash
npx eas-cli login
```

### 2. ビルドの実行 (Android)
以下のコマンドでクラウドビルドを開始します。
```bash
npx eas-cli build -p android --profile preview
```

ビルドが完了すると、ターミナルにQRコードが表示されます。
これを Android 端末で読み取ることで、アプリを直接インストールして動作確認ができます。

## 機能
- **録音**: マイクボタンをタップして録音開始/停止。
- **再生**: エフェクトボタン (Monster/Normal/Alien) をタップすると、即座にその声色で再生されます。
