use crate::types::MilestoneState;
use soroban_sdk::{contractevent, Address, Env, String};

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GrantCancelled {
    pub grant_id: u64,
    pub owner: Address,
    pub reason: String,
    pub refund_amount: i128,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RefundExecuted {
    pub grant_id: u64,
    pub funder: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RefundIssued {
    pub grant_id: u64,
    pub funder: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GrantCompleted {
    pub grant_id: u64,
    pub total_paid: i128,
    pub remaining_balance: i128,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FinalRefund {
    pub grant_id: u64,
    pub funder: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ContributorRegistered {
    pub contributor: Address,
    pub name: String,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MilestoneSubmitted {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub description: String,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GrantFunded {
    pub grant_id: u64,
    pub funder: Address,
    pub amount: i128,
    pub new_balance: i128,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GrantCreated {
    pub grant_id: u64,
    pub owner: Address,
    pub title: String,
    pub total_amount: i128,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MilestoneVoted {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub reviewer: Address,
    pub approve: bool,
    pub feedback: Option<String>,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MilestoneRejected {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub reviewer: Address,
    pub reason: String,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MilestoneStatusChanged {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub new_state: MilestoneState,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MilestonePaid {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub amount: i128,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ContractMigrated {
    pub from_version: u32,
    pub to_version: u32,
    pub run_by: Address,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReviewerApproved {
    pub reviewer: Address,
    pub approved_by: Address,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReviewerRevoked {
    pub reviewer: Address,
    pub revoked_by: Address,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ContractPaused {
    pub admin: Address,
    pub reason: String,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ContractUnpaused {
    pub admin: Address,
    pub timestamp: u64,
}

// ── Issue #514: Dispute events ────────────────────────────────────────────────

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DisputeRaised {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub raised_by: Address,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ArbiterAssigned {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub arbiter: Address,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ArbiterVoted {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub arbiter: Address,
    pub favor_contributor: bool,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DisputeResolved {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub resolved_for_contributor: bool,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DisputeCancelled {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub cancelled_by: Address,
    pub timestamp: u64,
}

// ── Issue #515: Reputation event ──────────────────────────────────────────────

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReputationUpdated {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub contributor: Address,
    pub new_reputation_score: u64,
    pub total_earned: i128,
    pub timestamp: u64,
}

// ── Issue #517: Fee collected event ──────────────────────────────────────────

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FeeCollected {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub fee_amount: i128,
    pub token: Address,
    pub treasury: Address,
    pub timestamp: u64,
}

pub struct Events;

impl Events {
    pub fn emit_grant_cancelled(
        env: &Env,
        grant_id: u64,
        owner: Address,
        reason: String,
        refund_amount: i128,
    ) {
        let event = GrantCancelled {
            grant_id,
            owner,
            reason,
            refund_amount,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_refund_executed(env: &Env, grant_id: u64, funder: Address, amount: i128) {
        let event = RefundExecuted {
            grant_id,
            funder,
            amount,
        };
        event.publish(env);
    }

    pub fn emit_refund_issued(env: &Env, grant_id: u64, funder: Address, amount: i128) {
        let event = RefundIssued {
            grant_id,
            funder,
            amount,
        };
        event.publish(env);
    }

    pub fn emit_grant_completed(
        env: &Env,
        grant_id: u64,
        total_paid: i128,
        remaining_balance: i128,
    ) {
        let event = GrantCompleted {
            grant_id,
            total_paid,
            remaining_balance,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_final_refund(env: &Env, grant_id: u64, funder: Address, amount: i128) {
        let event = FinalRefund {
            grant_id,
            funder,
            amount,
        };
        event.publish(env);
    }

    pub fn emit_milestone_submitted(
        env: &Env,
        grant_id: u64,
        milestone_idx: u32,
        description: String,
    ) {
        let event = MilestoneSubmitted {
            grant_id,
            milestone_idx,
            description,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_grant_funded(
        env: &Env,
        grant_id: u64,
        funder: Address,
        amount: i128,
        new_balance: i128,
    ) {
        let event = GrantFunded {
            grant_id,
            funder,
            amount,
            new_balance,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_grant_created(
        env: &Env,
        grant_id: u64,
        owner: Address,
        title: String,
        total_amount: i128,
    ) {
        let event = GrantCreated {
            grant_id,
            owner,
            title,
            total_amount,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_contributor_registered(env: &Env, contributor: Address, name: String) {
        let event = ContributorRegistered {
            contributor,
            name,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn milestone_voted(
        env: &Env,
        grant_id: u64,
        milestone_idx: u32,
        reviewer: Address,
        approve: bool,
        feedback: Option<String>,
    ) {
        let event = MilestoneVoted {
            grant_id,
            milestone_idx,
            reviewer,
            approve,
            feedback,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn milestone_rejected(
        env: &Env,
        grant_id: u64,
        milestone_idx: u32,
        reviewer: Address,
        reason: String,
    ) {
        let event = MilestoneRejected {
            grant_id,
            milestone_idx,
            reviewer,
            reason,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn milestone_status_changed(
        env: &Env,
        grant_id: u64,
        milestone_idx: u32,
        new_state: MilestoneState,
    ) {
        let event = MilestoneStatusChanged {
            grant_id,
            milestone_idx,
            new_state,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_milestone_paid(env: &Env, grant_id: u64, milestone_idx: u32, amount: i128) {
        let event = MilestonePaid {
            grant_id,
            milestone_idx,
            amount,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_contract_migrated(env: &Env, from_version: u32, to_version: u32, run_by: Address) {
        let event = ContractMigrated {
            from_version,
            to_version,
            run_by,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_reviewer_approved(env: &Env, reviewer: Address, approved_by: Address) {
        let event = ReviewerApproved {
            reviewer,
            approved_by,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_reviewer_revoked(env: &Env, reviewer: Address, revoked_by: Address) {
        let event = ReviewerRevoked {
            reviewer,
            revoked_by,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_contract_paused(env: &Env, admin: Address, reason: String) {
        let event = ContractPaused {
            admin,
            reason,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_contract_unpaused(env: &Env, admin: Address) {
        let event = ContractUnpaused {
            admin,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    // ── Issue #514: Dispute emit methods ──────────────────────────────────────

    pub fn emit_dispute_raised(env: &Env, grant_id: u64, milestone_idx: u32, raised_by: Address) {
        let event = DisputeRaised {
            grant_id,
            milestone_idx,
            raised_by,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_arbiter_assigned(env: &Env, grant_id: u64, milestone_idx: u32, arbiter: Address) {
        let event = ArbiterAssigned {
            grant_id,
            milestone_idx,
            arbiter,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_arbiter_voted(
        env: &Env,
        grant_id: u64,
        milestone_idx: u32,
        arbiter: Address,
        favor_contributor: bool,
    ) {
        let event = ArbiterVoted {
            grant_id,
            milestone_idx,
            arbiter,
            favor_contributor,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_dispute_resolved(
        env: &Env,
        grant_id: u64,
        milestone_idx: u32,
        resolved_for_contributor: bool,
    ) {
        let event = DisputeResolved {
            grant_id,
            milestone_idx,
            resolved_for_contributor,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    pub fn emit_dispute_cancelled(
        env: &Env,
        grant_id: u64,
        milestone_idx: u32,
        cancelled_by: Address,
    ) {
        let event = DisputeCancelled {
            grant_id,
            milestone_idx,
            cancelled_by,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    // ── Issue #515: Reputation emit method ───────────────────────────────────

    pub fn emit_reputation_updated(
        env: &Env,
        grant_id: u64,
        milestone_idx: u32,
        contributor: Address,
        new_reputation_score: u64,
        total_earned: i128,
    ) {
        let event = ReputationUpdated {
            grant_id,
            milestone_idx,
            contributor,
            new_reputation_score,
            total_earned,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }

    // ── Issue #517: Fee emit method ───────────────────────────────────────────

    pub fn emit_fee_collected(
        env: &Env,
        grant_id: u64,
        milestone_idx: u32,
        fee_amount: i128,
        token: Address,
        treasury: Address,
    ) {
        let event = FeeCollected {
            grant_id,
            milestone_idx,
            fee_amount,
            token,
            treasury,
            timestamp: env.ledger().timestamp(),
        };
        event.publish(env);
    }
}

// ── Issue #530: Multisig events ───────────────────────────────────────────────

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MultisigProposalCreated {
    pub proposal_id: u32,
    pub grant_id: u64,
    pub created_by: Address,
    pub threshold: u32,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MultisigSigned {
    pub proposal_id: u32,
    pub signer: Address,
    pub approved: bool,
    pub total_weight_signed: u32,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MultisigExecuted {
    pub proposal_id: u32,
    pub grant_id: u64,
    pub executed_by: Address,
    pub timestamp: u64,
}

// ── Issue #548: Compliance events ─────────────────────────────────────────────

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ComplianceAttested {
    pub subject: Address,
    pub attested_by: Address,
    pub level: u32,
    pub expires_at: u64,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ComplianceRevoked {
    pub subject: Address,
    pub revoked_by: Address,
    pub timestamp: u64,
}
