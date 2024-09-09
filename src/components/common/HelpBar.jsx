import React, { Component } from 'react';
import { useGlobalError } from '../../state/errors';
import { clearGlobalError } from '../../lib/errors.mjs';
import { bgColor, errorColor, discordUrl } from  '../../lib/constants.mjs';
import { Report } from '../report/Report';

export const HelpBar = () => {
  return (
    <div
      style={{ display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               position: 'fixed',
               zIndex: 2,
               bottom: 0,
               left: 0,
               width: '100%',
               color: 'white',
               padding: 2,
               background: '#000a',
             }}
      >
      <div>
        FetchFox is new. If you need help, ask the devs via <a className="clickable" href={discordUrl} target="_blank">Discord</a>.</div>
      <div>
        <Report />
      </div>
    </div>
  );
}
