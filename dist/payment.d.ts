import { ethers } from 'ethers';
/**
 * Interface for the order payment preparation
 */
export interface PaymentPreparation {
    serializedTransaction: string;
    [key: string]: any;
}
/**
 * Interface for the order payment
 */
export interface OrderPayment {
    status: string;
    method: string;
    currency: string;
    preparation?: PaymentPreparation;
}
/**
 * Interface for the order quote
 */
export interface OrderQuote {
    status: string;
    quotedAt?: string;
    expiresAt?: string;
    totalPrice?: {
        amount: string;
        currency: string;
    };
}
/**
 * Interface for the complete order
 */
export interface Order {
    orderId: string;
    phase: string;
    quote: OrderQuote;
    payment: OrderPayment;
    [key: string]: any;
}
/**
 * Get wallet address from private key
 * @param privateKey Ethereum private key
 * @returns Wallet address
 */
export declare function getWalletAddressFromPrivateKey(privateKey: string): string;
/**
 * Process payment for an order
 * @param order Order to process payment for
 * @param privateKey Private key to sign the transaction
 * @returns Transaction receipt
 */
export declare function processPayment(order: Order, privateKey: string): Promise<ethers.providers.TransactionReceipt>;
