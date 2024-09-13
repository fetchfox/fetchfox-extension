import React from 'react';
import { createRoot } from 'react-dom/client';

import Panel from './Panel';
import './index.css';

import { initSentry } from '../../lib/errors.mjs';
initSentry();

const container = document.getElementById('app-container');
const root = createRoot(container);

root.render(<Panel />);
