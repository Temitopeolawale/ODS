import mongoose from "mongoose"

const dbConnect = async()=>{

    try {
        mongoose.set("strictQuery",false)
        const connected = await mongoose.connect(process.env.MONGODB_URL)

        console.log(`Database connected to ${connected.connection.host}`)
    } catch (error) {
        console.log({message:error.message})
        process.exit(1)
    }
}

export default dbConnect