---
name: conservatory-pro-tools
description: 音大生が練習室・合わせ・演奏会運営で実用できるWeb Audio高精度ツール群を実装・検証するスキル
---
# Conservatory-Grade Music Student Tools

## 品質基準
1. **Web Audio API の鉄則**:
   - メトロノームは `setInterval` 単体で音を鳴らしてはならない。必ず `AudioContext.currentTime` のルックアヘッド・スケジューラ（25ms周期で100ms先まで予約）を使用し、ジッター（揺らぎ）ゼロを実現する。
   - iOS Safari / Android の自動再生制限に対応するため、初回タップ時に無音バッファ再生＋ `audioCtx.resume()` を行うアンロック機構を必ず実装する。
2. **純正律・基準音ドローン**:
   - 単純なサイン波だけでなく、倍音（基音 + 第2倍音 + 第3倍音 + 第4倍音 + ローパスフィルタ）をブレンドした「耳が痛くならないチェロ/オルガン風ドローン音色」を実装する。
   - $A = 415\text{Hz}$ (Baroque), $430\text{Hz}$ (Classical), $440\text{Hz}$, $441\text{Hz}$, $442\text{Hz}$ (標準), $443\text{Hz}$ をワンタップ切替＋1Hz単位微調整可能にする。
   - 根音に対して **純正律（Just Intonation: 完全5度 $3/2$、長3度 $5/4$、短3度 $6/5$）** と **平均律（Equal Temperament）** を切り替えられるハーモニー同時再生機能を実装する。
