#!/bin/bash

# 終了時に子プロセスも終了させる
cleanup() {
  echo "Shutting down services..."
  kill $(jobs -p) 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM EXIT

# プロジェクトルートのパスを取得
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=================================================="
echo "Starting Zenn Hackathon App (Backend & Frontend)"
echo "=================================================="

# Backendの起動
echo "[Backend] Starting..."
cd "$PROJECT_ROOT/backend"

# 仮想環境のuvicornを使用する
if [ -f ".venv/bin/uvicorn" ]; then
    .venv/bin/uvicorn app.main:app --reload --port 8000 &
else
    echo "[Backend] Warning: .venv/bin/uvicorn not found. Using system uvicorn."
    uvicorn app.main:app --reload --port 8000 &
fi
BACKEND_PID=$!
echo "[Backend] PID: $BACKEND_PID"

# Frontendの起動
echo "[Frontend] Starting..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "[Frontend] PID: $FRONTEND_PID"

echo "=================================================="
echo "Both services started. Press Ctrl+C to stop."
echo "=================================================="

# プロセス終了を待機
wait
