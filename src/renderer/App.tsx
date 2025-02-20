import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useContext, useReducer } from 'react';
import icon from '../../assets/icon.svg';
import './App.css';
import { WebsocketContext, WebsocketProvider } from './WebsocketProvider';

function Hello() {
  const ws = useContext(WebsocketContext);

  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate();
    }, 2000)

    //console.log(ws)

    if (ws.ready) {
      ws.send(JSON.stringify({type: 'ping', message: 'Hello, server!'}));
    }

    return () => clearInterval(interval);
  }, [ws.ready]);

  const buttonHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
    ws.send(JSON.stringify({type: 'request', message: 'add', params: {id: count}}));

    setCount(count + 1);
  }

  return (
    <div>
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>electron-react-boilerplate</h1>
      <div className="Hello">
        {ws.value? <p>{ws.value}</p> : <p>Loading...</p>}
      </div>
      <div className="buttons">
        <button onClick={buttonHandler} className="addCubesat">
          Add Cubesat
        </button>
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
