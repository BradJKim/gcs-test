import Cubesat from "../models/cubesat";

export async function createCubesat() {
    try {
        await Cubesat.create({
            id: 1,
            name: 'drone'
        });

        return JSON.stringify({status: 'success', message: 'Cubesat created successfully'});
    } catch(error) {
        return JSON.stringify({status: 'failure', message: `Cubesat creation unsuccessfull: ${error}`});
    }
}

export async function getAllCubesats() {
    try {
        const result = await Cubesat.findAll();

        return JSON.stringify({status: 'success', message: 'Cubesat created successfully', data: result});
    } catch(error) {
        return JSON.stringify({status: 'failure', message: `Cubesat creation unsuccessfull: ${error}`});
    }
}

export async function deleteCubesat() {
    try {
        await Cubesat.destroy({
            where: {name: 'drone'}
        });

        return JSON.stringify({status: 'success', message: 'Cubesat created successfully'});
    } catch(error) {
        return JSON.stringify({status: 'failure', message: `Cubesat creation unsuccessfull: ${error}`});
    }
}
