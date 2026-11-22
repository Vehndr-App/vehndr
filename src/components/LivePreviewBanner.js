"use client";

import { useEffect, useState } from "react";
import {
  areLiveInquirySendsAllowed,
  confirmAllowLiveInquirySends,
  isLocalPreviewTalkingToLiveApi,
  revokeLiveInquirySends,
} from "../utils/liveInquiryGuard";

export default function LivePreviewBanner() {
  const [visible, setVisible] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isLocalPreviewTalkingToLiveApi()) return;
    setVisible(true);
    setAllowed(areLiveInquirySendsAllowed());
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] px-3 py-2.5 text-center text-[13px] font-medium leading-snug"
      style={{
        background: allowed ? "#fef3c7" : "#fde68a",
        color: "#78350f",
        borderBottom: "1px solid #f59e0b",
      }}
    >
      {allowed ? (
        <>
          Live sends are <strong>on</strong> for this tab — requests can email real vendors.{" "}
          <button
            type="button"
            className="underline font-bold"
            onClick={() => {
              revokeLiveInquirySends();
              setAllowed(false);
            }}
          >
            Turn off
          </button>
        </>
      ) : (
        <>
          Preview is connected to the <strong>live</strong> site. Send is blocked so vendors
          don&apos;t get surprise emails.{" "}
          <button
            type="button"
            className="underline font-bold"
            onClick={() => {
              if (confirmAllowLiveInquirySends()) setAllowed(true);
            }}
          >
            Allow live sends this tab
          </button>
        </>
      )}
    </div>
  );
}
