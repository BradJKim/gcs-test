import React from "react";

interface Props {
    id: number,
    name: string
}
    
const Cubesat: React.FC<Props> = ({
    id,
    name
}) => {
    return (
        <div>
            <h1>Cubesat</h1>
            <p>{id}</p>
            <p>{name}</p>
        </div>
    )
}

export default Cubesat;