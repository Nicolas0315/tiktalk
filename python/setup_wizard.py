"""
TikTalk セットアップウィザード
初回セットアップを自動化するスクリプト。
進捗はJSONL形式で標準出力に出力する。
"""

import json
import subprocess
import sys
import os
import shutil
import platform
import webbrowser
import urllib.request
import tempfile


def emit(step, status, message, **extra):
    """進捗をJSONL形式で出力"""
    data = {"step": step, "status": status, "message": message, **extra}
    print(json.dumps(data, ensure_ascii=False), flush=True)


def check_python():
    """Step 1: Pythonがインストール済みか確認"""
    emit(1, "running", "Pythonを確認中...")

    # python コマンドが使えるか確認
    python_cmd = shutil.which("python") or shutil.which("python3")

    if python_cmd:
        try:
            result = subprocess.run(
                [python_cmd, "--version"],
                capture_output=True, text=True, timeout=10
            )
            version = result.stdout.strip() or result.stderr.strip()
            emit(1, "ok", f"{version} が見つかりました ✅")
            return True
        except Exception:
            pass

    # Pythonが見つからない
    emit(1, "error", "Pythonが見つかりません 😢", action="install_python")
    return False


def install_python():
    """Pythonの公式インストーラーをダウンロードしてブラウザで開く"""
    emit(1, "running", "Pythonインストーラーをダウンロード中...")

    url = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
    try:
        tmp_dir = tempfile.gettempdir()
        installer_path = os.path.join(tmp_dir, "python-3.11.9-amd64.exe")

        urllib.request.urlretrieve(url, installer_path)
        emit(1, "running", "インストーラーを起動します... 画面の指示に従ってインストールしてください 📦")
        emit(1, "running", "⚠ 「Add Python to PATH」にチェックを入れてください！")

        # インストーラーを起動
        os.startfile(installer_path)

        emit(1, "waiting", "Pythonをインストールしたら「確認する」を押してください", action="recheck_python")
        return False
    except Exception as e:
        emit(1, "error", f"ダウンロードに失敗しました: {e}", action="install_python")
        return False


def install_dependencies():
    """Step 2: pip install -r requirements.txt を実行"""
    emit(2, "running", "パッケージをインストール中... ⏳")

    # requirements.txt のパスを特定
    script_dir = os.path.dirname(os.path.abspath(__file__))
    req_path = os.path.join(script_dir, "requirements.txt")

    if not os.path.exists(req_path):
        emit(2, "error", "requirements.txt が見つかりません 😢")
        return False

    python_cmd = shutil.which("python") or shutil.which("python3") or "python"

    try:
        process = subprocess.Popen(
            [python_cmd, "-m", "pip", "install", "-r", req_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        for line in process.stdout:
            line = line.strip()
            if line:
                # pip の進捗メッセージをリアルタイム転送
                emit(2, "running", line)

        process.wait()

        if process.returncode == 0:
            emit(2, "ok", "パッケージのインストール完了 ✅")
            return True
        else:
            emit(2, "error", "パッケージのインストールに失敗しました 😢")
            return False

    except Exception as e:
        emit(2, "error", f"インストール中にエラー: {e}")
        return False


def check_tts():
    """Step 3: Style-Bert-VITS2 の疎通確認"""
    emit(3, "running", "Style-Bert-VITS2 を確認中...")

    try:
        req = urllib.request.Request("http://localhost:5000/voice", method="HEAD")
        urllib.request.urlopen(req, timeout=5)
        emit(3, "ok", "Style-Bert-VITS2 が起動しています ✅")
        return True
    except Exception:
        emit(3, "error",
             "Style-Bert-VITS2 が起動していません 😢\nStyle-Bert-VITS2を起動してから「確認する」を押してください",
             action="check_tts",
             url="https://github.com/litagin02/Style-Bert-VITS2")
        return False


def complete_setup():
    """Step 4: セットアップ完了"""
    # 完了フラグファイルを作成
    flag_path = os.path.join(os.path.expanduser("~"), ".tiktalk_setup_done")
    try:
        with open(flag_path, "w") as f:
            f.write("setup completed")
        emit(4, "ok", "セットアップ完了！TikTalkを使い始めましょう 🎉🐻")
        return True
    except Exception as e:
        emit(4, "error", f"完了フラグの作成に失敗: {e}")
        return False


def main():
    """メイン処理: コマンドライン引数で実行するステップを指定"""
    if len(sys.argv) < 2:
        # 引数なし: 全ステップを順番に実行
        if not check_python():
            return
        if not install_dependencies():
            return
        if not check_tts():
            return
        complete_setup()
        return

    action = sys.argv[1]

    if action == "check_python":
        check_python()
    elif action == "install_python":
        install_python()
    elif action == "recheck_python":
        check_python()
    elif action == "install_deps":
        install_dependencies()
    elif action == "check_tts":
        check_tts()
    elif action == "complete":
        complete_setup()
    elif action == "full":
        # 全ステップ実行
        if not check_python():
            return
        if not install_dependencies():
            return
        if not check_tts():
            return
        complete_setup()
    else:
        emit(0, "error", f"不明なアクション: {action}")


if __name__ == "__main__":
    main()
