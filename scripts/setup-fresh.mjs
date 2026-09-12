import "dotenv/config";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não está configurada.");
const deploymentMode = process.env.DEPLOYMENT_MODE === "multi" ? "multi" : "single";

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function runPrisma(...args) {
  const prismaEntrypoint = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [prismaEntrypoint, ...args], { encoding: "utf8", shell: false });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw new Error(`Falha ao iniciar prisma ${args.join(" ")}: ${result.error.message}`);
  if (result.status !== 0)
    throw new Error(`Falha ao executar prisma ${args.join(" ")} (código ${result.status ?? "desconhecido"}).`);
}

const client = new pg.Client({ connectionString, connectionTimeoutMillis: 15_000 });
try {
  await client.connect();
  console.log("PostgreSQL: conexão confirmada.");
  const tables = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  );
  for (const { tablename } of tables.rows) {
    const result = await client.query(
      `SELECT EXISTS (SELECT 1 FROM ${quoteIdentifier(tablename)} LIMIT 1) AS has_rows`
    );
    if (result.rows[0].has_rows)
      throw new Error(`ABORTADO: a tabela ${tablename} já possui dados. Nenhuma alteração foi aplicada.`);
  }
} finally {
  await client.end();
}

runPrisma("migrate", "deploy");
console.log("Migrations: aplicadas com sucesso.");
runPrisma("generate");
console.log("Prisma Client: gerado com sucesso.");

const storageRoot = path.resolve(process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), "storage", "private"));
await mkdir(storageRoot, { recursive: true, mode: 0o700 });
console.log("Storage privado: preparado.");
console.log(`DEPLOYMENT_MODE: ${deploymentMode}`);
if (deploymentMode !== "single")
  console.log("Aviso: este fluxo prepara a base para /setup, que é usado somente no modo single.");
console.log(
  "\nInstalação preparada com sucesso.\n\nPróximo passo:\nacesse /setup e cadastre a primeira organização e o primeiro ADMIN."
);
