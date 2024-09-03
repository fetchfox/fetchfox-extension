import React, { Component } from 'react';
import { useGlobalError } from '../../state/errors';
import { clearGlobalError } from '../../lib/errors.mjs';
import { bgColor, errorColor } from  '../../lib/constants.mjs';

export const HelpBar = () => {
  return (
    <div
      style={{ position: 'fixed',
               zIndex: 2,
               bottom: 0,
               left: 0,
               width: '100%',
               color: 'white',
               padding: 2,
               background: '#000a',
             }}
      >
      FetchFox is new. If you need help, ask the devs via <a className="clickable" href="https://discord.gg/mM54bwdu59" target="_blank">Discord</a> or <a className="clickable" href="mailto:marcell.ortutay@gmail.com?subject=FetchFox%20support">email</a>
    </div>
  );
}
