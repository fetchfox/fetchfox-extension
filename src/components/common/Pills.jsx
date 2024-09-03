import React from 'react';

export const Pills = ({ value, onChange, children }) => {
  const nodes = children.map((child) => {
    const isActive = value === child.key;
    return (
      <div
        className={'btn ' + (isActive ? 'btn-active' : '')}
        onClick={() => onChange(child.key)}
        key={child.key}
        >
        {child}
      </div>
    );
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      {nodes}
    </div>
  );
};
