import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useContext, useReducer } from 'react';
import { WebsocketContext, WebsocketProvider } from './WebsocketProvider';
import { Navbar, Cubesat} from "./components";
import './App.css';
import { TimeoutError } from 'sequelize';

function Main() {
	const ws = useContext(WebsocketContext);

	const [, forceUpdate] = useReducer((x) => x + 1, 0);

	const [cubesats, setCubesats] = useState<any[]>([]);

	useEffect(() => {
		const interval = setInterval(() => {
			forceUpdate();
		}, 2000)

		if (ws.ready) {
			//ws.send(JSON.stringify({type: 'ping', message: 'Hello, server!'}));

			ws.send(JSON.stringify({type: 'request', message: 'getAll'}));

			while(!ws.ready) {
				setTimeout(()=>{}, 10)
			}

			const response = JSON.parse(ws.value!);
			setCubesats(response.data);
		}

		return () => clearInterval(interval);
	}, [ws.ready]);

	const getCubesatsButtonHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
		ws.send(JSON.stringify({type: 'request', message: 'getAll'}));
		// ws.value
	}

	return (
		<div>
			<Navbar />
			<div className="buttons">
				<button onClick={getCubesatsButtonHandler} className="getCubesats">
					Get Cubesats
				</button>
			</div>
			<div className="cubesats">
				{cubesats.map((cubesat, index) => {
					return (<Cubesat
								id={cubesat.id}
								name={cubesat.name}
							/>);
				})}
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
				<Main />
			</WebsocketProvider>
			} />
		</Routes>
		</Router>
	);
}
