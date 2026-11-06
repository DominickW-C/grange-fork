import { useEffect, useRef } from "react";
import { keyGreen } from "./chromaKey";
import "./accountCreated.css";

/** The source clip is 2:1; key at this width and let CSS scale it up. */
const KEY_WIDTH = 640;

/** Keying every source frame is unnecessary for a small dialog. */
const MIN_FRAME_MS = 1000 / 30;

interface AccountCreatedDialogProps {
	username: string;
	onContinue: () => void;
}

/**
 * Celebration shown right after registration. The committed mp4 still has its
 * green backdrop, so each frame is drawn into a canvas and keyed there; the
 * video element itself stays hidden.
 */
export function AccountCreatedDialog({
	username,
	onContinue,
}: AccountCreatedDialogProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const continueRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		continueRef.current?.focus();
	}, []);

	useEffect(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;

		let stopped = false;
		let raf = 0;
		let videoFrame = 0;
		let lastDraw = -MIN_FRAME_MS;

		const draw = () => {
			if (stopped) return;
			const now = performance.now();
			if (now - lastDraw < MIN_FRAME_MS) {
				schedule();
				return;
			}
			lastDraw = now;
			if (video.videoWidth > 0) {
				const width = KEY_WIDTH;
				const height = Math.max(
					1,
					Math.round((width * video.videoHeight) / video.videoWidth),
				);
				if (canvas.width !== width || canvas.height !== height) {
					canvas.width = width;
					canvas.height = height;
				}
				ctx.drawImage(video, 0, 0, width, height);
				const frame = ctx.getImageData(0, 0, width, height);
				keyGreen(frame.data);
				ctx.putImageData(frame, 0, 0);
			}
			schedule();
		};

		const schedule = () => {
			if (stopped) return;
			if (typeof video.requestVideoFrameCallback === "function") {
				videoFrame = video.requestVideoFrameCallback(draw);
			} else {
				raf = requestAnimationFrame(draw);
			}
		};

		// Muted autoplay is allowed everywhere; the catch only covers a browser
		// that still refuses to start, which leaves the panel usable.
		video.play().catch(() => undefined);
		schedule();

		return () => {
			stopped = true;
			cancelAnimationFrame(raf);
			if (videoFrame && typeof video.cancelVideoFrameCallback === "function") {
				video.cancelVideoFrameCallback(videoFrame);
			}
			video.pause();
		};
	}, []);

	return (
		<div className="account-created-backdrop" data-testid="account-created">
			<section
				className="account-created-panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby="account-created-title"
			>
				<h2 id="account-created-title" className="account-created-title">
					Account Created
				</h2>
				<p className="account-created-subtitle">
					Welcome to Grange, {username}!
				</p>

				<video
					ref={videoRef}
					className="account-created-source"
					src="/assets/video/account-created.mp4"
					autoPlay
					muted
					loop
					playsInline
					preload="auto"
					data-testid="account-created-video"
				/>
				<canvas ref={canvasRef} className="account-created-video" />

				<button
					ref={continueRef}
					type="button"
					className="account-created-continue"
					data-testid="account-created-continue"
					onClick={onContinue}
				>
					Continue
				</button>
			</section>
		</div>
	);
}
