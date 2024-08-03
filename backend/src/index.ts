import { PrismaClient } from "@prisma/client";
import express from "express";
import userRouter from "./user"
import compRouter from "./company";
import dotenv from 'dotenv';

dotenv.config();


const app = express();
const prisma = new PrismaClient();
app.use(express.json());

app.use("/user", userRouter);
app.use("./comp", compRouter);

async function main() {
    try {
      await prisma.$connect();
      console.log('Database connected');

      app.listen(3000, () => {
        console.log('Server is running on port 3000');
      });
    } catch (error) {
      console.error('Error starting the server:', error);
      process.exit(1);
    }
  }

  main();