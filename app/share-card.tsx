"use client";

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
  generateShareCardBlob,
  downloadBlob,
  type ShareCardPayload,
  type SplitResultData,
  type TrustResultData,
  type UltimatumResultData,
  type InviteData,
  type ExperimentType,
} from "@/lib/share-card-generator";
import { Mark } from "@/app/mark";
import { NAME } from "@/lib/brand";

export interface ShareCardProps {
  experiment: "Split" | "Trust" | "Ultimatum";
  /** a CSS color expression, e.g. "var(--good)" */
  color: string;
  /** the experiment's own route, e.g. "/trust", or deep link */
  path: string;
  shareType?: "result" | "invite";
  shareText: string;
  // Dynamic structured data
  splitData?: SplitResultData;
  trustData?: TrustResultData;
  ultimatumData?: UltimatumResultData;
  inviteData?: InviteData;
  // Fallbacks for DOM presentation if image generation is pending
  predicted?: ReactNode;
  happened?: ReactNode;
  challenge?: string;
}

export function ShareCard({
  experiment,
  color,
  path,
  shareType = "result",
  shareText,
  splitData,
  trustData,
  ultimatumData,
  inviteData,
  predicted,
  happened,
  challenge,
}: ShareCardProps) {
  const [imageState, setImageState] = useState<{
    dataUrl: string | null;
    file: File | null;
    blob: Blob | null;
    loading: boolean;
    error: boolean;
  }>({
    dataUrl: null,
    file: null,
    blob: null,
    loading: true,
    error: false,
  });

  const [shareFeedback, setShareFeedback] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [manualCopy, setManualCopy] = useState<boolean>(false);

  const expKey: ExperimentType = experiment.toLowerCase() as ExperimentType;

  // Compute absolute link safely for SSR and client
  const [origin, setOrigin] = useState("https://hunch-teal.vercel.app");
  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      setOrigin(window.location.origin);
    }
  }, []);
  const link = `${origin}${path}`;
  const shown = origin.replace(/^https?:\/\//, "");
  const fullShareText = `${shareText} ${link}`;

  // Generate the real 1080x1350 PNG image in background on mount or data change
  const payloadRef = useRef<ShareCardPayload | null>(null);

  useEffect(() => {
    let dead = false;
    const payload: ShareCardPayload = {
      shareType,
      experiment: expKey,
      url: link,
      splitData,
      trustData,
      ultimatumData,
      inviteData,
    };

    payloadRef.current = payload;
    setImageState((s) => ({ ...s, loading: true, error: false }));

    (async () => {
      try {
        const res = await generateShareCardBlob(payload);
        if (!dead) {
          setImageState({
            dataUrl: res.dataUrl,
            file: res.file,
            blob: res.blob,
            loading: false,
            error: false,
          });
        }
      } catch (err) {
        console.error("Failed to generate share card image:", err);
        if (!dead) {
          setImageState((s) => ({ ...s, loading: false, error: true }));
        }
      }
    })();

    return () => {
      dead = true;
    };
  }, [shareType, expKey, link, splitData, trustData, ultimatumData, inviteData]);

  // Clear feedback after delay
  useEffect(() => {
    if (!shareFeedback) return;
    const t = setTimeout(() => setShareFeedback(""), 4500);
    return () => clearTimeout(t);
  }, [shareFeedback]);

  useEffect(() => {
    if (!linkCopied) return;
    const t = setTimeout(() => setLinkCopied(false), 3500);
    return () => clearTimeout(t);
  }, [linkCopied]);

  /**
   * Primary Action: Share
   * Uses native Web Share API where supported, sharing image file, text, and URL.
   * If image sharing is unsupported or fails, falls back gracefully to text/url sharing,
   * clipboard copying, and downloading the card.
   */
  async function handleShare() {
    setManualCopy(false);

    // 1. Try Native Web Share with image file
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      if (imageState.file && navigator.canShare && navigator.canShare({ files: [imageState.file] })) {
        try {
          await navigator.share({
            files: [imageState.file],
            title: `Hunch · ${experiment}`,
            text: shareText,
            url: link,
          });
          setShareFeedback("Shared successfully!");
          return;
        } catch (e: unknown) {
          if (e instanceof Error && e.name === "AbortError") {
            return; // User cancelled share sheet
          }
          // Fall through to text share if file share failed
        }
      }

      // 2. Try Native Web Share with text and link
      try {
        await navigator.share({
          title: `Hunch · ${experiment}`,
          text: fullShareText,
          url: link,
        });
        setShareFeedback("Shared successfully!");
        return;
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        // Fall through to clipboard + download
      }
    }

    // 3. Fallback: Copy link and download the image
    let copied = false;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(fullShareText);
        copied = true;
      } catch {
        // clipboard denied
      }
    }

    if (imageState.blob) {
      downloadBlob(imageState.blob, `hunch-${expKey}-${shareType}.png`);
      setShareFeedback(
        copied
          ? "Card downloaded and link copied to clipboard!"
          : "Card downloaded! Copy the link below to share."
      );
    } else if (copied) {
      setShareFeedback("Link copied to clipboard!");
    } else {
      setManualCopy(true);
    }
  }

  /**
   * Secondary Action: Copy link directly
   */
  async function handleCopyLink() {
    setManualCopy(false);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        return;
      } catch {
        // clipboard denied
      }
    }
    setManualCopy(true);
  }

  return (
    <div className="share-card-container" style={{ "--pick-color": color } as CSSProperties}>
      {/* Generated Image Preview Card */}
      <div className="share-image-wrap">
        {imageState.dataUrl ? (
          <img
            src={imageState.dataUrl}
            alt={`Hunch ${experiment} ${shareType === "invite" ? "invitation" : "result"} share card`}
            className="share-image-preview"
          />
        ) : imageState.loading ? (
          <div className="share-image-loading">
            <Mark className="brand-mark" />
            <span>Generating share card…</span>
          </div>
        ) : (
          /* Fallback DOM representation if canvas errored */
          <div className="share-card" style={{ width: "100%", height: "100%" }}>
            <div className="brand">
              <span className="name"><Mark /> {NAME.toUpperCase()}</span>
              <span className="exp">{experiment}</span>
            </div>
            {predicted && <p className="line">{predicted}</p>}
            {happened && <p className="line strong">{happened}</p>}
            {challenge && <p className="challenge">{challenge}</p>}
            <p className="addr">{shown}{path}</p>
          </div>
        )}
      </div>

      {/* Primary and Secondary Sharing Controls */}
      <div className="share-actions">
        <button onClick={handleShare} className="btn" aria-label="Share this card">
          Share
        </button>
        <button onClick={handleCopyLink} className="btn ghost" aria-label="Copy link">
          {linkCopied ? "Link copied" : "Copy link"}
        </button>
      </div>

      {shareFeedback && <p className="share-feedback">{shareFeedback}</p>}

      {manualCopy && (
        <div className="card" style={{ marginTop: "0.8rem" }}>
          <p className="faint" style={{ marginBottom: "0.5rem" }}>
            Copying is blocked here. Select this link to share:
          </p>
          <textarea
            readOnly
            value={link}
            rows={2}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            style={{
              width: "100%",
              background: "var(--paper)",
              color: "var(--ink)",
              border: "2px solid var(--ink)",
              borderRadius: "8px",
              padding: "0.6rem 0.7rem",
              font: "inherit",
              fontSize: "0.9rem",
            }}
          />
        </div>
      )}
    </div>
  );
}
