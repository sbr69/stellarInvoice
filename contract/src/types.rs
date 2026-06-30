use soroban_sdk::{contracttype, contracterror, Address, String, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum InvoiceStatus {
    Pending,
    Paid,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvoiceData {
    pub invoice_id: String,
    pub memo_id: String,
    pub recipient: Address,
    pub amount: i128,
    pub asset: Symbol,
    pub status: InvoiceStatus,
    pub creator: Address,
    pub tx_hash: String,
    pub created_at: u64,
    pub paid_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Invoice(String),
    MemoIndex(String),
    InvoiceCount,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum InvoiceError {
    NotFound = 1,
    AlreadyExists = 2,
    AlreadyPaid = 3,
    AlreadyCancelled = 4,
    Unauthorized = 5,
    InvalidAmount = 6,
    InvalidMemo = 7,
    AlreadyInitialized = 8,
    NotInitialized = 9,
}
