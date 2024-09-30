import React, { useState, useEffect } from "react";

import fox from "data-base64:~assets/fox-transparent.png";
import arrow from "data-base64:~assets/bubble-arrow.png";

export const FoxSays = ({ message, small }) => {
  const size = small ? 32 : 100;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <div>
        <img src={fox} style={{ width: size, height: size }} />
      </div>
      <div>
        <div
          style={{
            background: "white",
            borderRadius: 16,
            color: "black",
            marginTop: 5,
            padding: "10px 15px",
            fontSize: small ? 12 : 16,
            fontWeight: "bold",
          }}
        >
          {message}
        </div>
        <img
          src={arrow}
          style={{ width: 36 * 0.5, height: 24 * 0.5, marginLeft: 20 }}
        />
      </div>
    </div>
  );
};
