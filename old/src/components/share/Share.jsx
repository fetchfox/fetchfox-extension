import React, { useState, useEffect } from "react";
import { FaShareFromSquare } from "react-icons/fa6";
import { shareResults } from "../../lib/share";
import { bgColor } from "../../lib/constants";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { LuCopy, LuCopyCheck } from "react-icons/lu";
import { Loading } from "../common/Loading";

const ShareModal = ({ id, onDone }) => {
  const [copied, setCopied] = useState();

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const url = "https://fetchfoxai.com/s/" + id;

  let body;
  if (id === "loading") {
    body = (
      <div style={{ textAlign: "center" }}>
        <Loading size={14} />
      </div>
    );
  } else {
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 5,
          borderRadius: 4,
          padding: "4px 8px",
          background: "rgba(255,255,255,0.1)",
        }}
      >
        <div>{url}</div>
        <div>
          <CopyToClipboard text={url} onCopy={handleCopy}>
            <button
              className="btn btn-gray"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              Copy {copied && <LuCopyCheck size={18} />}
              {!copied && <LuCopy size={18} />}
            </button>
          </CopyToClipboard>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        display: "flex",
        top: 0,
        left: 0,
        alignItems: "center",
        width: "100%",
        height: "100%",
        zIndex: 100,
        padding: 40,
        background: "#0008",
      }}
      onClick={onDone}
    >
      <div
        style={{
          background: bgColor,
          padding: 20,
          border: "1px solid #444",
          borderRadius: 8,
          width: "100%",
          fontSize: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    </div>
  );
};

export const Share = ({ job }) => {
  const [id, setId] = useState();

  const handleShare = async () => {
    setId("loading");
    const { id } = await shareResults(job);
    setId(id);
  };

  return (
    <div style={{ display: "inline-block" }}>
      {id && <ShareModal id={id} onDone={() => setId(null)} />}
      <button
        className="btn btn-gray"
        disabled={(job?.results?.targets || []).length === 0}
        onClick={handleShare}
      >
        <FaShareFromSquare size={12} /> Share Results
      </button>
    </div>
  );
};
