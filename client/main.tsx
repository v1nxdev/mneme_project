import React from 'react';
import { createRoot } from 'react-dom/client';
import Mneme from '../components/mneme';
import '../styles/globals.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Mneme/></React.StrictMode>);
