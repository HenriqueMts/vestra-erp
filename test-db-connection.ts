import dotenv from "dotenv";
import { sql } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

async function testConnection() {
  console.log("Testando conexão com o banco de dados...");
  
  // Import dinâmico para garantir que dotenv rodou antes
  const { db } = await import("./src/db");

  try {
    const result = await db.execute(sql`SELECT 1`);
    console.log("Conexão bem sucedida!", result);
  } catch (error) {
    console.error("Erro ao conectar:", error);
  }
  process.exit(0);
}

testConnection();
