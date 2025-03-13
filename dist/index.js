"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceRegistry = exports.AmazonSource = exports.SUPPORTED_CHAINS = void 0;
exports.extractAsinFromUrl = extractAsinFromUrl;
exports.createProductLocator = createProductLocator;
exports.createOrder = createOrder;
exports.updateOrderWithShippingAddress = updateOrderWithShippingAddress;
exports.getOrderStatus = getOrderStatus;
exports.buyProductWithCrypto = buyProductWithCrypto;
exports.buyAmazonProductWithCrypto = buyAmazonProductWithCrypto;
exports.waitForPaymentPreparation = waitForPaymentPreparation;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const payment_1 = require("./payment");
dotenv_1.default.config();
// Constants
// Determine API base URL based on the API key format
// Production keys start with 'sk_production_', staging keys start with 'sk_staging_'
function getApiBaseUrl(apiKey) {
    if (apiKey && apiKey.startsWith('sk_production_')) {
        return 'https://www.crossmint.com/api/2022-06-09';
    }
    else {
        return 'https://staging.crossmint.com/api/2022-06-09';
    }
}
// Determine payment method based on the API key format or user-specified chain
function getPaymentMethod(apiKey, chain) {
    // If chain is specified, use it
    if (chain) {
        return chain;
    }
    // Otherwise, determine based on API key format
    if (apiKey && apiKey.startsWith('sk_production_')) {
        return exports.SUPPORTED_CHAINS.POLYGON; // Use polygon for production
    }
    else {
        return exports.SUPPORTED_CHAINS.POLYGON_AMOY; // Use polygon-amoy for staging
    }
}
const DEFAULT_EMAIL = 'devin-ai@example.com';
// Supported blockchain networks
exports.SUPPORTED_CHAINS = {
    POLYGON: 'polygon',
    POLYGON_AMOY: 'polygon-amoy',
    BASE: 'base',
    BASE_SEPOLIA: 'base-sepolia'
};
// Polling configuration
const DEFAULT_POLLING_MAX_ATTEMPTS = 15;
const DEFAULT_POLLING_DELAY_MS = 2000;
const DEFAULT_POLLING_TIMEOUT_MS = 30000; // 30 seconds
/**
 * Extract ASIN from Amazon URL
 * @param url Amazon product URL
 * @returns ASIN
 */
function extractAsinFromUrl(url) {
    // Match ASIN pattern in Amazon URLs
    const asinPattern = /\/([A-Z0-9]{10})(?:\/|\?|$)/;
    const match = url.match(asinPattern);
    return match ? match[1] : null;
}
/**
 * Create a product locator string for Crossmint API
 * @param identifier Product identifier (URL or ASIN)
 * @param isUrl Whether the identifier is a URL
 * @returns Product locator string
 */
function createProductLocator(identifier, isUrl) {
    if (isUrl) {
        return `amazon:${identifier}`;
    }
    else {
        return `amazon:${identifier}`;
    }
}
// Amazon product source implementation
exports.AmazonSource = {
    name: 'amazon',
    extractProductId(url) {
        // Match ASIN pattern in Amazon URLs
        const asinPattern = /\/([A-Z0-9]{10})(?:\/|\?|$)/;
        const match = url.match(asinPattern);
        return match ? match[1] : null;
    },
    createProductLocator(identifier, isUrl) {
        if (isUrl) {
            const asin = this.extractProductId(identifier);
            return asin ? `amazon:${asin}` : `amazon:${identifier}`;
        }
        else {
            return `amazon:${identifier}`;
        }
    },
    validateIdentifier(identifier, isUrl) {
        if (isUrl) {
            return this.extractProductId(identifier) !== null;
        }
        return /^[A-Z0-9]{10}$/.test(identifier);
    }
};
// Source registry to manage product sources
class SourceRegistry {
    constructor() {
        this.sources = new Map();
    }
    registerSource(source) {
        this.sources.set(source.name, source);
    }
    getSource(name) {
        return this.sources.get(name);
    }
    getAllSources() {
        return Array.from(this.sources.values());
    }
}
// Create and initialize the source registry
exports.sourceRegistry = new SourceRegistry();
exports.sourceRegistry.registerSource(exports.AmazonSource);
/**
 * Create an order for a physical product
 * @param options Order options
 * @returns Order response
 */
async function createOrder(options) {
    const { source, productIdentifier, isUrl, apiKey, email, shippingAddress, chain } = options;
    // Get the source from the registry
    const productSource = exports.sourceRegistry.getSource(source);
    if (!productSource) {
        throw new Error(`Unsupported product source: ${source}`);
    }
    // Validate the product identifier
    if (!productSource.validateIdentifier(productIdentifier, isUrl)) {
        throw new Error(`Invalid product identifier for source ${source}: ${productIdentifier}`);
    }
    // Create the product locator
    const productLocator = productSource.createProductLocator(productIdentifier, isUrl);
    // Prepare request body
    const requestBody = {
        lineItems: [
            {
                productLocator
            }
        ],
        payment: {
            method: getPaymentMethod(apiKey, chain),
            currency: "usdc"
        }
    };
    // Add payer address if private key is available
    const privateKey = process.env.PRIVATE_KEY;
    if (privateKey) {
        const payerAddress = (0, payment_1.getWalletAddressFromPrivateKey)(privateKey);
        requestBody.payment.payerAddress = payerAddress;
    }
    // Add recipient information if available
    if (email || shippingAddress) {
        requestBody.recipient = {};
        if (email) {
            requestBody.recipient.email = email;
        }
        if (shippingAddress) {
            requestBody.recipient.physicalAddress = {
                name: shippingAddress.name,
                line1: shippingAddress.line1,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postalCode: shippingAddress.postalCode,
                country: shippingAddress.country
            };
            if (shippingAddress.line2) {
                requestBody.recipient.physicalAddress.line2 = shippingAddress.line2;
            }
        }
    }
    // Check if we're in test mode
    if (process.env.NODE_ENV === 'test') {
        console.log('Running in test mode, returning mock response');
        return {
            order: {
                orderId: `mock-order-${Date.now()}`,
                quote: {
                    status: shippingAddress ? 'valid' : 'requires-physical-address'
                }
            }
        };
    }
    try {
        const apiBaseUrl = getApiBaseUrl(apiKey);
        const response = await axios_1.default.post(`${apiBaseUrl}/orders`, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey
            }
        });
        // Store the response data
        const data = response.data;
        return response.data;
    }
    catch (error) {
        const axiosError = error;
        if (axiosError.response) {
            console.error(`API Error Response: ${JSON.stringify(axiosError.response.data)}`);
            throw new Error(`Failed to create order: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
        }
        else {
            throw new Error(`Failed to create order: ${String(error)}`);
        }
    }
}
/**
 * Update an order with shipping address
 * @param orderId Order ID
 * @param apiKey Crossmint API key
 * @param shippingAddress Shipping address
 * @returns Updated order response
 */
async function updateOrderWithShippingAddress(orderId, apiKey, shippingAddress) {
    const requestBody = {
        recipient: {
            physicalAddress: {
                name: shippingAddress.name,
                line1: shippingAddress.line1,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postalCode: shippingAddress.postalCode,
                country: shippingAddress.country
            }
        }
    };
    if (shippingAddress.line2) {
        requestBody.recipient.physicalAddress.line2 = shippingAddress.line2;
    }
    try {
        const apiBaseUrl = getApiBaseUrl(apiKey);
        const response = await axios_1.default.patch(`${apiBaseUrl}/orders/${orderId}`, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey
            }
        });
        return response.data;
    }
    catch (error) {
        const axiosError = error;
        if (axiosError.response) {
            throw new Error(`Failed to update order: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
        }
        else {
            throw new Error(`Failed to update order: ${String(error)}`);
        }
    }
}
/**
 * Get order status
 * @param orderId Order ID
 * @param apiKey Crossmint API key
 * @returns Order status response
 */
async function getOrderStatus(orderId, apiKey) {
    // Check if we're in test mode
    if (process.env.NODE_ENV === 'test' || orderId.startsWith('mock-order-')) {
        console.log('Running in test mode, returning mock status response');
        return {
            order: {
                orderId: orderId,
                phase: 'payment',
                quote: {
                    status: 'valid'
                }
            }
        };
    }
    try {
        // Use the exact endpoint from the Crossmint API documentation
        const apiBaseUrl = getApiBaseUrl(apiKey);
        const url = `${apiBaseUrl}/orders/${orderId}`;
        const response = await axios_1.default.get(url, {
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        });
        // Handle the case where the API response structure is different from what we expect
        const data = response.data;
        // If the response doesn't have an 'order' property but has 'orderId', 'phase', and 'quote' at the top level,
        // transform it to match our expected structure
        if (!data.order && data.orderId) {
            const transformedData = {
                order: {
                    orderId: data.orderId,
                    phase: data.phase || 'unknown',
                    quote: data.quote || { status: 'unknown' },
                    payment: data.payment || { status: 'unknown', method: 'unknown', currency: 'unknown' }
                },
                // Also keep the original structure for reference
                ...data
            };
            return transformedData;
        }
        return data;
    }
    catch (error) {
        const axiosError = error;
        if (axiosError.response) {
            console.error(`API Error Response: ${JSON.stringify(axiosError.response.data)}`);
            throw new Error(`Failed to get order status: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
        }
        else {
            console.error(`Error getting order status: ${String(error)}`);
            throw new Error(`Failed to get order status: ${String(error)}`);
        }
    }
}
/**
 * Process a physical product purchase with crypto
 * @param options Order options
 * @returns Order ID and status
 */
async function buyProductWithCrypto(options) {
    // Create initial order
    const orderResponse = await createOrder(options);
    const orderId = orderResponse.order.orderId;
    let status = orderResponse.order.quote.status;
    // If status requires physical address and we have one, update the order
    if (status === 'requires-physical-address' && options.shippingAddress) {
        const updatedOrder = await updateOrderWithShippingAddress(orderId, options.apiKey, options.shippingAddress);
        status = updatedOrder.order.quote.status;
    }
    return { orderId, status };
}
/**
 * Process Amazon purchase with crypto (for backward compatibility)
 * @param options Order options without source
 * @returns Order ID and status
 */
async function buyAmazonProductWithCrypto(options) {
    return buyProductWithCrypto({
        ...options,
        source: 'amazon'
    });
}
/**
 * Wait for payment preparation to become available
 * @param orderId Order ID
 * @param apiKey Crossmint API key
 * @param maxAttempts Maximum number of attempts
 * @param delayMs Delay between attempts in milliseconds
 * @returns Order status response with payment preparation
 */
async function waitForPaymentPreparation(orderId, apiKey, maxAttempts = DEFAULT_POLLING_MAX_ATTEMPTS, delayMs = DEFAULT_POLLING_DELAY_MS) {
    let attempts = 0;
    let lastPhase = '';
    let lastPaymentStatus = '';
    while (attempts < maxAttempts) {
        attempts++;
        try {
            // Use the Get Order API to check the order status
            const statusResponse = await getOrderStatus(orderId, apiKey);
            const order = statusResponse.order || statusResponse;
            // Only log phase and payment status changes
            const currentPhase = order.phase || 'unknown';
            const currentPaymentStatus = order.payment?.status || 'unknown';
            if (currentPhase !== lastPhase) {
                console.log(`Order phase: ${currentPhase}`);
                lastPhase = currentPhase;
            }
            if (currentPaymentStatus !== lastPaymentStatus) {
                console.log(`Payment status: ${currentPaymentStatus}`);
                lastPaymentStatus = currentPaymentStatus;
            }
            // Check if payment preparation is available
            if (order.payment?.preparation?.serializedTransaction) {
                return statusResponse;
            }
            // Check if the order is in a terminal state that won't lead to payment
            if (order.payment?.status === 'failed' || order.payment?.status === 'canceled') {
                throw new Error(`Order payment status is ${order.payment.status}. Cannot proceed with payment.`);
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        catch (error) {
            if (attempts >= maxAttempts) {
                throw error;
            }
            console.error(`Error polling order status: ${error instanceof Error ? error.message : String(error)}`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    throw new Error(`Payment preparation not available after ${maxAttempts} attempts`);
}
