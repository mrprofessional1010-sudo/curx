"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { FRAME_CONFIG } from "@/lib/constants";
import { formatFrameNumber } from "@/lib/utils";

interface FrameSequenceHeroProps {
  currentFrame: number;
  onLoadingProgress?: (loaded: number, total: number) => void;
  className?: string;
}

export const FrameSequenceHero: React.FC<FrameSequenceHeroProps> = ({
  currentFrame,
  onLoadingProgress,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const isLoadedRef = useRef<boolean[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const [initialFrameReady, setInitialFrameReady] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const totalFrames = FRAME_CONFIG.totalFrames;

  // Check reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Progressive Preload Strategy
  useEffect(() => {
    imagesRef.current = new Array(totalFrames).fill(null);
    isLoadedRef.current = new Array(totalFrames).fill(false);

    let loadedCount = 0;

    const getFrameUrl = (index: number) => {
      const num4 = formatFrameNumber(index, 4);
      return `${FRAME_CONFIG.dir}/${FRAME_CONFIG.prefix}${num4}${FRAME_CONFIG.ext}`;
    };

    const getFallbackUrl = (index: number) => {
      const num3 = formatFrameNumber(index, 3);
      return `${FRAME_CONFIG.fallbackDir}/${FRAME_CONFIG.fallbackPrefix}${num3}.jpg`;
    };

    const loadSingleImage = (index: number): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = getFrameUrl(index);

        img.onload = () => {
          imagesRef.current[index - 1] = img;
          isLoadedRef.current[index - 1] = true;
          loadedCount++;
          if (index === 1 || index === 240) {
            setInitialFrameReady(true);
          }
          if (onLoadingProgress) {
            onLoadingProgress(loadedCount, totalFrames);
          }
          resolve(img);
        };

        img.onerror = () => {
          // Try fallback url
          const fallback = new Image();
          fallback.src = getFallbackUrl(index);
          fallback.onload = () => {
            imagesRef.current[index - 1] = fallback;
            isLoadedRef.current[index - 1] = true;
            loadedCount++;
            if (index === 1 || index === 240) {
              setInitialFrameReady(true);
            }
            if (onLoadingProgress) {
              onLoadingProgress(loadedCount, totalFrames);
            }
            resolve(fallback);
          };
          fallback.onerror = () => {
            resolve(img); // resolve gracefully
          };
        };
      });
    };

    // Priority 1: Load immediate first batch (frames 1 to 16 and key anchors)
    const priorityFrames = [1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 48, 96, 144, 192, 240];
    Promise.all(priorityFrames.map((f) => loadSingleImage(f))).then(() => {
      setInitialFrameReady(true);

      // Priority 2: Progressively load the remaining frames in chunks via requestIdleCallback/setTimeout
      let nextFrame = 1;
      const loadChunk = () => {
        const batchSize = 10;
        const promises: Promise<HTMLImageElement>[] = [];
        for (let i = 0; i < batchSize && nextFrame <= totalFrames; i++) {
          if (!isLoadedRef.current[nextFrame - 1]) {
            promises.push(loadSingleImage(nextFrame));
          }
          nextFrame++;
        }

        if (nextFrame <= totalFrames) {
          if ("requestIdleCallback" in window) {
            (window as any).requestIdleCallback(loadChunk);
          } else {
            setTimeout(loadChunk, 16);
          }
        }
      };

      loadChunk();
    });

    return () => {
      imagesRef.current = [];
    };
  }, [totalFrames, onLoadingProgress]);

  // Render Frame onto Canvas with Aspect Fit & DPI Awareness
  const drawFrame = useCallback(
    (frameNumber: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const targetFrame = prefersReducedMotion ? 240 : Math.max(1, Math.min(totalFrames, frameNumber));
      const img = imagesRef.current[targetFrame - 1];

      if (img && img.complete && img.naturalWidth > 0) {
        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Contain aspect ratio fit
        const hRatio = displayWidth / img.naturalWidth;
        const vRatio = displayHeight / img.naturalHeight;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (displayWidth - img.naturalWidth * ratio) / 2;
        const centerShiftY = (displayHeight - img.naturalHeight * ratio) / 2;

        ctx.drawImage(
          img,
          0,
          0,
          img.naturalWidth,
          img.naturalHeight,
          centerShiftX,
          centerShiftY,
          img.naturalWidth * ratio,
          img.naturalHeight * ratio
        );
      } else {
        // Find nearest loaded frame if current isn't ready
        let nearest: HTMLImageElement | null = null;
        for (let offset = 1; offset < 30; offset++) {
          if (targetFrame - offset >= 1 && imagesRef.current[targetFrame - offset - 1]?.complete) {
            nearest = imagesRef.current[targetFrame - offset - 1];
            break;
          }
          if (targetFrame + offset <= totalFrames && imagesRef.current[targetFrame + offset - 1]?.complete) {
            nearest = imagesRef.current[targetFrame + offset - 1];
            break;
          }
        }

        if (nearest && nearest.complete && nearest.naturalWidth > 0) {
          const ratio = Math.min(displayWidth / nearest.naturalWidth, displayHeight / nearest.naturalHeight);
          const cx = (displayWidth - nearest.naturalWidth * ratio) / 2;
          const cy = (displayHeight - nearest.naturalHeight * ratio) / 2;
          ctx.drawImage(nearest, 0, 0, nearest.naturalWidth, nearest.naturalHeight, cx, cy, nearest.naturalWidth * ratio, nearest.naturalHeight * ratio);
        }
      }

      ctx.restore();
    },
    [totalFrames, prefersReducedMotion]
  );

  // Redraw when currentFrame changes
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      drawFrame(currentFrame);
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentFrame, drawFrame, initialFrameReady]);

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => {
      drawFrame(currentFrame);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [currentFrame, drawFrame]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className || ""}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain relative z-10 transition-opacity duration-500"
        style={{ opacity: initialFrameReady ? 1 : 0.4 }}
      />
    </div>
  );
};
