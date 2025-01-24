import express, { Request, Response } from 'express'
import routes from './routes/routes';

const app = express()
const port = 8080

//app.use(express.json())
//app.use(express.urlencoded({extended: true}))

/* app.get('/', (req: Request, res: Response) => {
    //req.params()
    res.send('Hello World!')
}) */

routes(app);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
