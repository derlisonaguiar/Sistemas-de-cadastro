import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { loadSource } from "./helpers/load-source.mjs";

function fixture(profiles = []) {
  const rows = new Map(profiles.map((row) => [row.id, { ...row }]));
  const tx = {
    $queryRaw: async () => [],
    userProfile: {
      findUnique: async ({ where }) => rows.get(where.id),
      findFirst: async ({ where }) =>
        [...rows.values()].find((row) => row.id === where.id && row.organizationId === where.organizationId),
      count: async ({ where }) =>
        [...rows.values()].filter((row) => Object.entries(where).every(([key, value]) => row[key] === value)).length,
      update: async ({ where, data }) => {
        const row = { ...rows.get(where.id), ...data };
        rows.set(row.id, row);
        return row;
      },
      create: async ({ data }) => {
        rows.set(data.id, data);
        return data;
      },
    },
    authUser: {
      create: async ({ data }) => ({ id: "new", ...data }),
    },
  };
  let queue = Promise.resolve();
  const prisma = {
    ...tx,
    $transaction: (action) => {
      const result = queue.then(() => action(tx));
      queue = result.catch(() => {});
      return result;
    },
  };
  let identity = profiles[0] ? { id: profiles[0].id, role: profiles[0].role, email: "admin@example.com" } : null;
  const mocks = {
    "server-only": {},
    "@/lib/prisma": { prisma },
    "@/lib/local-auth": {
      getSessionIdentity: async () => identity,
      hashPassword: async () => "local-password-hash",
    },
    "@/lib/organization-context": {
      OrganizationContextError: class extends Error {},
      resolveSessionOrganization: async (organizationId) => ({ id: organizationId }),
    },
  };
  const auth = loadSource("lib/auth.ts", mocks);
  return {
    rows,
    prisma,
    mocks,
    setIdentity: (user) => {
      identity = user ? { email: `${user.id}@example.com`, role: "USER", ...user } : null;
    },
    auth,
    service: loadSource("lib/user-management.ts", { ...mocks, "@/lib/auth": auth }),
  };
}
const admin = { id: "admin", organizationId: "org", role: "ADMIN", active: true };
const viewer = { id: "viewer", organizationId: "org", role: "USER", active: true };

test("edit schema accepts name, role and status; rejects email, password and organization changes", () => {
  const { service } = fixture();
  assert.deepEqual(service.updateUserSchema.parse({ name: "  Novo Nome  ", role: "USER", active: true }), {
    name: "Novo Nome",
    role: "USER",
    active: true,
  });
  for (const invalid of [
    {},
    { name: " " },
    { name: "x".repeat(151) },
    { email: "new@example.com" },
    { name: "Nome válido", password: "NewPassword123" },
    { organizationId: "foreign" },
    { role: "MEMBER" },
  ]) {
    assert.equal(service.updateUserSchema.safeParse(invalid).success, false);
  }
});

test("PATCH edits the scoped profile, preserves Auth email and forbids USER and foreign targets", async () => {
  const f = fixture([
    admin,
    { ...viewer, name: "Nome Antigo", email: "original@example.com" },
    { ...viewer, id: "foreign", organizationId: "other" },
  ]);
  const route = loadSource("app/api/users/[id]/route.ts", {
    ...f.mocks,
    "@/lib/auth": f.auth,
    "@/lib/user-management": f.service,
  });
  const patch = (id, body) =>
    route.PATCH(
      new Request(`https://app.test/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) }
    );
  f.setIdentity({ id: "viewer" });
  assert.equal((await patch("admin", { name: "Tentativa" })).status, 403);
  f.setIdentity({ id: "admin" });
  assert.equal((await patch("foreign", { name: "Tentativa" })).status, 404);
  assert.equal((await patch("viewer", { email: "changed@example.com" })).status, 400);
  assert.equal((await patch("viewer", { name: "Nome Atualizado", role: "ADMIN", active: false })).status, 200);
  assert.deepEqual(f.rows.get("viewer"), {
    ...viewer,
    name: "Nome Atualizado",
    email: "original@example.com",
    role: "ADMIN",
    active: false,
  });
});

test("last ADMIN may edit name, but combined edits cannot demote or deactivate that ADMIN", async () => {
  const f = fixture([admin]);
  await f.service.updateOrganizationUser("admin", "org", "admin", { name: "Nome Atualizado" });
  for (const changes of [
    { name: "Não salvar", role: "USER" },
    { name: "Não salvar", active: false },
  ]) {
    await assert.rejects(f.service.updateOrganizationUser("admin", "org", "admin", changes), /último ADMIN/);
    assert.equal(f.rows.get("admin").name, "Nome Atualizado");
    assert.equal(f.rows.get("admin").role, "ADMIN");
    assert.equal(f.rows.get("admin").active, true);
  }
});

test("existing ADMIN retains full access; USER reads but cannot administer; inactive sessions fail", async () => {
  const f = fixture([admin, viewer]);
  assert.equal((await f.auth.getAdminApiContext()).auth.profile.id, "admin");
  f.setIdentity({ id: "viewer" });
  assert.equal((await f.auth.getReadApiContext()).auth.profile.id, "viewer");
  assert.equal((await f.auth.getAdminApiContext()).response.status, 403);
  f.rows.get("viewer").active = false;
  assert.equal((await f.auth.getReadApiContext()).response.status, 403);
  f.setIdentity(null);
  assert.equal((await f.auth.getReadApiContext()).response.status, 401);
});

test("last active ADMIN cannot be demoted or deactivated", async () => {
  const f = fixture([admin, viewer]);
  for (const changes of [{ role: "USER" }, { active: false }]) {
    await assert.rejects(f.service.updateOrganizationUser("admin", "org", "admin", changes), /último ADMIN/);
  }
  assert.equal(f.rows.get("admin").active, true);
});

test("updates enforce organization and recheck actor inside transaction", async () => {
  const f = fixture([admin, viewer, { ...viewer, id: "foreign", organizationId: "other" }]);
  await assert.rejects(
    f.service.updateOrganizationUser("admin", "org", "foreign", { active: false }),
    /não encontrado/
  );
  await assert.rejects(f.service.updateOrganizationUser("viewer", "org", "admin", { active: false }), /FORBIDDEN/);
  await assert.rejects(f.service.updateOrganizationUser("admin", "other", "foreign", { active: false }), /FORBIDDEN/);
  await f.service.updateOrganizationUser("admin", "org", "viewer", { role: "ADMIN" });
  await f.service.updateOrganizationUser("admin", "org", "admin", { active: false });
  await assert.rejects(f.service.updateOrganizationUser("admin", "org", "viewer", { active: false }), /FORBIDDEN/);
});

test("serialized concurrent demotions preserve an active ADMIN", async () => {
  const f = fixture([admin, { ...admin, id: "second" }]);
  const results = await Promise.allSettled([
    f.service.updateOrganizationUser("admin", "org", "admin", { role: "USER" }),
    f.service.updateOrganizationUser("second", "org", "second", { role: "USER" }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal([...f.rows.values()].filter((row) => row.role === "ADMIN" && row.active).length, 1);
});

test("creation rejects foreign organization, unknown role and weak password", () => {
  const { service } = fixture();
  const valid = { name: "Example User", email: "test@example.com", password: "ExamplePassword123", role: "USER" };
  assert.equal(service.createUserSchema.safeParse(valid).success, true);
  for (const changes of [{ organizationId: "foreign" }, { role: "MEMBER" }, { password: "short" }]) {
    assert.equal(service.createUserSchema.safeParse({ ...valid, ...changes }).success, false);
  }
});

test("create links a local account only to the administrator organization", async () => {
  const f = fixture([admin]);
  const route = loadSource("app/api/users/route.ts", {
    ...f.mocks,
    "@/lib/auth": f.auth,
    "@/lib/user-management": f.service,
  });
  const response = await route.POST(
    new Request("https://app.test/api/users", {
      method: "POST",
      body: JSON.stringify({
        name: "New User",
        email: "new@example.com",
        password: "ExamplePassword123",
        role: "USER",
      }),
    })
  );
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.user.organizationId, "org");
  assert.equal(body.user.id, "new");
  assert.equal("password" in body, false);
});

test("every business mutation remains guarded by ADMIN in its route handler", () => {
  function walk(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
    );
  }
  for (const file of walk("app/api").filter(
    (file) => file.endsWith("route.ts") && !file.includes(`${path.sep}auth${path.sep}`)
  )) {
    if (file.endsWith(path.join("setup", "route.ts"))) continue;
    const source = readFileSync(file, "utf8");
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    for (const node of ast.statements) {
      if (ts.isFunctionDeclaration(node) && ["POST", "PUT", "PATCH", "DELETE"].includes(node.name?.text)) {
        if (file.endsWith(path.join("members", "export", "route.ts"))) {
          assert.match(node.getText(ast), /getReadApiContext\(\)/, file + " " + node.name.text);
          continue;
        }
        if (file.includes(`${path.sep}member-applications${path.sep}me${path.sep}`)) {
          assert.match(source, /getAuthenticatedUser\(\)/, file + " " + node.name.text);
          assert.match(node.getText(ast), /userId:\s*(auth\.user!|user)\.id/, file + " " + node.name.text);
          continue;
        }
        if (file.includes(`${path.sep}member-applications${path.sep}[id]${path.sep}`)) {
          assert.match(source, /getAdminApiContext\(\)/, file + " " + node.name.text);
          assert.match(node.getText(ast), /adminContext\(context\)/, file + " " + node.name.text);
        } else {
          assert.match(node.getText(ast), /getAdminApiContext\(\)/, file + " " + node.name.text);
        }
        assert.doesNotMatch(node.getText(ast), /getReadApiContext\(\)/, file);
      }
    }
  }
});

test("password reset endpoint remains scoped and reports unavailable local email delivery", async () => {
  const f = fixture([admin, viewer]);
  const route = loadSource("app/api/users/[id]/reset-password/route.ts", {
    ...f.mocks,
    "@/lib/auth": f.auth,
  });
  const request = () =>
    new Request("https://untrusted.example/api/users/viewer/reset-password", {
      method: "POST",
      body: JSON.stringify({ email: "attacker@example.com", redirectTo: "https://attacker.example" }),
    });
  f.setIdentity({ id: "viewer" });
  assert.equal((await route.POST(request(), { params: Promise.resolve({ id: "admin" }) })).status, 403);
  f.setIdentity({ id: "admin" });
  assert.equal((await route.POST(request(), { params: Promise.resolve({ id: "foreign" }) })).status, 404);
  assert.equal((await route.POST(request(), { params: Promise.resolve({ id: "viewer" }) })).status, 501);
});
