use soroban_sdk::{contract, contractimpl, Address, Env, String, Symbol};

use crate::types::{DataKey, InvoiceData, InvoiceError, InvoiceStatus};

const LEDGER_BUMP: u32 = 6_307_200; // ~1 year in ledgers
const LEDGER_LIFETIME_THRESHOLD: u32 = LEDGER_BUMP - 100_000;

#[contract]
pub struct InvoiceRegistry;

#[contractimpl]
impl InvoiceRegistry {
    pub fn initialize(env: Env, admin: Address) -> Result<(), InvoiceError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(InvoiceError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::InvoiceCount, &0u64);
        Ok(())
    }

    pub fn create_invoice(
        env: Env,
        creator: Address,
        invoice_id: String,
        memo_id: String,
        recipient: Address,
        amount: i128,
        asset: Symbol,
    ) -> Result<(), InvoiceError> {
        creator.require_auth();

        if amount <= 0 {
            return Err(InvoiceError::InvalidAmount);
        }

        if memo_id.len() == 0 {
            return Err(InvoiceError::InvalidMemo);
        }

        let invoice_key = DataKey::Invoice(invoice_id.clone());
        if env.storage().persistent().has(&invoice_key) {
            return Err(InvoiceError::AlreadyExists);
        }

        let memo_key = DataKey::MemoIndex(memo_id.clone());
        if env.storage().persistent().has(&memo_key) {
            return Err(InvoiceError::AlreadyExists);
        }

        let invoice = InvoiceData {
            invoice_id: invoice_id.clone(),
            memo_id: memo_id.clone(),
            recipient,
            amount,
            asset,
            status: InvoiceStatus::Pending,
            creator,
            tx_hash: String::from_str(&env, ""),
            created_at: env.ledger().timestamp(),
            paid_at: 0,
        };

        env.storage().persistent().set(&invoice_key, &invoice);
        env.storage().persistent().set(&memo_key, &invoice_id);

        env.storage()
            .persistent()
            .extend_ttl(&invoice_key, LEDGER_LIFETIME_THRESHOLD, LEDGER_BUMP);
        env.storage()
            .persistent()
            .extend_ttl(&memo_key, LEDGER_LIFETIME_THRESHOLD, LEDGER_BUMP);

        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::InvoiceCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::InvoiceCount, &(count + 1));

        Ok(())
    }

    pub fn get_invoice(env: Env, invoice_id: String) -> Result<InvoiceData, InvoiceError> {
        let key = DataKey::Invoice(invoice_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(InvoiceError::NotFound)
    }

    pub fn get_invoice_by_memo(env: Env, memo_id: String) -> Result<InvoiceData, InvoiceError> {
        let memo_key = DataKey::MemoIndex(memo_id);
        let invoice_id: String = env
            .storage()
            .persistent()
            .get(&memo_key)
            .ok_or(InvoiceError::NotFound)?;
        Self::get_invoice(env, invoice_id)
    }

    pub fn verify_payment(
        env: Env,
        invoice_id: String,
        tx_hash: String,
    ) -> Result<(), InvoiceError> {
        let key = DataKey::Invoice(invoice_id);
        let mut invoice: InvoiceData = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(InvoiceError::NotFound)?;

        if invoice.status == InvoiceStatus::Paid {
            return Ok(());
        }
        if invoice.status == InvoiceStatus::Cancelled {
            return Err(InvoiceError::AlreadyCancelled);
        }

        invoice.status = InvoiceStatus::Paid;
        invoice.tx_hash = tx_hash;
        invoice.paid_at = env.ledger().timestamp();

        env.storage().persistent().set(&key, &invoice);
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_LIFETIME_THRESHOLD, LEDGER_BUMP);

        Ok(())
    }

    pub fn cancel_invoice(
        env: Env,
        creator: Address,
        invoice_id: String,
    ) -> Result<(), InvoiceError> {
        creator.require_auth();

        let key = DataKey::Invoice(invoice_id);
        let mut invoice: InvoiceData = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(InvoiceError::NotFound)?;

        if invoice.creator != creator {
            return Err(InvoiceError::Unauthorized);
        }
        if invoice.status == InvoiceStatus::Paid {
            return Err(InvoiceError::AlreadyPaid);
        }
        if invoice.status == InvoiceStatus::Cancelled {
            return Ok(());
        }

        invoice.status = InvoiceStatus::Cancelled;
        env.storage().persistent().set(&key, &invoice);

        Ok(())
    }

    pub fn get_invoice_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::InvoiceCount)
            .unwrap_or(0)
    }
}
