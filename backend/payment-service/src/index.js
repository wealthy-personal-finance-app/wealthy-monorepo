import express from "express"
import dotenv from "dotenv"
import path from "path"
import cors from "cors"
import {fileURLToPath} from "url"
import paymentRoutes from "./routes/paymentRoutes.js"
import {connectDB} from "@wealthy/common"

// Load .env from root
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({path: path.resolve(__dirname, "../../../.env")})

const app = express()
app.use(cors());

app.use("/", paymentRoutes)

// For all other routes, use JSON


const PORT = process.env.PAYMENT_PORT || 5003
const startService = async () => {
  await connectDB("wealthy_auth")
  app.listen(PORT, () =>
    console.log(`🚀 Payment Service running on port ${PORT}`)
  )
}

startService()
