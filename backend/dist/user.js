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
const client_1 = require("@prisma/client");
const express_1 = __importDefault(require("express"));
const bcrypt = require("bcrypt");
const router = express_1.default.Router();
const zod_1 = __importDefault(require("zod"));
const jwt = require("jsonwebtoken");
require('dotenv').config();
const userAuth_1 = __importDefault(require("./userAuth"));
const secret = process.env.JWT_SECRET;
const salt = process.env.Bcrypt_Salt;
const prisma = new client_1.PrismaClient();
const signupSchema = zod_1.default.object({
    email: zod_1.default.string().email().min(3, 'Username must be at least 3 characters long'),
    password: zod_1.default.string().min(6, 'Password must be at least 6 characters long'),
    name: zod_1.default.string().min(3, 'Username must be at least 3 characters long'),
    phn_no: zod_1.default.string().optional(),
});
router.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }
    const { email, password, name, phn_no } = parseResult.data;
    try {
        const existing = yield prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ msg: "User already exists" });
        }
        const hashedPassword = yield bcrypt.hash(password, salt);
        const user = yield prisma.user.create({
            data: { email, password: hashedPassword, name, phn_no },
        });
        const token = jwt.sign({ userId: user.id }, secret);
        res.status(201).json(token);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error while creating user' });
    }
}));
const signinSchema = zod_1.default.object({
    email: zod_1.default.string().email().min(3, 'Username must be at least 3 characters long'),
    password: zod_1.default.string().min(6, 'Password must be at least 6 characters long'),
});
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parseResult = signinSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }
    const { email, password } = parseResult.data;
    try {
        const hashedPassword = yield bcrypt.hash(password, salt);
        const user = yield prisma.user.findUnique({ where: { email, password: hashedPassword } });
        if (!user) {
            return res.status(400).json({ msg: "User doesn't exists" });
        }
        const token = jwt.sign({ userId: user.id }, secret);
        res.status(201).json(token);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error while finding user' });
    }
}));
const updateSchema = zod_1.default.object({
    password: zod_1.default.string().min(6, 'Password must be at least 6 characters long').optional(),
    phn_no: zod_1.default.string().optional(),
});
router.put("/update", userAuth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }
    const updateData = {};
    if (parseResult.data.password) {
        updateData.password = yield bcrypt.hash(parseResult.data.password, salt);
    }
    if (parseResult.data.phn_no) {
        updateData.phn_no = parseResult.data.phn_no;
    }
    try {
        yield prisma.user.update({ where: { id: req.userId }, data: updateData });
        res.json({ msg: "updated Successfully" });
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ msg: 'Server error' });
    }
}));
router.put("/addcart", userAuth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { watchId, quantity } = req.body;
    if (!watchId || quantity === undefined) {
        return res.status(400).json({ msg: 'Missing watchId or quantity' });
    }
    const user = yield prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return res.status(400).json({ msg: 'Missing watchId or quantity' });
    }
    try {
        const watch = yield prisma.watch.findUnique({
            where: { id: watchId },
        });
        if (!watch) {
            return res.status(404).json({ msg: 'Watch not found' });
        }
        const existingCartItem = yield prisma.cartItem.findFirst({
            where: {
                userId: userId,
                watchId: watchId,
            },
        });
        if (existingCartItem) {
            const updatedItem = yield prisma.cartItem.update({
                where: { id: existingCartItem.id },
                data: { quantity: existingCartItem.quantity + quantity },
            });
            return res.json({ msg: 'Item quantity updated', item: updatedItem });
        }
        yield prisma.cartItem.create({
            data: {
                userId,
                watchId,
                quantity
            }
        });
    }
    catch (error) {
        console.error("Error adding item to cart:", error);
        res.status(500).json({ msg: 'Server error' });
    }
}));
router.put("/cart", userAuth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const Cart = yield prisma.cartItem.findMany({
            where: { userId }
        });
        res.json(Cart);
    }
    catch (error) {
        res.status(500).json({ msg: "Failed to fetch cart items" });
    }
}));
exports.default = router;
