export interface ProductSource {
    name: string;
    extractProductId(identifier: string): string | null;
    createProductLocator(identifier: string, isUrl: boolean): string;
    validateIdentifier(identifier: string, isUrl: boolean): boolean;
}
export interface ShippingAddress {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}
export interface OrderOptions {
    source: string;
    productIdentifier: string;
    isUrl: boolean;
    apiKey: string;
    email: string;
    shippingAddress?: ShippingAddress;
    chain?: string;
}
export interface OrderResponse {
    order: {
        orderId: string;
        quote: {
            status: string;
        };
    };
}
export interface OrderStatusResponse {
    clientSecret?: string;
    order?: {
        orderId: string;
        phase: string;
        locale?: string;
        lineItems?: Array<{
            chain?: string;
            metadata?: {
                name?: string;
                description?: string;
                imageUrl?: string;
            };
            quote?: {
                status: string;
                charges?: {
                    unit?: {
                        amount: string;
                        currency: string;
                    };
                };
                totalPrice?: {
                    amount: string;
                    currency: string;
                };
            };
            delivery?: {
                status: string;
                recipient?: {
                    locator?: string;
                    email?: string;
                    walletAddress?: string;
                };
            };
            executionMode?: string;
            callData?: {
                quantity?: number;
            };
            quantity?: number;
        }>;
        quote?: {
            status: string;
            quotedAt?: string;
            expiresAt?: string;
            totalPrice?: {
                amount: string;
                currency: string;
            };
        };
        payment?: {
            status: string;
            method: string;
            currency: string;
            preparation?: {
                serializedTransaction?: string;
                [key: string]: any;
            };
        };
    };
    orderId?: string;
    phase?: string;
    quote?: {
        status: string;
        quotedAt?: string;
        expiresAt?: string;
        totalPrice?: {
            amount: string;
            currency: string;
        };
    };
    payment?: {
        status: string;
        method: string;
        currency: string;
        preparation?: {
            serializedTransaction?: string;
            [key: string]: any;
        };
    };
}
export declare const SUPPORTED_CHAINS: {
    POLYGON: string;
    POLYGON_AMOY: string;
    BASE: string;
    BASE_SEPOLIA: string;
};
/**
 * Extract ASIN from Amazon URL
 * @param url Amazon product URL
 * @returns ASIN
 */
export declare function extractAsinFromUrl(url: string): string | null;
/**
 * Create a product locator string for Crossmint API
 * @param identifier Product identifier (URL or ASIN)
 * @param isUrl Whether the identifier is a URL
 * @returns Product locator string
 */
export declare function createProductLocator(identifier: string, isUrl: boolean): string;
export declare const AmazonSource: ProductSource;
declare class SourceRegistry {
    private sources;
    registerSource(source: ProductSource): void;
    getSource(name: string): ProductSource | undefined;
    getAllSources(): ProductSource[];
}
export declare const sourceRegistry: SourceRegistry;
/**
 * Create an order for a physical product
 * @param options Order options
 * @returns Order response
 */
export declare function createOrder(options: OrderOptions): Promise<OrderResponse>;
/**
 * Update an order with shipping address
 * @param orderId Order ID
 * @param apiKey Crossmint API key
 * @param shippingAddress Shipping address
 * @returns Updated order response
 */
export declare function updateOrderWithShippingAddress(orderId: string, apiKey: string, shippingAddress: ShippingAddress): Promise<OrderResponse>;
/**
 * Get order status
 * @param orderId Order ID
 * @param apiKey Crossmint API key
 * @returns Order status response
 */
export declare function getOrderStatus(orderId: string, apiKey: string): Promise<OrderStatusResponse>;
/**
 * Process a physical product purchase with crypto
 * @param options Order options
 * @returns Order ID and status
 */
export declare function buyProductWithCrypto(options: OrderOptions): Promise<{
    orderId: string;
    status: string;
}>;
/**
 * Process Amazon purchase with crypto (for backward compatibility)
 * @param options Order options without source
 * @returns Order ID and status
 */
export declare function buyAmazonProductWithCrypto(options: Omit<OrderOptions, 'source'>): Promise<{
    orderId: string;
    status: string;
}>;
/**
 * Wait for payment preparation to become available
 * @param orderId Order ID
 * @param apiKey Crossmint API key
 * @param maxAttempts Maximum number of attempts
 * @param delayMs Delay between attempts in milliseconds
 * @returns Order status response with payment preparation
 */
export declare function waitForPaymentPreparation(orderId: string, apiKey: string, maxAttempts?: number, delayMs?: number): Promise<OrderStatusResponse>;
export {};
