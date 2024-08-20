import { PrismaClient } from "@prisma/client";
import express, { Request, Response } from "express";
const bcrypt = require("bcrypt");
const router = express.Router();
import z from "zod";
const jwt = require("jsonwebtoken");
require('dotenv').config();
import compMiddleware from "./compAuth";
import userMiddleware from "./userAuth";

const secret = process.env.JWT_SECRET as string;
const salt = process.env.Bcrypt_Salt as string;


const prisma = new PrismaClient();

const signupSchema = z.object({
    Comp_name: z.string().min(3, 'Username must be at least 3 characters long'),
    email: z.string().email().min(3, 'Username must be at least 3 characters long'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
})

type SignUpData = z.infer<typeof signupSchema>;

router.post("/signup", async (req: Request, res: Response) => {
    const parseResult = signupSchema.safeParse(req.body);

    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }

    const {Comp_name, email, password}: SignUpData = parseResult.data;

    try {
        const existing = await prisma.company.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ msg: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, salt);
        const company = await prisma.company.create({ data:{Comp_name ,email ,password:hashedPassword}})

        const token = jwt.sign({ userId: company.id }, secret)

        res.status(201).json(token);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error while creating company' });
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
        const company = await prisma.company.findUnique({ where: { email}});
        if (!company || !(await bcrypt.compare(password, company.password))) {
            return res.status(400).json({ msg: "Invalid email or password" });
        }

        const token = jwt.sign({ userId: company.id }, secret);

        res.status(201).json(token);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error while finding user' });
    }
});

const updateSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
})

router.put("/update", compMiddleware, async (req: Request, res: Response) => {
    const parseResult = updateSchema.safeParse(req.body);

    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }    

    const password = parseResult.data;

    try {
        const hashedPassword = await bcrypt.hash(password, salt);
        await prisma.company.update({ where: { id: req.userId }, data: {password : hashedPassword} });
        res.json({ msg: "updated Successfully" })
    } catch (error) {
        console.error("Error updating company:", error);
        res.status(500).json({ msg: 'Server error' });
    }
})

const watchSchema = z.object({
    name: z.string(),
    desc: z.string(),
    stock: z.number().min(0),
    price: z.number().min(0),
});

router.post("/addWatch", async (req: Request, res: Response) => {
    const parseResult = watchSchema.safeParse(req.body);

    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }

    try {
        const { name, desc, stock, price } = parseResult.data;

        // Check if the company exists
        const company = await prisma.company.findUnique({ where: { id: req.userId } });
        if (!company) {
            return res.status(404).json({ msg: "Company not found" });
        }
        const companyId = company.id;

        // Check if a watch with the same name already exists for this company
        const existingWatch = await prisma.watch.findFirst({
            where: { name, companyId }
        });

        if (existingWatch) {
            return res.status(400).json({ msg: "Watch with this name already exists for this company" });
        }

        // Create the new watch associated with the company
        await prisma.watch.create({
            data: {
                name,
                desc,
                price,
                stock,
                companyId
            }
        });

        res.status(201).json({ msg: 'Watch added successfully' });
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.get("/watches",compMiddleware, async (req:Request , res:Response)=>{
    try{
        const watches  = await prisma.watch.findMany({where: {companyId : req.userId}})

        if (watches.length === 0) {
            return res.status(404).json({ msg: "No watches found" });
        }

        res.status(200).json(watches)
    }
    catch (error) {
        res.status(500).json({ error: "Server error" });
    }
})

const watchUpdate = z.object({
    desc: z.string().optional(),
    stock: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
})

router.put("/watch/:id",compMiddleware,async(req:Request,res:Response)=>{

    const parseResult = watchUpdate.safeParse(req.body);

    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }

    const {desc,price,stock}  = parseResult.data;
    
    try{
        const companyId = req.userId;
        const {id} = req.params;

        const watch = await prisma.watch.findUnique({where : {id,companyId}});

        if(!watch){
            return res.status(404).json({ msg: "Watch not found or not authorized to update" });
        }

        await prisma.watch.update({
            where: {
                id: watch.id, // Use the found watch ID for updating
            },
            data: {
                price,
                stock,
                desc, // Spread operator to update any other details provided
            },
        });

        res.status(200).json({msg : "Watch uploaded"})
        
    }
    catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});


export default router;