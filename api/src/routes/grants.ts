import { Router } from "express";
import { Repository } from "typeorm";
import { z } from "zod";
import { Grant } from "../entities/Grant";
import { GrantFeedback } from "../entities/GrantFeedback";
import { Activity } from "../entities/Activity";
import { GrantReviewer } from "../entities/GrantReviewer";
import { GrantSyncService } from "../services/grant-sync-service";
import { SignatureService } from "../services/signature-service";
import { ResponseCacheService, responseCacheKeys } from "../services/response-cache";

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
  role: z.enum(["funder", "reviewer", "recipient"]),
  address: z.string().regex(/^G[A-Z2-7]{55}$/),
  signature: z.string(),
  nonce: z.string(),
  timestamp: z.number(),
});

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

function localizeGrant(grant: Grant, lang?: string): any {
  const grantId = grant.id;
  const defaults = defaultGrantsData[grantId] || { title: grant.title, description: grant.description || "" };
  
  const localized = {
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

export const buildGrantRouter = (
  grantRepo: Repository<Grant>,
  syncService: GrantSyncService,
  feedbackRepo: Repository<GrantFeedback>,
  signatureService: SignatureService,
  activityRepo: Repository<Activity>,
  reviewerRepo: Repository<GrantReviewer>,
  responseCache: ResponseCacheService,
) => {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      await syncService.syncAllGrants();
      const communityId = req.query.communityId !== undefined ? Number(req.query.communityId) : undefined;
      const grants = Number.isInteger(communityId)
        ? await grantRepo.find({ where: { communityId }, order: { id: "ASC" } })
        : await grantRepo.find({ order: { id: "ASC" } });
      const lang = req.header("Accept-Language");
      const localizedGrants = grants.map((g) => localizeGrant(g, lang));
      res.json({ data: localizedGrants });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    const id = Number(req.params.id);
    try {
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

  router.get("/:id/feedback", async (req, res, next) => {
    const id = Number(req.params.id);
    try {
      if (Number.isNaN(id)) {
        res.status(400).json({ error: "Invalid grant id" });
        return;
      }

      const cacheKey = responseCacheKeys.grantFeedback(id);
      if (responseCache.isEnabled()) {
        const hit = await responseCache.get(cacheKey);
        if (hit) {
          res.type("application/json").send(hit);
          return;
        }
      }

      await syncService.syncGrant(id);
      const grant = await grantRepo.findOne({ where: { id } });
      if (!grant) {
        res.status(404).json({ error: "Grant not found" });
        return;
      }

      const feedbacks = await feedbackRepo.find({
        where: { grantId: id },
        order: { createdAt: "DESC", id: "DESC" },
      });

      const count = feedbacks.length;
      const averageRating = count > 0
        ? Number((feedbacks.reduce((sum, f) => sum + f.rating, 0) / count).toFixed(1))
        : 0;

      const items = feedbacks.map((f) => ({
        role: f.role,
        rating: f.rating,
        comment: f.comment,
        createdAt: f.createdAt.toISOString(),
        reviewerAddress: null,
      }));

      const responseBody = {
        data: {
          averageRating,
          feedbackCount: count,
          items,
        },
      };

      const serialized = JSON.stringify(responseBody);
      await responseCache.set(cacheKey, serialized, 300);

      res.type("application/json").send(serialized);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/feedback", async (req, res, next) => {
    const id = Number(req.params.id);
    try {
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

      const parsed = feedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
        return;
      }

      const payload = parsed.data;

      if (grant.status !== "completed") {
        res.status(400).json({ error: "Feedback is only accepted for completed grants" });
        return;
      }

      const maxSkewMs = 5 * 60 * 1000;
      if (Math.abs(Date.now() - payload.timestamp) > maxSkewMs) {
        res.status(400).json({ error: "Expired intent timestamp" });
        return;
      }

      const signatureIsValid = signatureService.verify({
        grantId: id,
        rating: payload.rating,
        role: payload.role,
        address: payload.address,
        nonce: payload.nonce,
        timestamp: payload.timestamp,
        signature: payload.signature,
      });

      if (!signatureIsValid) {
        res.status(401).json({ error: "Invalid Stellar signature" });
        return;
      }

      let isAuthorized = false;
      if (payload.role === "recipient") {
        isAuthorized = (grant.recipient === payload.address);
      } else if (payload.role === "reviewer") {
        const reviewer = await reviewerRepo.findOne({
          where: { grantId: id, reviewerStellarAddress: payload.address },
        });
        isAuthorized = !!reviewer;
      } else if (payload.role === "funder") {
        const activity = await activityRepo.findOne({
          where: {
            type: "grant_funded",
            entityType: "grant",
            entityId: id,
            actorAddress: payload.address,
          },
        });
        isAuthorized = !!activity;
      }

      if (!isAuthorized) {
        res.status(403).json({
          error: `Address is not authorized as a ${payload.role} for this grant`,
        });
        return;
      }

      const existing = await feedbackRepo.findOne({
        where: { grantId: id, reviewerAddress: payload.address },
      });
      if (existing) {
        res.status(409).json({
          error: "Duplicate feedback submission",
          rating: existing.rating,
        });
        return;
      }

      const feedback = await feedbackRepo.save({
        grantId: id,
        reviewerAddress: payload.address,
        role: payload.role,
        rating: payload.rating,
        comment: payload.comment ?? null,
      });

      const cacheKey = responseCacheKeys.grantFeedback(id);
      await responseCache.delete(cacheKey);

      res.status(201).json({ data: feedback });
    } catch (error: any) {
      if (error?.code === "23505" || error?.code === "SQLITE_CONSTRAINT") {
        const existing = await feedbackRepo.findOne({
          where: { grantId: id, reviewerAddress: req.body.address },
        });
        res.status(409).json({
          error: "Duplicate feedback submission",
          rating: existing?.rating,
        });
        return;
      }
      next(error);
    }
  });

  return router;
};
