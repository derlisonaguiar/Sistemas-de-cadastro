import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client.ts";
import { randomBytes, scrypt as nodeScrypt } from "crypto";
import { promisify } from "util";

const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD;
const name = process.env.SUPERADMIN_NAME?.trim();
if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("SUPERADMIN_EMAIL inválido.");
if (!password || password.length < 12 || password.length > 128)
  throw new Error("SUPERADMIN_PASSWORD deve ter entre 12 e 128 caracteres.");
if (!name || name.length > 200) throw new Error("SUPERADMIN_NAME inválido.");
const scrypt = promisify(nodeScrypt);
const salt = randomBytes(16);
const derived = (await scrypt(password, salt, 64)) as Buffer;
const passwordHash = `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
const prisma = new PrismaClient();
try {
  await prisma.authUser.upsert({
    where: { email },
    update: { name, passwordHash, role: "SUPERADMIN", active: true, selfEnrollment: false },
    create: { email, name, passwordHash, role: "SUPERADMIN", active: true, selfEnrollment: false },
  });
  console.log("SUPERADMIN criado ou atualizado.");
} finally {
  await prisma.$disconnect();
}
