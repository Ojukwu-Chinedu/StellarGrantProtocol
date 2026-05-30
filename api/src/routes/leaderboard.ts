import { Router } from "express";
import { LeaderboardService } from "../services/leaderboard-service";
import { encodeCursor, decodeCursor, hasCursorPageConflict } from "../utils/pagination";

export const buildLeaderboardRouter = (leaderboardService: LeaderboardService) => {
  const router = Router();

  /**
   * @openapi
   * /leaderboard:
   *   get:
   *     summary: Contributor leaderboard
   *     description: >
   *       Returns a paginated leaderboard. Supports both offset-based
   *       pagination (?page=) and cursor-based pagination (?cursor=).
   *       **?page= and ?cursor= cannot be combined** — returns 400 if both present.
   *     parameters:
   *       - in: query
   *         name: period
   *         schema: { type: string, enum: [all-time, monthly], default: all-time }
   *       - in: query
   *         name: page
   *         schema: { type: integer, minimum: 1, default: 1 }
   *         description: Offset page number. Ignored when cursor is provided.
   *       - in: query
   *         name: limit
   *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
   *       - in: query
   *         name: cursor
   *         schema: { type: string }
   *         description: >
   *           Opaque cursor from meta.nextCursor. Uses the last-seen contributor
   *           id as the keyset pointer.
   *     responses:
   *       200:
   *         description: Leaderboard page
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                 meta:
   *                   type: object
   *                   properties:
   *                     nextCursor:
   *                       type: string
   *                       nullable: true
   *                       description: Cursor for the next page. null when exhausted.
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
   *         description: Cannot combine ?page= and ?cursor=, or invalid cursor
   */
  router.get("/", async (req, res, next) => {
    try {
      const period = req.query.period === "monthly" ? "monthly" : "all-time";
      const limit  = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

      const rawCursor = req.query.cursor ? String(req.query.cursor) : undefined;
      const rawPage   = req.query.page   ? String(req.query.page)   : undefined;

      // Reject combined usage
      if (hasCursorPageConflict(rawPage, rawCursor)) {
        res.status(400).json({ error: "Cannot combine ?page= and ?cursor= parameters" });
        return;
      }

      // ── Cursor-based path ──────────────────────────────────────────────────
      if (rawCursor !== undefined) {
        let cursorId: number;
        try {
          const decoded = decodeCursor(rawCursor);
          cursorId = decoded.id;
        } catch {
          res.status(400).json({ error: "Invalid cursor" });
          return;
        }

        const [data, total] = await leaderboardService.getLeaderboardAfterCursor(
          period,
          cursorId,
          limit,
        );

        const hasMore = (data as unknown[]).length > limit;
        const page = (data as unknown[]).slice(0, limit);
        const last = page[page.length - 1] as { id?: number; _cursorId?: number } | undefined;

        // The leaderboard service returns a _cursorId field for cursor encoding
        const lastId = last?._cursorId ?? last?.id;
        const nextCursor =
          hasMore && lastId !== undefined
            ? encodeCursor(lastId, new Date(0)) // timestamp unused for leaderboard; id is the keyset
            : null;

        // Strip internal _cursorId before sending
        const cleaned = page.map((item) => {
          const { _cursorId: _dropped, ...rest } = item as Record<string, unknown>;
          return rest;
        });

        return res.json({
          data: cleaned,
          meta: {
            nextCursor,
            hasMore,
            total,
            limit,
          },
        });
      }

      // ── Offset-based path (backwards-compatible) ───────────────────────────
      const page = Math.max(Number(rawPage) || 1, 1);
      const [data, total] = await leaderboardService.getLeaderboard(period, page, limit);

      return res.json({
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(Number(total) / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
