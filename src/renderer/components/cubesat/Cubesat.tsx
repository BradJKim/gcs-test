import React from "react";

interface Cubesat {
    id: number;
    name: string;
    active: boolean;
    x: number;
    y: number;
    z: number;
    sun_location: string;
    health: number;
    temperature: number;
    voltage: number;
    current: number;
    battery: number;
}
    
const Cubesat: React.FC<Cubesat> = (props) => {
    return (
        <div>
            <h1>Cubesat</h1>
            {Object.entries(props).map(([key, value]) => (
                <p key={key}>
                    {key}:{String(value)}
                </p>
            ))}
        </div>
    )
}

export default Cubesat;