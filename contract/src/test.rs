#![cfg(test)]

use soroban_sdk::{testutils::{Address as _, Ledger as _}, Address, Env, String, Symbol};

use crate::contract::{InvoiceRegistry, InvoiceRegistryClient};
use crate::types::{InvoiceError, InvoiceStatus};

fn setup_env() -> (Env, InvoiceRegistryClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);
    let contract_id = env.register(InvoiceRegistry, ());
    let client = InvoiceRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

#[test]
fn test_create_and_get_invoice() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let invoice_id = String::from_str(&env, "inv-001");
    let memo_id = String::from_str(&env, "MEMO1234");
    let asset = Symbol::new(&env, "XLM");

    client.create_invoice(&creator, &invoice_id, &memo_id, &recipient, &1_000_000_000, &asset);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.invoice_id, invoice_id);
    assert_eq!(invoice.memo_id, memo_id);
    assert_eq!(invoice.recipient, recipient);
    assert_eq!(invoice.amount, 1_000_000_000);
    assert_eq!(invoice.status, InvoiceStatus::Pending);
    assert_eq!(invoice.creator, creator);
}

#[test]
fn test_get_invoice_by_memo() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let invoice_id = String::from_str(&env, "inv-002");
    let memo_id = String::from_str(&env, "MEMO5678");
    let asset = Symbol::new(&env, "XLM");

    client.create_invoice(&creator, &invoice_id, &memo_id, &recipient, &500_000_000, &asset);

    let invoice = client.get_invoice_by_memo(&memo_id);
    assert_eq!(invoice.invoice_id, invoice_id);
    assert_eq!(invoice.amount, 500_000_000);
}

#[test]
fn test_duplicate_memo_fails() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let memo_id = String::from_str(&env, "DUPMEMO");
    let asset = Symbol::new(&env, "XLM");

    client.create_invoice(
        &creator,
        &String::from_str(&env, "inv-a"),
        &memo_id,
        &recipient,
        &100,
        &asset,
    );

    let result = client.try_create_invoice(
        &creator,
        &String::from_str(&env, "inv-b"),
        &memo_id,
        &recipient,
        &200,
        &asset,
    );
    assert_eq!(result, Err(Ok(InvoiceError::AlreadyExists)));
}

#[test]
fn test_verify_payment() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let invoice_id = String::from_str(&env, "inv-003");
    let memo_id = String::from_str(&env, "MEMOPAY1");
    let asset = Symbol::new(&env, "XLM");

    client.create_invoice(&creator, &invoice_id, &memo_id, &recipient, &1_000, &asset);

    let tx_hash = String::from_str(&env, "abc123def456");
    client.verify_payment(&invoice_id, &tx_hash);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Paid);
    assert_eq!(invoice.tx_hash, tx_hash);
    assert!(invoice.paid_at > 0);
}

#[test]
fn test_verify_payment_idempotent() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let invoice_id = String::from_str(&env, "inv-004");
    let memo_id = String::from_str(&env, "MEMOIDEM");
    let asset = Symbol::new(&env, "XLM");

    client.create_invoice(&creator, &invoice_id, &memo_id, &recipient, &500, &asset);

    let tx_hash = String::from_str(&env, "hash1");
    client.verify_payment(&invoice_id, &tx_hash);
    // Calling again should succeed (idempotent)
    let tx_hash2 = String::from_str(&env, "hash2");
    client.verify_payment(&invoice_id, &tx_hash2);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Paid);
}

#[test]
fn test_cancel_invoice() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let invoice_id = String::from_str(&env, "inv-005");
    let memo_id = String::from_str(&env, "MEMOCANC");
    let asset = Symbol::new(&env, "XLM");

    client.create_invoice(&creator, &invoice_id, &memo_id, &recipient, &1_000, &asset);
    client.cancel_invoice(&creator, &invoice_id);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Cancelled);
}

#[test]
fn test_cancel_by_non_creator_fails() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let non_creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let invoice_id = String::from_str(&env, "inv-006");
    let memo_id = String::from_str(&env, "MEMOUNAU");
    let asset = Symbol::new(&env, "XLM");

    client.create_invoice(&creator, &invoice_id, &memo_id, &recipient, &1_000, &asset);

    let result = client.try_cancel_invoice(&non_creator, &invoice_id);
    assert_eq!(result, Err(Ok(InvoiceError::Unauthorized)));
}

#[test]
fn test_cancel_paid_invoice_fails() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let invoice_id = String::from_str(&env, "inv-007");
    let memo_id = String::from_str(&env, "MEMOPAID");
    let asset = Symbol::new(&env, "XLM");

    client.create_invoice(&creator, &invoice_id, &memo_id, &recipient, &1_000, &asset);
    client.verify_payment(&invoice_id, &String::from_str(&env, "tx_paid"));

    let result = client.try_cancel_invoice(&creator, &invoice_id);
    assert_eq!(result, Err(Ok(InvoiceError::AlreadyPaid)));
}

#[test]
fn test_verify_cancelled_invoice_fails() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let invoice_id = String::from_str(&env, "inv-008");
    let memo_id = String::from_str(&env, "MEMOVCNC");
    let asset = Symbol::new(&env, "XLM");

    client.create_invoice(&creator, &invoice_id, &memo_id, &recipient, &1_000, &asset);
    client.cancel_invoice(&creator, &invoice_id);

    let result = client.try_verify_payment(&invoice_id, &String::from_str(&env, "tx_late"));
    assert_eq!(result, Err(Ok(InvoiceError::AlreadyCancelled)));
}

#[test]
fn test_invoice_count() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset = Symbol::new(&env, "XLM");

    assert_eq!(client.get_invoice_count(), 0);

    client.create_invoice(
        &creator,
        &String::from_str(&env, "c1"),
        &String::from_str(&env, "M1"),
        &recipient,
        &100,
        &asset,
    );
    assert_eq!(client.get_invoice_count(), 1);

    client.create_invoice(
        &creator,
        &String::from_str(&env, "c2"),
        &String::from_str(&env, "M2"),
        &recipient,
        &200,
        &asset,
    );
    assert_eq!(client.get_invoice_count(), 2);
}

#[test]
fn test_invalid_amount_fails() {
    let (env, client, _admin) = setup_env();
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset = Symbol::new(&env, "XLM");

    let result = client.try_create_invoice(
        &creator,
        &String::from_str(&env, "inv-neg"),
        &String::from_str(&env, "MEMONEG"),
        &recipient,
        &0,
        &asset,
    );
    assert_eq!(result, Err(Ok(InvoiceError::InvalidAmount)));
}

#[test]
fn test_not_found() {
    let (_env, client, _admin) = setup_env();
    let env = &_env;
    let result = client.try_get_invoice(&String::from_str(env, "nonexistent"));
    assert_eq!(result, Err(Ok(InvoiceError::NotFound)));
}
