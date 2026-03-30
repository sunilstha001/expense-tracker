import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import { connectDB } from './config/db.js';
import { initializeSocket } from './socket.js';

import userRouter from './routes/userRoute.js';
import incomeRouter from './routes/incomeRoute.js';
import expenseRouter from './routes/expenseRoute.js';
import dashboardRouter from './routes/dashboardRoute.js';
import tripRouter from './routes/tripRoute.js';

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB
connectDB();

// ROUTES
app.use("/api/user", userRouter);
app.use("/api/income", incomeRouter);
app.use("/api/expense", expenseRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/trip", tripRouter);

app.get('/', (req, res) => {
    res.send("API WORKING");
});

initializeSocket(server);

server.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
});