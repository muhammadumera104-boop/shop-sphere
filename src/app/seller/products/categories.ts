import { prisma } from "@/lib/db";

export async function categoryOptions() {
  const cats = await prisma.category.findMany({ where: { isActive: true }, include: { parent: true }, orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }] });
  return cats.map((c) => ({ id: c.id, name: c.name, parent: c.parent?.name ?? null })).sort((a, b) => `${a.parent ?? a.name}${a.parent ? a.name : ""}`.localeCompare(`${b.parent ?? b.name}${b.parent ? b.name : ""}`));
}
