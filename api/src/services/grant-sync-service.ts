import { DataSource, Repository } from "typeorm";
import { Grant } from "../entities/Grant";
import { Milestone } from "../entities/Milestone";
import { SorobanContractClient, SorobanGrant } from "../soroban/types";

export class GrantSyncService {
  private readonly grantRepo: Repository<Grant>;
  private readonly milestoneRepo: Repository<Milestone>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly sorobanClient: SorobanContractClient,
  ) {
    this.grantRepo = this.dataSource.getRepository(Grant);
    this.milestoneRepo = this.dataSource.getRepository(Milestone);
  }

  async syncAllGrants(): Promise<void> {
    const grants = await this.sorobanClient.fetchGrants();
    for (const grant of grants) {
      const savedGrant = await this.syncGrantInternal(grant);
      await this.upsertMilestones(grant, savedGrant);
    }
  }

  async syncGrant(id: number): Promise<void> {
    const grant = await this.sorobanClient.fetchGrantById(id);
    if (!grant) return;
    const savedGrant = await this.syncGrantInternal(grant);
    await this.upsertMilestones(grant, savedGrant);
  }

  private async syncGrantInternal(grant: SorobanGrant): Promise<Grant> {
    return this.grantRepo.save(this.normalizeGrant(grant));
  }

  private async upsertMilestones(grant: SorobanGrant, savedGrant: Grant): Promise<void> {
    if (!grant.milestones?.length) {
      return;
    }

    await Promise.all(
      grant.milestones.map((milestone) =>
        this.milestoneRepo.upsert(
          {
            grantId: savedGrant.id,
            idx: milestone.idx,
            title: milestone.title,
            description: milestone.description ?? null,
            deadline: milestone.deadline,
          },
          ["grantId", "idx"],
        ),
      ),
    );
  }

  private normalizeGrant(grant: SorobanGrant): Partial<Grant> {
    const { milestones, ...grantData } = grant;
    return {
      ...grantData,
      owner: grant.owner ?? grant.recipient,
    };
  }
}
