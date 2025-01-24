import { Request, Response } from 'express';

export function getText(req: Request, res: Response) {
    res.send("this is a text from backend");
}