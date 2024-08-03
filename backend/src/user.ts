import { PrismaClient } from "@prisma/client";
import express, { Request, Response } from "express";
const bcrypt = require("bcrypt");
const router = express.Router();
import z from "zod";
const jwt = require("jsonwebtoken");
require('dotenv').config();
import userMiddleware from "./userAuth";

const secret = process.env.JWT_SECRET as string;
const salt = process.env.Bcrypt_Salt as string;


const prisma = new PrismaClient();

const signupSchema = z.object({
    email: z.string().email().min(3, 'Username must be at least 3 characters long'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    name: z.string().min(3, 'Username must be at least 3 characters long'),
    phn_no: z.string().optional(),
})

type SignUpData = z.infer<typeof signupSchema>;

router.post("/signup", async (req: Request, res: Response) => {
    const parseResult = signupSchema.safeParse(req.body);

    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }

    const { email, password, name, phn_no }: SignUpData = parseResult.data;

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ msg: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name, phn_no },
        });

        const token = jwt.sign({ userId: user.id }, secret)

        res.status(201).json(token);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error while creating user' });
    }
});

const signinSchema = z.object({
    email: z.string().email().min(3, 'Username must be at least 3 characters long'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
})
type SignInSchema = z.infer<typeof signinSchema>

router.post("/signin", async (req: Request, res: Response) => {
    const parseResult = signinSchema.safeParse(req.body);

    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }

    const { email, password }: SignInSchema = parseResult.data;

    try {
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await prisma.user.findUnique({ where: { email, password : hashedPassword } });
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
});

const updateSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
    phn_no: z.string().optional(),
})

router.put("/update", userMiddleware, async (req: Request, res: Response) => {
    const parseResult = updateSchema.safeParse(req.body);

    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }

    const updateData: { password?: string, phn_no?: string } = {}

    if (parseResult.data.password) {
        updateData.password = await bcrypt.hash(parseResult.data.password, salt);
    }
    if (parseResult.data.phn_no) {
        updateData.phn_no = parseResult.data.phn_no;
    }

    try {

        await prisma.user.update({ where: { id: req.userId }, data: updateData });
        res.json({ msg: "updated Successfully" })
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ msg: 'Server error' });
    }
})

router.put("/addcart", userMiddleware, async (req: Request, res: Response) => {
    const userId = req.userId;
    const { watchId, quantity } = req.body;

    if (!watchId || quantity === undefined) {
        return res.status(400).json({ msg: 'Missing watchId or quantity' });
    }

    const user = await prisma.user.findUnique({where : {id : userId}});

    if(!user){
        return res.status(400).json({ msg: 'Missing watchId or quantity' });   
    }

    try{
        const watch = await prisma.watch.findUnique({
            where: { id: watchId },
        });

        if (!watch) {
            return res.status(404).json({ msg: 'Watch not found' });
        }

        const existingCartItem = await prisma.cartItem.findFirst({
            where: {
                userId: userId,
                watchId: watchId,
            },
        });

        if (existingCartItem) {
            const updatedItem = await prisma.cartItem.update({
                where: { id: existingCartItem.id },
                data: { quantity: existingCartItem.quantity + quantity },
            });
            return res.json({ msg: 'Item quantity updated', item: updatedItem });
        }

        await prisma.cartItem.create({
            data: {
                userId,
                watchId,
                quantity
            }as any
        });
    }
    catch (error) {
        console.error("Error adding item to cart:", error);
        res.status(500).json({ msg: 'Server error' });
    }
})

router.put("/cart",userMiddleware,async(req:Request,res : Response)=>{
    try {
        const userId = req.userId;

        const Cart = await prisma.cartItem.findMany({
            where:{userId}
        })

        res.json(Cart);
    }
    catch(error) {
        res.status(500).json({ msg: "Failed to fetch cart items" });
    }
})

export default router;