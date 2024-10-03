import { useState } from "react";
import { FaCircleStop } from "react-icons/fa6";
import { bgColor, mainColor } from "../../lib/constants";
import { advanceRound } from "../../lib/controller";
import { sendStopMessage } from "../../lib/job";
import { formatNumber } from "../../lib/util";
import { useLocal } from "../../state/storage";
import { useUsage } from "../../state/openai";
import { Loading } from "../common/Loading";

export const StatusBar = ({ onRun }) => {
  const usage = useUsage();

  console.log("Status bar usage:", usage);

  const [status] = useLocal("status");
  const [percent] = useLocal("percent");
  const [completion] = useLocal("completion");
  const [tpm] = useLocal("tpm");
  const [inFlight] = useLocal("inFlight");

  const message = status?.message ?? "";
  const busy = (inFlight || 0) != 0;

  const size = 28;

  const buttonNode = (
    <div>
      <button
        className={"btn btn-lg btn-primary"}
        style={{ width: "100%" }}
        onClick={onRun}
      >
        Run Scrape
      </button>
    </div>
  );

  const calcWidth = "calc(100% - " + (2 * size + 16) + "px)";

  const loadingNode = (
    <div
      style={{
        height: size + 20,
        padding: "2px 0",
        display: "flex",
        gap: 5,
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
      >
      {/*BUSY:{''+busy} INFLIGHT:{''+inFlight}*/}
      <div style={{ width: size + 2, paddingLeft: 2, textAlign: "right" }}>
        {busy ? <Loading width={size} /> : null}
      </div>

      {busy && (
        <div style={{ width: size }}>
          <a
            style={{ color: "white" }}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              advanceRound();
              sendStopMessage();
            }}
          >
            <FaCircleStop size={size} />
          </a>
        </div>
      )}

      {busy && percent && (
        <div
          style={{
            width: calcWidth,
            height: 18,
            bottom: 10,
            position: "absolute",
            marginLeft: size * 2 + 16,
            background: "#fff3",
            borderRadius: 4,
          }}
        >
          <div
            style={{
              width: Math.floor(100 * percent) + "%",
              height: 18,
              background: mainColor,
              borderRadius: 4,
            }}
          ></div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          width: calcWidth,
          marginLeft: size * 2 + 16,
          fontSize: 10,
          top: 6,
        }}
      >
        <div>
          {percent && Math.round(100 * percent) + "%"}
          {percent && !!completion?.done && !!completion?.total && (
            <span> ({`${completion.done}/${completion.total}`})</span>
          )}
        </div>
        <div>
          {tpm && (
            <span>
              {" "}
              {formatNumber(tpm, true)} tpm,{" "}
              {formatNumber(usage.total || 0, true)}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          zIndex: 2,
          width: "calc(100% - 10px)",
          paddingRight: 30,
          marginLeft: 8,
          marginTop: 8,
        }}
      >
        {inFlight > 0 ? " " + message : ""}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        position: "fixed",
        background: bgColor,
        left: 0,
        bottom: 0,
        padding: 10,
        height: 74,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        {!busy && buttonNode}
        {busy && loadingNode}
      </div>
    </div>
  );
};
