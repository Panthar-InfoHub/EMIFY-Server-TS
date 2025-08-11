import {PrismaClient} from "../prisma/client.js";

declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma = global.__prisma ?? new PrismaClient({
  transactionOptions: {
    maxWait: 5000,
    timeout: 30000,
  }
});

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma;
}

export default prisma;