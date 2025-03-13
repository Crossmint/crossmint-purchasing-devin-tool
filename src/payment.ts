import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

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
export function getWalletAddressFromPrivateKey(privateKey: string): string {
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}

/**
 * Process payment for an order
 * @param order Order to process payment for
 * @param privateKey Private key to sign the transaction
 * @returns Transaction receipt
 */
export async function processPayment(order: Order, privateKey: string): Promise<ethers.providers.TransactionReceipt> {
  // Check for insufficient funds
  const isInsufficientFunds = order.payment.status === 'crypto-payer-insufficient-funds';
  if (isInsufficientFunds) {
    throw new Error('Insufficient funds');
  }

  // Check if physical address is required
  const isRequiresPhysicalAddress = order.quote.status === 'requires-physical-address';
  if (isRequiresPhysicalAddress) {
    throw new Error('recipient.physicalAddress is required');
  }

  // Log the payment status
  console.log(`Payment status: ${order.payment.status}`);
  console.log(`Payment method: ${order.payment.method}`);
  
  // We'll proceed with payment if we have a serialized transaction,
  // regardless of the payment status, as the API might not always
  // set the status to 'awaiting-payment' when it's actually ready

  // Get serialized transaction
  const serializedTransaction =
    order.payment.preparation != null && 'serializedTransaction' in order.payment.preparation
      ? order.payment.preparation.serializedTransaction
      : undefined;
  
  if (!serializedTransaction) {
    throw new Error(
      `No serialized transaction found for order, this item may not be available for purchase:\n\n ${JSON.stringify(
        order,
        null,
        2,
      )}`,
    );
  }

  // Determine the correct RPC URL based on the payment method
  // If payment method is "base" or "polygon", use mainnet; if "base-sepolia" or "polygon-amoy", use testnet
  let rpcUrl: string;
  if (order.payment.method === 'base') {
    rpcUrl = 'https://mainnet.base.org';
  } else if (order.payment.method === 'base-sepolia') {
    rpcUrl = 'https://sepolia.base.org';
  } else if (order.payment.method === 'polygon') {
    rpcUrl = 'https://polygon-rpc.com/';
  } else if (order.payment.method === 'polygon-amoy') {
    rpcUrl = 'https://rpc-amoy.polygon.technology/';
  } else {
    // Default to polygon-amoy for unknown methods
    rpcUrl = 'https://rpc-amoy.polygon.technology/';
  }
  
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  try {
    const parsedTransaction = ethers.utils.parseTransaction(serializedTransaction);
    const tx = await wallet.sendTransaction(parsedTransaction as any);
    console.log('Transaction sent! Hash:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    return receipt;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
}
