#![no_std]

mod contract;
mod types;

#[cfg(test)]
mod test;

pub use contract::InvoiceRegistryClient;
pub use types::*;
