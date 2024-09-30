import React, { Component } from "react";
import icon from "data-base64:~assets/icon-128.png";

class GreetingComponent extends Component {
  state = {
    name: "dev",
  };

  render() {
    return (
      <div>
        <p>Hello, {this.state.name}!</p>
        <img src={icon} alt="extension icon" />
      </div>
    );
  }
}

export default GreetingComponent;
