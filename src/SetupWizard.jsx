import React, { useState, useEffect } from 'react';

const styles = {
  container: {
    fontFamily: '"Segoe UI", "Yu Gothic UI", "Meiryo", sans-serif',
    maxWidth: 460,
    margin: '0 auto',
    padding: '24px 20px',
    background: '#1a1a2e',
    minHeight: '100vh',
    color: '#eee',
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: '#888',
    marginBottom: 32,
  },
  stepContainer: {
    marginBottom: 16,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  stepProgress: {
    fontSize: 12,
    color: '#888',
    marginLeft: 'auto',
  },
  messageBox: {
    background: '#0f0f23',
    borderRadius: 8,
    border: '1px solid #222',
    padding: '10px 14px',
    fontSize: 13,
    color: '#ccc',
    marginBottom: 8,
    maxHeight: 120,
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  actionButton: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#e94560',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginRight: 8,
    marginBottom: 8,
  },
  secondaryButton: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #555',
    background: '#333',
    color: '#ccc',
    fontSize: 14,
    cursor: 'pointer',
    marginRight: 8,
    marginBottom: 8,
  },
  launchButton: {
    display: 'block',
    width: '100%',
    padding: '14px 0',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c23152)',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 24,
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #222',
    margin: '16px 0',
  },
};

const STEP_ICONS = {
  pending: '⬜',
  running: '⏳',
  ok: '✅',
  error: '❌',
  waiting: '🔔',
};

function SetupWizard({ onComplete }) {
  const [steps, setSteps] = useState({
    1: { status: 'pending', message: '', action: null, url: null },
    2: { status: 'pending', message: '', action: null, url: null },
    3: { status: 'pending', message: '', action: null, url: null },
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [setupDone, setSetupDone] = useState(false);

  // セットアップ進捗を受信
  useEffect(() => {
    if (!window.tiktalk?.onSetupProgress) return;

    window.tiktalk.onSetupProgress((data) => {
      const { step, status, message, action, url } = data;

      if (step >= 1 && step <= 3) {
        setSteps((prev) => ({
          ...prev,
          [step]: { status, message, action: action || null, url: url || null },
        }));
        setCurrentStep(step);
      }

      // セットアップ完了（Step 4）
      if (step === 4 && status === 'ok') {
        setSetupDone(true);
      }
    });
  }, []);

  // セットアップ開始
  const handleStart = () => {
    if (window.tiktalk?.runSetup) {
      window.tiktalk.runSetup();
    }
  };

  // TTS再確認
  const handleCheckTTS = () => {
    if (window.tiktalk?.checkTTS) {
      window.tiktalk.checkTTS();
    }
  };

  // Python再確認
  const handleRecheckPython = () => {
    if (window.tiktalk?.runSetup) {
      window.tiktalk.runSetup('recheck_python');
    }
  };

  // セットアップ完了 → メイン画面へ
  const handleComplete = () => {
    if (window.tiktalk?.completeSetup) {
      window.tiktalk.completeSetup();
    }
    onComplete();
  };

  const stepNames = {
    1: 'Python 確認',
    2: 'パッケージインストール',
    3: 'Style-Bert-VITS2 確認',
  };

  const allStepsOk = steps[1].status === 'ok' && steps[2].status === 'ok' && steps[3].status === 'ok';
  const notStarted = currentStep === 0;

  return (
    <div style={styles.container}>
      <div style={styles.title}>TikTalk セットアップ 🐻</div>
      <div style={styles.subtitle}>はじめての設定をお手伝いします ✨</div>

      {notStarted && (
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: '#aaa', marginBottom: 16 }}>
            TikTalkを使うための準備をします 📦<br />
            ボタンを押してセットアップを開始してください！
          </p>
          <button style={styles.actionButton} onClick={handleStart}>
            セットアップを開始する 🚀
          </button>
        </div>
      )}

      {[1, 2, 3].map((stepNum) => {
        const step = steps[stepNum];
        const icon = STEP_ICONS[step.status] || '⬜';

        return (
          <div key={stepNum} style={styles.stepContainer}>
            <div style={styles.stepHeader}>
              <span style={styles.stepIcon}>{icon}</span>
              <span style={styles.stepTitle}>
                Step {stepNum}/3: {stepNames[stepNum]}
              </span>
              {step.status !== 'pending' && (
                <span style={styles.stepProgress}>
                  {step.status === 'running' ? '実行中...' :
                   step.status === 'ok' ? '完了' :
                   step.status === 'error' ? 'エラー' :
                   step.status === 'waiting' ? '待機中' : ''}
                </span>
              )}
            </div>

            {step.message && (
              <div style={styles.messageBox}>{step.message}</div>
            )}

            {/* エラー時のアクションボタン */}
            {step.status === 'error' && step.action === 'install_python' && (
              <div>
                <button
                  style={styles.actionButton}
                  onClick={() => {
                    if (window.tiktalk?.runSetup) {
                      window.tiktalk.runSetup('install_python');
                    }
                  }}
                >
                  Pythonをインストールする 📥
                </button>
              </div>
            )}

            {step.status === 'waiting' && step.action === 'recheck_python' && (
              <button style={styles.actionButton} onClick={handleRecheckPython}>
                もう一度確認する 🔄
              </button>
            )}

            {step.status === 'error' && step.action === 'check_tts' && (
              <div>
                {step.url && (
                  <button
                    style={styles.secondaryButton}
                    onClick={() => {
                      if (window.tiktalk?.runSetup) {
                        window.tiktalk.runSetup('open_url', step.url);
                      }
                    }}
                  >
                    Style-Bert-VITS2 の GitHub 📂
                  </button>
                )}
                <button style={styles.actionButton} onClick={handleCheckTTS}>
                  もう一度確認する 🔄
                </button>
              </div>
            )}

            {stepNum < 3 && <hr style={styles.divider} />}
          </div>
        );
      })}

      {(allStepsOk || setupDone) && (
        <button style={styles.launchButton} onClick={handleComplete}>
          TikTalkを起動する！ 🎉
        </button>
      )}
    </div>
  );
}

export default SetupWizard;
