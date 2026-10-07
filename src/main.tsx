import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Trailer } from './trailer/Trailer';
import './styles.css';

const isTrailer = new URLSearchParams(location.search).has('trailer');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isTrailer ? <Trailer /> : <App />}</StrictMode>,
);
