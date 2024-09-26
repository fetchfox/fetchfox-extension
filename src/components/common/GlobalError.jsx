import React, { Component } from 'react';
import { useGlobalError } from '../../state/errors';
import { clearGlobalError } from '../../lib/errors.mjs';
import { bgColor, errorColor } from  '../../lib/constants.mjs';
import { useQuota } from '../../state/openai';
import {
  IoMdCloseCircle,
} from 'react-icons/io';
import {
  RiErrorWarningFill,
} from 'react-icons/ri';

export const GlobalError = () => {
  const globalError = useGlobalError();

  let errorNode;
  if (globalError) {
    errorNode = (
      <div
        className="error-message"
        style={{ display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'space-between',
                 flexDirection: 'row',
                 margin: 0,
                 padding: '1px 6px',
                 fontSize: 12,
                 border: '1px solid ' + errorColor,
                 borderRadius: 0,
               }}>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {globalError.message}
        </div>
        <div style={{ paddingLeft: 10 }}>
          <IoMdCloseCircle
            style={{ cursor: 'pointer' }}
            size={18}
            onClick={() => clearGlobalError()} />
        </div>
      </div>
    );
  }
  return (
    <div
      style={{ position: 'fixed',
               zIndex: 2,
               bottom: 0,
               left: 0,
               width: '100%',
             }}
      >
      {errorNode}
    </div>
  );
}
