/**
 * Contract Client
 * 
 * Typed ContractClient class that wraps all StellarGrants contract methods.
 * Uses auto-generated TypeScript bindings from the contract ABI.
 */

import { networkPassphraseConfig } from "./client";

const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || "";

export class ContractClient {
  private _contractId: string;
  private _rpcUrl: string;
  private _networkPassphrase: string;

  constructor(config?: {
    contractId?: string;
    rpcUrl?: string;
    networkPassphrase?: string;
  }) {
    this._contractId = config?.contractId || contractId;
    this._rpcUrl = config?.rpcUrl || process.env.NEXT_PUBLIC_STELLAR_RPC_URL || "";
    this._networkPassphrase = config?.networkPassphrase || networkPassphraseConfig;
  }

  /**
   * Read-only: Fetch a grant by ID
   */
  async grantGet(_params: { grant_id: bigint }) {
    // TODO: Implement contract method calls
    throw new Error("Not implemented");
  }

  /**
   * Read-only: Fetch all milestones for a grant
   */
  async milestonesGet(_params: { grant_id: bigint }) {
    // TODO: Implement contract method calls
    throw new Error("Not implemented");
  }

  /**
   * Read-only: Get contributor reputation score
   */
  async contributorScore(_params: { address: string }) {
    // TODO: Implement contract method calls
    throw new Error("Not implemented");
  }

  /**
   * Read-only: Get reviewer list for a grant
   */
  async grantReviewers(_params: { grant_id: bigint }) {
    // TODO: Implement contract method calls
    throw new Error("Not implemented");
  }

  /**
   * Write: Create a new grant
   */
  async grantCreate(_params: {
    owner: string;
    title: string;
    budget: bigint;
    deadline: bigint;
    milestones: bigint;
  }) {
    // TODO: Implement contract method calls
    throw new Error("Not implemented");
  }

  /**
   * Write: Fund a grant
   */
  async grantFund(_params: {
    grant_id: string;
    token: string;
    amount: bigint;
  }) {
    // TODO: Implement contract method calls
    throw new Error("Not implemented");
  }

  /**
   * Write: Submit milestone proof
   */
  async milestoneSubmit(_params: {
    grant_id: string;
    milestone_idx: number;
    proof_hash: string;
  }) {
    // TODO: Implement contract method calls
    throw new Error("Not implemented");
  }

  /**
   * Write: Approve milestone
   */
  async milestoneApprove(_params: {
    grant_id: string;
    milestone_idx: number;
    reviewer: string;
  }) {
    // TODO: Implement contract method calls
    throw new Error("Not implemented");
  }

  /**
   * Write: Cast a vote on a milestone (approve or reject).
   *
   * Wraps milestoneApprove / future milestoneReject contract methods.
   * The `approve` flag maps to the correct underlying call.
   *
   * @param grantId       - Grant ID string
   * @param milestoneIdx  - Zero-based milestone index
   * @param approve       - true → approve, false → reject
   */
  async voteOnMilestone(
    grantId: string,
    milestoneIdx: number,
    approve: boolean
  ): Promise<void> {
    if (approve) {
      await this.milestoneApprove({
        grant_id: grantId,
        milestone_idx: milestoneIdx,
        reviewer: "",   // caller address injected at signing time
      });
    } else {
      // TODO: wire to milestoneReject contract method once added
      throw new Error("Milestone rejection not yet implemented in contract");
    }
  }
}

// Export singleton instance
export const contractClient = new ContractClient();
