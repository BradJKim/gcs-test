
import { DataTypes } from "sequelize";
import db from "../config/dbConfig";

const Cubesat = db.define("cubesat", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    }
});

export default Cubesat;