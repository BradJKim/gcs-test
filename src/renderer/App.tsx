import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import icon from '../../assets/icon.svg';
import './App.css';
import { WebsocketContext, WebsocketProvider } from './WebsocketProvider';

function Hello() {
  const ws = useContext(WebsocketContext);

  useEffect(() => {
    console.log(ws)
    if (ws.ready) {
      ws.send('Hello, server!');
    }
  }, []);

  return (
    <div>
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>electron-react-boilerplate</h1>
      <div className="Hello">
        {ws.value? <p>{ws.value}</p> : <p>Loading...</p>}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <WebsocketProvider>
            <Hello />
          </WebsocketProvider>
        } />
      </Routes>
    </Router>
  );
}
