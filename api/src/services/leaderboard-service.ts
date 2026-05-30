import { DataSource, Repository } from "typeorm";
import { Grant } from "../entities/Grant";
import { Contributor } from "../entities/Contributor";
import { ReputationLog } from "../entities/ReputationLog";

/** A leaderboard row enriched with an internal cursor id for keyset pagination. */
export interface LeaderboardEntry {
  address: string;
  reputation: number;
  totalGrantsCompleted: number;
  /** Internal field used for cursor encoding. Stripped before sending to clients. */
  _cursorId: number;
}

export class LeaderboardService {
  private readonly contributorRepo: Repository<Contributor>;
  private readonly reputationLogRepo: Repository<ReputationLog>;

  constructor(private readonly dataSource: DataSource) {
    this.contributorRepo = this.dataSource.getRepository(Contributor);
    this.reputationLogRepo = this.dataSource.getRepository(ReputationLog);
  }

  // ── Offset-based (backwards-compatible) ─────────────────────────────────────

  async getLeaderboard(
    period: "all-time" | "monthly",
    page: number = 1,
    limit: number = 20,
  ): Promise<[LeaderboardEntry[], number]> {
    if (period === "all-time") {
      return this._allTimeLeaderboard(page, limit);
    }
    return this._monthlyLeaderboard(page, limit);
  }

  // ── Cursor-based ─────────────────────────────────────────────────────────────

  /**
   * Returns leaderboard entries whose internal cursor id is greater than
   * `afterCursorId`, ordered by reputation DESC then id ASC for stability.
   * Fetches `limit + 1` rows so the caller can detect `hasMore`.
   */
  async getLeaderboardAfterCursor(
    period: "all-time" | "monthly",
    afterCursorId: number,
    limit: number = 20,
  ): Promise<[LeaderboardEntry[], number]> {
    if (period === "all-time") {
      return this._allTimeLeaderboardCursor(afterCursorId, limit);
    }
    return this._monthlyLeaderboardCursor(afterCursorId, limit);
  }

  // ── Private: all-time ────────────────────────────────────────────────────────

  private async _allTimeLeaderboard(
    page: number,
    limit: number,
  ): Promise<[LeaderboardEntry[], number]> {
    const qb = this.contributorRepo
      .createQueryBuilder("c")
      .select(["c.address", "c.reputation", "c.totalGrantsCompleted"])
      .addSelect("c.id", "_cursorId")
      .where("c.isBlacklisted = false")
      .orderBy("c.reputation", "DESC")
      .addOrderBy("c.id", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const entries = rows.map((c) => ({
      address: c.address,
      reputation: c.reputation,
      totalGrantsCompleted: c.totalGrantsCompleted,
      _cursorId: (c as unknown as { id: number }).id,
    }));
    return [entries, total];
  }

  private async _allTimeLeaderboardCursor(
    afterCursorId: number,
    limit: number,
  ): Promise<[LeaderboardEntry[], number]> {
    const qb = this.contributorRepo
      .createQueryBuilder("c")
      .select(["c.address", "c.reputation", "c.totalGrantsCompleted"])
      .addSelect("c.id", "_cursorId")
      .where("c.isBlacklisted = false")
      .andWhere("c.id > :afterCursorId", { afterCursorId })
      .orderBy("c.reputation", "DESC")
      .addOrderBy("c.id", "ASC")
      .take(limit + 1);

    const total = await this.contributorRepo.count({ where: { isBlacklisted: false } });
    const rows = await qb.getMany();
    const entries = rows.map((c) => ({
      address: c.address,
      reputation: c.reputation,
      totalGrantsCompleted: c.totalGrantsCompleted,
      _cursorId: (c as unknown as { id: number }).id,
    }));
    return [entries, total];
  }

  // ── Private: monthly ─────────────────────────────────────────────────────────

  private async _monthlyLeaderboard(
    page: number,
    limit: number,
  ): Promise<[LeaderboardEntry[], number]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const countResult = await this.reputationLogRepo
      .createQueryBuilder("log")
      .select("COUNT(DISTINCT log.address)", "count")
      .where("log.timestamp >= :thirtyDaysAgo", { thirtyDaysAgo })
      .getRawOne<{ count: string }>();

    const totalCount = parseInt(countResult?.count ?? "0", 10);
    if (totalCount === 0) {
      return this._allTimeLeaderboard(page, limit);
    }

    const rawResults = await this.reputationLogRepo
      .createQueryBuilder("log")
      .select("log.address", "address")
      .addSelect("SUM(log.gain)", "monthlyReputation")
      .addSelect("MIN(log.id)", "_cursorId")
      .where("log.timestamp >= :thirtyDaysAgo", { thirtyDaysAgo })
      .groupBy("log.address")
      .orderBy("SUM(log.gain)", "DESC")
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ address: string; monthlyReputation: string; _cursorId: string }>();

    const entries = await Promise.all(
      rawResults.map(async (row) => {
        const contributor = await this.contributorRepo.findOne({
          where: { address: row.address },
        });
        return {
          address: row.address,
          reputation: parseInt(row.monthlyReputation, 10),
          totalGrantsCompleted: contributor?.totalGrantsCompleted ?? 0,
          _cursorId: parseInt(row._cursorId, 10),
        };
      }),
    );

    return [entries, totalCount];
  }

  private async _monthlyLeaderboardCursor(
    afterCursorId: number,
    limit: number,
  ): Promise<[LeaderboardEntry[], number]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const countResult = await this.reputationLogRepo
      .createQueryBuilder("log")
      .select("COUNT(DISTINCT log.address)", "count")
      .where("log.timestamp >= :thirtyDaysAgo", { thirtyDaysAgo })
      .getRawOne<{ count: string }>();

    const totalCount = parseInt(countResult?.count ?? "0", 10);
    if (totalCount === 0) {
      return this._allTimeLeaderboardCursor(afterCursorId, limit);
    }

    const rawResults = await this.reputationLogRepo
      .createQueryBuilder("log")
      .select("log.address", "address")
      .addSelect("SUM(log.gain)", "monthlyReputation")
      .addSelect("MIN(log.id)", "_cursorId")
      .where("log.timestamp >= :thirtyDaysAgo", { thirtyDaysAgo })
      .andWhere("log.id > :afterCursorId", { afterCursorId })
      .groupBy("log.address")
      .orderBy("SUM(log.gain)", "DESC")
      .limit(limit + 1)
      .getRawMany<{ address: string; monthlyReputation: string; _cursorId: string }>();

    const entries = await Promise.all(
      rawResults.map(async (row) => {
        const contributor = await this.contributorRepo.findOne({
          where: { address: row.address },
        });
        return {
          address: row.address,
          reputation: parseInt(row.monthlyReputation, 10),
          totalGrantsCompleted: contributor?.totalGrantsCompleted ?? 0,
          _cursorId: parseInt(row._cursorId, 10),
        };
      }),
    );

    return [entries, totalCount];
  }
}
