import React, { useState, useEffect, useRef } from 'react';
import { Loading } from '../common/Loading';
import { Checkbox } from '../common/Checkbox';
import { usePagination } from '../../state/gather';
import { useActiveJob } from '../../state/jobs';
import { useActivePage } from '../../state/navigation';
import { Pills } from '../common/Pills';

export const PerPage = ({ perPage, onChange }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div><p>How many items per page?</p></div>
      <div>
        <Pills value={perPage} onChange={onChange}>
          <div key="single">One</div>
          <div key="multiple">Multiple</div>
          <div key="guess">Let AI Guess</div>
        </Pills>
      </div>
    </div>
  );
}
