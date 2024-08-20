import jwt ,{ JwtPayload } from "jsonwebtoken";
import { Request ,Response, NextFunction } from "express";
require('dotenv').config();

const secret = process.env.JWT_SECRET as string;

async function compMiddleware (req :Request,res:Response,next:NextFunction){
    const token = req.headers.authorization;

    if (!token || !token.startsWith('Bearer ')) {
        return res.status(403).json({});
    }

    const jwtToken = token.split(" ")[1];

    try {
        const decodedValue = jwt.verify(jwtToken, secret) as jwt.JwtPayload;

        if (decodedValue.userId) {
            req.userId= decodedValue.userId;
            next();
        } else {
            res.status(401).json({
                msg: "You are not Authenticated"
            });
        }
    } catch (error) {
        console.error("Invalid token:", error);
        res.status(401).json({
            msg: "Invalid token"
        });
    }
}

export default compMiddleware;