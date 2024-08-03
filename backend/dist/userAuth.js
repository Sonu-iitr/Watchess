"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require('dotenv').config();
const secret = process.env.JWT_SECRET;
function userMiddleware(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = req.headers.authorization;
        if (!token || !token.startsWith('Bearer ')) {
            return res.status(403).json({});
        }
        const jwtToken = token.split(" ")[1];
        try {
            const decodedValue = jsonwebtoken_1.default.verify(jwtToken, secret);
            if (decodedValue.userId) {
                req.userId = decodedValue.userId;
                next();
            }
            else {
                res.status(401).json({
                    msg: "You are not Authenticated"
                });
            }
        }
        catch (error) {
            console.error("Invalid token:", error);
            res.status(401).json({
                msg: "Invalid token"
            });
        }
    });
}
exports.default = userMiddleware;
