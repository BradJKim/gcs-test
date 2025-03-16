import Cubesat from "../models/cubesat";

export async function createCubesat(id: number) {
    try {
        await Cubesat.create({
            id: id,
            name: 'drone'
        });

        return {status: 'success', message: 'Cubesat created successfully'};
    } catch(error) {
        return {status: 'failure', message: `Cubesat creation unsuccessfull: ${error}`};
    }
}

export async function getAllCubesats() {
    try {
        const result = await Cubesat.findAll();

        return {status: 'success', message: 'All Cubesats returned successfully', data: result};
    } catch(error) {
        return {status: 'failure', message: `Cubesats not returned successfull: ${error}`};
    }
}

export async function updateCubesat(id: number, fields: object) {
    try {
      // Perform the update with dynamic fields
      const result = await Cubesat.update(fields, {
        where: {
          id: id,
        },
      });

        return {status: 'success', message: 'Cubesat updated successfully', data: result};
    } catch(error) {
        return {status: 'failure', message: `Cubesat updated unsuccessfull: ${error}`};
    }
}

export async function deleteCubesat() {
    try {
        await Cubesat.destroy({
            where: {name: 'drone'}
        });

        return {status: 'success', message: 'Cubesat destroyed successfully'};
    } catch(error) {
        return {status: 'failure', message: `Cubesat destroyed unsuccessfull: ${error}`};
    }
}
