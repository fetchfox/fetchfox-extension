import { useEffect, useState } from "react";
import { FiCheckCircle, FiCircle } from "react-icons/fi";
import { RiErrorWarningFill } from "react-icons/ri";
import { setKey } from "../../lib/store";
import { useOpenAiKey, useOpenAiModels, useQuota } from "../../state/openai";
import { FoxSays } from "../fox/FoxSays";

const QuotaError = () => {
  const quota = useQuota();

  if (quota.ok) return null;

  return (
    <div style={{ color: "white" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexDirection: "column",
          padding: 10,
          fontSize: 14,
          lineHeight: "18px",
          borderRadius: 8,
          background: "#fff9db",
          border: "1px solid #ffe066",
          color: "#8b6508",
          zIndex: 50,
        }}
      >
        <b
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <RiErrorWarningFill size={24} />
          </div>
          <div>You are out of OpenAI credits</div>
        </b>
        <p>
          You won't be able to use FetchFox until you add more credits. You can
          do so by visiting OpenAI's billing dashboard:
        </p>
        <div style={{ margin: 10, textAlign: "center" }}>
          <a
            href="https://platform.openai.com/settings/organization/billing/overview"
            className="clickable"
            style={{ color: "#8b6508" }}
            target="_blank"
          >
            Visit OpenAI Billing Page
          </a>
        </div>
        <p>Alternatively, you can switch to the FetchFox server below.</p>
      </div>
    </div>
  );
};

export const OpenAiKeyEntry = ({ onDone, doneText }) => {
  const { key: openAiKey, plan: openAiPlan } = useOpenAiKey();
  const models = useOpenAiModels();
  const [apiKey, setApiKey] = useState();
  const [modelName, setModelName] = useState(models.model);
  const [error, setError] = useState();
  const [success, setSuccess] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const quota = useQuota();

  useEffect(() => {
    setDisabled(
      !quota?.ok || !openAiPlan || (openAiPlan === "openai" && !openAiKey)
    );
  }, [openAiKey, openAiPlan, quota?.ok]);

  useEffect(() => {
    setApiKey(openAiKey);
  }, [openAiKey]);

  useEffect(() => {
    setModelName(models.model);
  }, [models.model]);

  const handleOpenAi = (e) => {
    e.preventDefault();
    setError(null);
    setKey("openAiPlan", "openai");
    setKey("openAiKey", apiKey);
    setKey("model", modelName);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleFree = (e) => {
    e.preventDefault();
    setError(null);
    setKey("openAiPlan", "free");
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleChange = (e) => {
    setError(null);
    setApiKey(e.target.value);
    setKey("openAiKey", e.target.value);
  };

  const handleChangeModel = (e) => {
    setModelName(e.target.value);
    setKey("model", e.target.value);
  };

  const handleDone = () => {
    if (openAiPlan === "openai" && !openAiKey) {
      setError("Enter your API key");
      return;
    }
    onDone();
  };

  const wrapperStyle = {
    borderRadius: 4,
    padding: 20,
    background: "#fff0",
    margin: "20px 0",
    border: "2px solid transparent",
  };

  const wrapperActiveStyle = {
    border: "2px solid #fffa",
    background: "#fff2",
  };

  const titleStyle = {
    fontSize: 18,
    opacity: 0.8,
    fontVariantCaps: "small-caps",
  };

  const subtitleStyle = {
    fontSize: 24,
    fontWeight: "bold",
  };

  const pickModelNode = (
    <div>
      <div style={{ fontSize: 14, fontWeight: "bold", margin: "10px 0" }}>
        Pick a model
      </div>
      <select value={modelName} onChange={handleChangeModel}>
        {models.available.map((a) => (
          <option key={a} value={a}>
            {a}
            {a === models.available[0] && <span> (recommended)</span>}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      <FoxSays message="How do you want to use FetchFox?" />

      <QuotaError />

      <div
        style={{
          ...wrapperStyle,
          ...(openAiPlan === "openai" ? wrapperActiveStyle : {}),
        }}
      >
        <div></div>
        <div>
          <div style={titleStyle}>Free Forever</div>
          <div style={subtitleStyle}>Bring Your Own Key</div>
          <div>
            <p>
              Got ChatGPT? Enter your OpenAI API key below, and your use of
              FetchFox will be completely free forever. You will only pay for
              your own OpenAI usage.
            </p>
            <p>
              You can find your OpenAI API key on your API Keys setting page:
            </p>
            <div>
              <a
                className={`btn ${
                  openAiKey ? "btn-gray" : "btn-primary"
                } clickable`}
                style={{ display: "inline-block", marginBottom: 10 }}
                href="https://platform.openai.com/api-keys"
                target="_blank"
              >
                Visit OpenAI settings page &raquo;
              </a>
            </div>

            <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10 }}>
              Enter your OpenAI key
            </div>
            <form onSubmit={handleOpenAi}>
              <input
                className={error ? "error" : ""}
                style={{ width: "100%" }}
                type="text"
                value={apiKey}
                onChange={handleChange}
                placeholder="sk-proj-..."
              />

              {models.available.length > 0 && pickModelNode}

              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <button
                  className="btn btn-gray btn-lg"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    flexDirection: "row",
                    gap: 10,
                  }}
                  type="submit"
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexDirection: "row",
                    }}
                  >
                    {openAiPlan === "openai" && (
                      <FiCheckCircle style={{ color: "white" }} size={24} />
                    )}
                    {openAiPlan !== "openai" && (
                      <FiCircle style={{ color: "white" }} size={24} />
                    )}
                  </div>
                  <div style={{ widthx: "100%" }}>Use Free Forever</div>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div
        style={{
          ...wrapperStyle,
          ...(openAiPlan === "free" ? wrapperActiveStyle : {}),
        }}
      >
        <div></div>
        <div>
          <div style={titleStyle}>Free... For Now</div>
          <div style={subtitleStyle}>Use Our Server</div>
          <div>
            <p>Don't have ChatGPT, or don't want to find your key?</p>
            <p>
              For now, we're letting people try the extension with our own AI
              backend. This costs us money and we're poor, so expect this option
              to go away soon! 😅
            </p>

            <div
              style={{ marginTop: 20, display: "flex", alignItems: "center" }}
            >
              <button
                className="btn btn-gray btn-lg"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  flexDirection: "row",
                  gap: 10,
                }}
                onClick={handleFree}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexDirection: "row",
                  }}
                >
                  {openAiPlan === "free" && (
                    <FiCheckCircle style={{ color: "white" }} size={24} />
                  )}
                  {openAiPlan !== "free" && (
                    <FiCircle style={{ color: "white" }} size={24} />
                  )}
                </div>
                <div style={{ widthx: "100%" }}>Use Free...For Now</div>
              </button>
            </div>
          </div>
        </div>

        {!disabled && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              width: "100vw",
              padding: 8,
              paddingBottom: 26,
              background: "#282c34",
            }}
          >
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={handleDone}
              disabled={disabled}
            >
              {doneText || "Done"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
