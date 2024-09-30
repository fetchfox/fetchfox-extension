import React, { Component } from "react";
import spinner from "data-base64:~assets/spinner.svg";

export const Loading = ({ width, size }) => {
  return (
    <img
      src={spinner}
      style={{ width: width || size || 32, display: "inline-block" }}
    />
  );
};
