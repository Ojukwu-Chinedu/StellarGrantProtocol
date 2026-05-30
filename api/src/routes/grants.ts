import { Router } from "express";
import { Repository } from "typeorm";
import { Grant } from "../entities/Grant";
import { GrantSyncService } from "../services/grant-sync-service";
import { encodeCursor, decodeCursor, hasCursorPageConflict } from "../utils/pagination";

const translations: Record<string, Record<number, { title: string; description: string }>> = {
  es: {
    1: {
      title: "Subvenciones de Código Abierto Q2",
      description: "Apoyando los mejores proyectos de código abierto.",
    },
  },
};

const defaultGrantsData: Record<number, { title: string; description: string }> = {
  1: {
    title: "Open Source Grants Q2",
    description: "Supporting the best open-source projects.",
  },
  2: {
    title: "Climate Data Tools",
    description: "Tools for measuring climate impact.",
  },
};

function localizeGrant(grant: Grant, lang?: string): Record<string, unknown> {
  const grantId = grant.id;
  const defaults = defaultGrantsData[grantId] || { title: grant.title, description: grant.description || "" };

  const localized: Record<string, unknown> = {
    ...grant,
    title: defaults.title,
    description: defaults.description || null,
  };

  if (lang && translations[lang] && translations[lang][grantId]) {
    const translation = translations[lang][grantId];
    if (translation.title) localized.title = translation.title;
    if (translation.description) localized.description = translation.description;
  }

  return localized;
}

export const buildGrantRouter = (grantRepo: Repository<Grant>, syncService: GrantSyncService) => {
  const router = Router();

  /**
   * @openapi
   * /grants:
   *   get:
   *     summary: List grants
   *     description: >
   *       Returns a paginated list of grants. Supports both offset-based
   *       pagination (?page=) and cursor-based pagination (?cursor=).
   *       Cursor-based pagination is more efficient for large datasets.
   *       **?page= and ?cursor= cannot be combined** — the API returns 400
   *       if both are present.
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, minimum: 1, default: 1 }
   *         description: Offset page number (1-based). Ignored when cursor is provided.
   *       - in: query
   *         name: limit
   *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
   *       - in: query
   *         name: cursor
   *         schema: { type: string }
   *         description: >
   *           Opaque cursor from a previous response's meta.nextCursor.
   *           When provided, returns the next page of results after the cursor.
   *       - in: query
   *         name: communityId
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Paginated grant list
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items: { $ref: '#/components/schemas/Grant' }
   *                 meta:
   *                   type: object
   *                   properties:
   *                     nextCursor:
   *                       type: string
   *                       nullable: true
   *                       description: Cursor for the next page. null when no more items.
   *                     hasMore:
   *                       type: boolean
   *                     total:
   *                       type: integer
   *                       description: Only present for offset pagination.
   *                     page:
   *                       type: integer
   *                       description: Only present for offset pagination.
   *                     limit:
   *                       type: integer
   *       400:
   *         description: Cannot combine ?page= and ?cursor=
   */
  router.get("/", async (req, res, next) => {
    try {
      await syncService.syncAllGrants();

      const rawCursor = req.query.cursor ? String(req.query.cursor) : undefined;
      const rawPage   = req.query.page   ? String(req.query.page)   : undefined;

      // Reject combined usage
      if (hasCursorPageConflict(rawPage, rawCursor)) {
        res.status(400).json({ error: "Cannot combine ?page= and ?cursor= parameters" });
        return;
      }

      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const communityId = req.query.communityId !== undefined ? Number(req.query.communityId) : undefined;
      const grants = Number.isInteger(communityId)
        ? await grantRepo.find({ where: { communityId, isDraft: false }, order: { id: "ASC" } })
        : await grantRepo.find({ where: { isDraft: false }, order: { id: "ASC" } });
      const lang = req.header("Accept-Language");

      // ── Cursor-based path ──────────────────────────────────────────────────
      if (rawCursor !== undefined) {
        let cursorId: number;
        let cursorTs: string;
        try {
          const decoded = decodeCursor(rawCursor);
          cursorId = decoded.id;
          cursorTs = decoded.ts;
        } catch {
          res.status(400).json({ error: "Invalid cursor" });
          return;
        }

        const qb = grantRepo.createQueryBuilder("g")
          .orderBy("g.updatedAt", "DESC")
          .addOrderBy("g.id", "DESC")
          .take(limit + 1); // fetch one extra to detect hasMore

        if (Number.isInteger(communityId)) {
          qb.where("g.communityId = :communityId", { communityId });
          qb.andWhere(
            "(g.updatedAt < :ts OR (g.updatedAt = :ts AND g.id < :id))",
            { ts: cursorTs, id: cursorId },
          );
        } else {
          qb.where(
            "(g.updatedAt < :ts OR (g.updatedAt = :ts AND g.id < :id))",
            { ts: cursorTs, id: cursorId },
          );
        }

        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit);
        const last = page[page.length - 1];

        return res.json({
          data: page.map((g) => localizeGrant(g, lang)),
          meta: {
            nextCursor: hasMore && last ? encodeCursor(last.id, last.updatedAt) : null,
            hasMore,
            limit,
          },
        });
      }

      // ── Offset-based path (backwards-compatible) ───────────────────────────
      const page = Math.max(Number(rawPage) || 1, 1);
      const skip = (page - 1) * limit;

      const qb = grantRepo.createQueryBuilder("g")
        .orderBy("g.updatedAt", "DESC")
        .addOrderBy("g.id", "DESC")
        .skip(skip)
        .take(limit);

      if (Number.isInteger(communityId)) {
        qb.where("g.communityId = :communityId", { communityId });
      }

      const [grants, total] = await qb.getManyAndCount();

      return res.json({
        data: grants.map((g) => localizeGrant(g, lang)),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: "Invalid grant id" });
        return;
      }

      await syncService.syncGrant(id);
      const grant = await grantRepo.findOne({ where: { id } });

      if (!grant) {
        res.status(404).json({ error: "Grant not found" });
        return;
      }

      const lang = req.header("Accept-Language");
      res.json({ data: localizeGrant(grant, lang) });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
