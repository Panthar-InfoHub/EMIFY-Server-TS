import dotenv from 'dotenv';
dotenv.config();


import express from 'express';

const app = express();

const PORT = parseInt(String(process.env.PORT)) || 8080;

app.get("/health", (_, res) => {
    res.send("OK");
})


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});