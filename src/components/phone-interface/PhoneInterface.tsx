import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import "./phone-interface.scss";
import ControlTray from "../control-tray/ControlTray";
import { useRef, useState, useEffect } from "react";
import cn from "classnames";

export default function PhoneInterface() {
  const { connected, connect, disconnect } = useLiveAPIContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (connected) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [connected]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCallButtonClick = () => {
    if (!connected) {
      connect();
    } else {
      disconnect();
    }
  };

  return (
    <div className="phone-interface">
      <div className="phone-screen">
        <div className="caller-info">
          <img 
            src="/assets/img/robot.png" 
            alt="Robot" 
            className="robot-image"
          />
          <div className="caller-id">Call Bot</div>
          {connected && (
            <div className="call-timer">{formatTime(callDuration)}</div>
          )}
        </div>
        
        <div className="stream-container">
          <video
            className={cn("stream", {
              hidden: !videoRef.current || !videoStream,
            })}
            ref={videoRef}
            autoPlay
            playsInline
          />
        </div>

        <ControlTray
          videoRef={videoRef}
          supportsVideo={true}
          onVideoStreamChange={setVideoStream}
        />
      </div>
    </div>
  );
} 