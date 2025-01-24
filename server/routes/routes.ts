import {Express} from 'express'
import { getText } from '../controllers/controller'

function routes(app: Express) {
    app.get('/', getText)
}

export default routes