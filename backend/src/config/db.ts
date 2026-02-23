import mongoose from 'mongoose';

export const connectDBWithRetry = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dao-marketplace';
    const maxRetries = 10;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const conn = await mongoose.connect(uri);
            console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
            return;
        } catch (error: any) {
            attempt++;
            const delay = Math.min(30000, 500 * Math.pow(2, attempt)); // exponential backoff, cap 30s
            console.warn(`❌ MongoDB connect attempt ${attempt} failed: ${error.message}. Retrying in ${delay / 1000}s...`);
            if (attempt >= maxRetries) {
                console.error('Final attempt failed. Could not connect to MongoDB.');
                throw new Error('Failed to connect to MongoDB after multiple attempts');
            }
            await new Promise(res => setTimeout(res, delay));
        }
    }
};

export default connectDBWithRetry;
