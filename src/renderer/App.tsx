import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useContext, useReducer } from 'react';
import { WebsocketContext, WebsocketProvider } from './WebsocketProvider';
import { Navbar, Cubesat} from "./components";
import './App.css';

function Main() {
	const ws = useContext(WebsocketContext);

	const [, forceUpdate] = useReducer((x) => x + 1, 0);

	const [cubesats, setCubesats] = useState<any[]>([]);
	const [waiting, setWaiting] = useState<boolean>(false); 

	const [count, setCount] = useState(0);
	const [update, setUpdate] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			forceUpdate();
		}, 2000)

		if (ws.ready) {
			//ws.send(JSON.stringify({type: 'ping', message: 'Hello, server!'}));
			ws.send(JSON.stringify({type: 'request', message: 'getAll'}));

			setWaiting(true);
		}

		return () => clearInterval(interval);
	}, [ws.ready]);

	useEffect(() => {
		if (waiting) {
			const response = JSON.parse(ws.value!);
	
			if(response.message === "Cubesat updated successfully") {
				setCubesats(response.data);
			} 
			else if(response.message === "Cubesat added successfully") {
				setCubesats(response.data);
			}

			setWaiting(false);
		}
	}, [ws]);

	const getCubesatsButtonHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
		ws.send(JSON.stringify({type: 'request', message: 'getAll'}));
	}

	const addButtonHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
		ws.send(JSON.stringify({type: 'request', message: 'add', params: {id: count}}));
		setCount(count + 1);
	}

	const updateButtonHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
		const paramters = {
			id: 0,
			active: true,
			x: {update}
		}
		ws.send(JSON.stringify({type: 'request', message: 'update', params: paramters}));

		setUpdate(Math.floor(Math.random() * (100 - 1 + 1)) + 1);
	}

	return (
		<div>
			<Navbar />
			<div className="buttons">
				<button onClick={getCubesatsButtonHandler} className="getCubesats">
					Get Cubesats
				</button>
				<button onClick={addButtonHandler} className="addCubesat">
					Add Cubesat
				</button>
				<button onClick={updateButtonHandler} className="addCubesat">
					Update Cubesat
				</button>
			</div>
			<div className="cubesats">
				{cubesats.map((cubesat, index) => {
					return (<Cubesat {...cubesat}/>);
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
