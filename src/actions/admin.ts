"use server";

import { db } from "@/db";
import { organizations, members, profiles, stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-z0-9-]/g, "");
}

async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
      columns: { id: true },
    });
    
    if (!existing) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

const createOrganizationSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  document: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")).optional(),
});

const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  organizationId: z.string().uuid("ID da organização inválido"),
  role: z.enum(["owner", "manager", "seller"]).default("owner"),
});

const storeInputSchema = z.object({
  name: z.string().min(2, "Nome da loja deve ter pelo menos 2 caracteres"),
  address: z.string().optional(),
});

const createOrganizationWithUserSchema = z.object({
  // Dados do usuário
  userName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  userEmail: z.string().email("E-mail inválido"),
  userPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  // Dados da organização
  organizationName: z.string().min(2, "Nome da organização deve ter pelo menos 2 caracteres"),
  organizationDocument: z.string().optional(),
  organizationLogoUrl: z.string().url().optional().or(z.literal("")).optional(),
  // Lojas
  stores: z.array(storeInputSchema).min(1, "Adicione pelo menos uma loja"),
});

type ActionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Ocorreu um erro desconhecido.";
}

/** Verifica se o usuário atual é admin da plataforma */
async function checkAdminAccess(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user?.email) {
    return { error: "Não autorizado" };
  }
  if (!isPlatformAdmin(user.email)) {
    return { error: "Apenas o administrador da plataforma pode acessar esta área." };
  }
  return {};
}

/** Lista todas as organizações com informações completas */
export async function listAllOrganizations() {
  const adminCheck = await checkAdminAccess();
  if (adminCheck.error) {
    return { error: adminCheck.error };
  }

  try {
    const orgs = await db.query.organizations.findMany({
      orderBy: (o, { desc }) => [desc(o.createdAt)],
      columns: {
        id: true,
        name: true,
        slug: true,
        document: true,
        logoUrl: true,
        plan: true,
        billingStatus: true,
        createdAt: true,
        asaasCustomerId: true,
        asaasSubscriptionId: true,
        planValueCents: true,
        planBillingDay: true,
      },
      with: {
        members: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        stores: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return { organizations: orgs };
  } catch (error) {
    console.error("Erro ao listar organizações:", error);
    return { error: "Erro ao listar organizações." };
  }
}

/** Cria uma nova organização */
export async function createOrganization(
  data: z.infer<typeof createOrganizationSchema>
): Promise<ActionResponse> {
  const adminCheck = await checkAdminAccess();
  if (adminCheck.error) {
    return { error: adminCheck.error };
  }

  try {
    const validated = createOrganizationSchema.parse(data);
    
    const baseSlug = slugify(validated.name);
    if (!baseSlug) {
      return { error: "Nome inválido para gerar slug." };
    }

    const slug = await generateUniqueSlug(baseSlug);

    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: validated.name.trim(),
        slug,
        document: validated.document?.trim() || null,
        logoUrl: validated.logoUrl?.trim() || null,
        plan: "enterprise",
        billingStatus: "active",
      })
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      });

    revalidatePath("/dashboard/admin");
    revalidatePath("/minha-conta");
    return {
      success: true,
      message: "Organização criada com sucesso!",
      data: newOrg,
    };
  } catch (error) {
    console.error("Erro ao criar organização:", error);
    if ((error as { code?: string }).code === "23505") {
      return { error: "Já existe uma organização com este slug." };
    }
    return { error: getErrorMessage(error) };
  }
}

/** Cria um novo usuário com senha e associa a uma organização */
export async function createUserWithPassword(
  data: z.infer<typeof createUserSchema>
): Promise<ActionResponse> {
  const adminCheck = await checkAdminAccess();
  if (adminCheck.error) {
    return { error: adminCheck.error };
  }

  try {
    const validated = createUserSchema.parse(data);

    // Verificar se a organização existe
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, validated.organizationId),
      columns: { id: true },
    });

    if (!org) {
      return { error: "Organização não encontrada." };
    }

    // Verificar se já existe um membro com este email nesta organização
    const existingMember = await db.query.members.findFirst({
      where: eq(members.email, validated.email),
      columns: { id: true },
    });

    if (existingMember) {
      return { error: "Este e-mail já está cadastrado em uma organização." };
    }

    const supabaseAdmin = createAdminClient();

    // Criar usuário no Supabase Auth com senha
    const { data: userData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: validated.email.trim(),
        password: validated.password,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          name: validated.name,
        },
      });

    if (authError || !userData.user) {
      console.error("Erro Supabase Admin:", authError);
      return {
        error: `Erro ao criar usuário: ${authError?.message || "Erro desconhecido"}`,
      };
    }

    // Criar perfil
    await db
      .insert(profiles)
      .values({
        id: userData.user.id,
        name: validated.name.trim(),
        email: validated.email.trim(),
        mustChangePassword: false, // Senha já foi definida
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          name: validated.name.trim(),
          email: validated.email.trim(),
        },
      });

    // Buscar a primeira loja da organização para ser a padrão
    const defaultStore = await db.query.stores.findFirst({
      where: eq(stores.organizationId, validated.organizationId),
      columns: { id: true },
    });

    // Criar membro na organização
    await db.insert(members).values({
      organizationId: validated.organizationId,
      email: validated.email.trim(),
      userId: userData.user.id,
      role: validated.role,
      defaultStoreId: defaultStore?.id || null,
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/team");
    return {
      success: true,
      message: "Usuário criado com sucesso!",
      data: {
        userId: userData.user.id,
        email: validated.email,
      },
    };
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return { error: getErrorMessage(error) };
  }
}

/** Cria organização completa: usuário + organização + lojas (fluxo unificado) */
export async function createOrganizationWithUserAndStores(
  data: z.infer<typeof createOrganizationWithUserSchema>
): Promise<ActionResponse> {
  const adminCheck = await checkAdminAccess();
  if (adminCheck.error) {
    return { error: adminCheck.error };
  }

  try {
    const validated = createOrganizationWithUserSchema.parse(data);

    // Verificar se já existe um membro com este email
    const existingMember = await db.query.members.findFirst({
      where: eq(members.email, validated.userEmail.trim()),
      columns: { id: true },
    });

    if (existingMember) {
      return { error: "Este e-mail já está cadastrado em uma organização." };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Criar usuário no Supabase Auth com senha
    const { data: userData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: validated.userEmail.trim(),
        password: validated.userPassword,
        email_confirm: true,
        user_metadata: {
          name: validated.userName,
        },
      });

    if (authError || !userData.user) {
      console.error("Erro Supabase Admin:", authError);
      return {
        error: `Erro ao criar usuário: ${authError?.message || "Erro desconhecido"}`,
      };
    }

    const userId = userData.user.id;

    // 2. Criar perfil
    await db
      .insert(profiles)
      .values({
        id: userId,
        name: validated.userName.trim(),
        email: validated.userEmail.trim(),
        mustChangePassword: false,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          name: validated.userName.trim(),
          email: validated.userEmail.trim(),
        },
      });

    // 3. Criar organização
    const baseSlug = slugify(validated.organizationName);
    if (!baseSlug) {
      return { error: "Nome inválido para gerar slug." };
    }

    const slug = await generateUniqueSlug(baseSlug);

    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: validated.organizationName.trim(),
        slug,
        document: validated.organizationDocument?.trim() || null,
        logoUrl: validated.organizationLogoUrl?.trim() || null,
        plan: "enterprise",
        billingStatus: "active",
      })
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      });

    // 4. Criar lojas
    const storeIds: string[] = [];
    for (const storeData of validated.stores) {
      const [store] = await db
        .insert(stores)
        .values({
          organizationId: newOrg.id,
          name: storeData.name.trim(),
          address: storeData.address?.trim() || null,
        })
        .returning({ id: stores.id });
      storeIds.push(store.id);
    }

    // 5. Criar membro vinculando usuário à organização (owner)
    await db.insert(members).values({
      organizationId: newOrg.id,
      email: validated.userEmail.trim(),
      userId,
      role: "owner",
      defaultStoreId: storeIds[0] || null, // Primeira loja como padrão
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/minha-conta");
    return {
      success: true,
      message: "Organização, usuário e lojas criados com sucesso!",
      data: {
        organizationId: newOrg.id,
        userId,
        storesCount: storeIds.length,
      },
    };
  } catch (error) {
    console.error("Erro ao criar organização completa:", error);
    if ((error as { code?: string }).code === "23505") {
      return { error: "Já existe uma organização com este slug ou e-mail já cadastrado." };
    }
    return { error: getErrorMessage(error) };
  }
}
