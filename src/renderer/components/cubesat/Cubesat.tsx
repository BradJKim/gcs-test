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

    // edit name or id feature with input elements
    // delete button with confirm
    // make smaller
    // get rid of created and make time since last updated

    return (
        <div id={`${props.id}`} className="cubesat">
            <h1 className="title">{props.name}</h1>
            {Object.entries(props).map(([key, value]) => (
                <p className="" key={key}>
                    {key}: {String(value)}
                </p>
            ))}
        </div>
    )
}

export default Cubesat;