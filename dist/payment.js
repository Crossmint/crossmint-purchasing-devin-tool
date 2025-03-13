"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletAddressFromPrivateKey = getWalletAddressFromPrivateKey;
exports.processPayment = processPayment;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Get wallet address from private key
 * @param privateKey Ethereum private key
 * @returns Wallet address
 */
function getWalletAddressFromPrivateKey(privateKey) {
    const wallet = new ethers_1.ethers.Wallet(privateKey);
    return wallet.address;
}
/**
 * Process payment for an order
 * @param order Order to process payment for
 * @param privateKey Private key to sign the transaction
 * @returns Transaction receipt
 */
async function processPayment(order, privateKey) {
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
    const serializedTransaction = order.payment.preparation != null && 'serializedTransaction' in order.payment.preparation
        ? order.payment.preparation.serializedTransaction
        : undefined;
    if (!serializedTransaction) {
        throw new Error(`No serialized transaction found for order, this item may not be available for purchase:\n\n ${JSON.stringify(order, null, 2)}`);
    }
    // Determine the correct RPC URL based on the payment method
    // If payment method is "base" or "polygon", use mainnet; if "base-sepolia" or "polygon-amoy", use testnet
    let rpcUrl;
    if (order.payment.method === 'base') {
        rpcUrl = 'https://mainnet.base.org';
    }
    else if (order.payment.method === 'base-sepolia') {
        rpcUrl = 'https://sepolia.base.org';
    }
    else if (order.payment.method === 'polygon') {
        rpcUrl = 'https://polygon-rpc.com/';
    }
    else if (order.payment.method === 'polygon-amoy') {
        rpcUrl = 'https://rpc-amoy.polygon.technology/';
    }
    else {
        // Default to polygon-amoy for unknown methods
        rpcUrl = 'https://rpc-amoy.polygon.technology/';
    }
    const provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
    try {
        const parsedTransaction = ethers_1.ethers.utils.parseTransaction(serializedTransaction);
        const tx = await wallet.sendTransaction(parsedTransaction);
        console.log('Transaction sent! Hash:', tx.hash);
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        return receipt;
    }
    catch (error) {
        console.error('Error sending transaction:', error);
        throw error;
    }
}
