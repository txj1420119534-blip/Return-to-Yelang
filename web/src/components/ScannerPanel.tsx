import { useCallback, useEffect, useRef, useState } from 'react';

type BarcodeResult = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: ImageBitmapSource) => Promise<BarcodeResult[]> };
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function getDetector(): BarcodeDetectorLike | null {
  const Detector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Detector) return null;
  try {
    return new Detector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

export type ManualScanOption = { code: string; label: string; description?: string };

export function ScannerPanel({
  title,
  hint,
  onDetected,
  manualOptions = [],
  allowManual = false,
  busy = false
}: {
  title: string;
  hint: string;
  onDetected: (code: string) => Promise<void> | void;
  manualOptions?: ManualScanOption[];
  allowManual?: boolean;
  busy?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [status, setStatus] = useState('');
  const detectorAvailable = typeof window !== 'undefined' && Boolean((window as typeof window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    const requestId = ++cameraRequestRef.current;
    setStatus('');
    setCameraOn(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('当前浏览器无法直接开启相机，请使用调试模式或联系工作人员。');
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setStatus(detectorAvailable ? '相机已开启，请让二维码完整进入框内。' : '相机已开启，但此浏览器不支持二维码识别；可使用调试模式。');
    } catch {
      if (requestId === cameraRequestRef.current) setStatus('未能取得相机权限，可在浏览器设置中允许相机，或使用调试模式。');
    }
  }, [detectorAvailable, stopCamera]);

  useEffect(() => {
    void startCamera();
    return () => {
      cameraRequestRef.current += 1;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  async function submitCode(code: string) {
    const value = code.trim();
    if (!value || busy) return;
    setDetecting(true);
    setStatus(`识别到 ${value}，正在向现场账本核验…`);
    try {
      await onDetected(value);
      setStatus('现场账本已回应，请查看页面结果。');
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : '核验未完成，请重新扫描。');
    } finally {
      setDetecting(false);
    }
  }

  async function detect(source: ImageBitmapSource) {
    const detector = getDetector();
    if (!detector) {
      setStatus(allowManual ? '当前浏览器不支持二维码识别，Demo 可使用下方调试模式。' : '当前设备不支持二维码识别，请更换现场设备或联系工作人员。');
      return;
    }
    setDetecting(true);
    setStatus('正在辨认二维码…');
    try {
      const results = await detector.detect(source);
      if (!results.length) {
        setStatus(allowManual ? '画面里没有识别到二维码，可重拍或使用调试模式。' : '没有识别到现场二维码，请调整距离和光线后重试。');
        return;
      }
      await submitCode(results[0].rawValue);
    } catch {
      setStatus(allowManual ? '识别失败，可重拍或使用调试模式。' : '识别失败，未向服务端提交任何行动。');
    } finally {
      setDetecting(false);
    }
  }

  return (
    <section className="scanner-panel stone-slab" aria-labelledby="scanner-title">
      <div className="scanner-copy">
        <p className="kicker">现场扫描</p>
        <h2 id="scanner-title">{title}</h2>
        <p>{hint}</p>
      </div>
      <div className={`camera-window ${cameraOn ? 'is-live' : ''}`}>
        <video ref={videoRef} muted playsInline aria-label="后置相机实时画面" />
        <div className="scan-frame" aria-hidden="true"><i /><i /><i /><i /></div>
        {!cameraOn && <p aria-hidden="true">镜头尚未开启</p>}
      </div>
      <div className="scanner-actions">
        <button
          type="button"
          className="compact-action is-primary"
          disabled={busy || detecting}
          onClick={() => cameraOn ? videoRef.current && void detect(videoRef.current) : void startCamera()}
        >{detecting ? '正在识别…' : cameraOn ? '拍摄并识别' : '开启相机'}</button>
      </div>
      <p className="scanner-status" role="status" aria-live="polite">{status || '二维码只会被提交给服务端核验，前端不会自行结算。'}</p>
      {allowManual && manualOptions.length > 0 && (
        <details className="manual-fallback">
          <summary>调试模式</summary>
          <p>仅供未接入现场二维码时测试页面流程。</p>
          <div>
            {manualOptions.map((option) => (
              <button key={option.code} type="button" disabled={busy || detecting} onClick={() => void submitCode(option.code)}>
                <strong>{option.label}</strong>
                {option.description && <span>{option.description}</span>}
              </button>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
