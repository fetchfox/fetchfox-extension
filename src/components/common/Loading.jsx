import React, { Component } from 'react';
import spinner from '../../assets/img/spinner.svg';

export const Loading = ({ width }) => {
  return (
    <img
      src={spinner}
      style={{ width: width || 32, display: 'inline-block' }}
    />
  );
}
