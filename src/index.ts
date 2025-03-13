import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import { getWalletAddressFromPrivateKey, processPayment, Order } from './payment';

dotenv.config();

// Types
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
  chain?: string; // Add this line to support user-specified chain
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
  // The API response structure can be either:
  // 1. The expected structure with 'order' containing orderId, phase, and quote
  // 2. The actual structure where orderId, phase, and quote are at the top level
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
  // Fields for the actual API response structure
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

// Constants
// Determine API base URL based on the API key format
// Production keys start with 'sk_production_', staging keys start with 'sk_staging_'
function getApiBaseUrl(apiKey: string): string {
  if (apiKey && apiKey.startsWith('sk_production_')) {
    return 'https://www.crossmint.com/api/2022-06-09';
  } else {
    return 'https://staging.crossmint.com/api/2022-06-09';
  }
}

// Determine payment method based on the API key format or user-specified chain
function getPaymentMethod(apiKey: string, chain?: string): string {
  // If chain is specified, use it
  if (chain) {
    return chain;
  }
  
  // Otherwise, determine based on API key format
  if (apiKey && apiKey.startsWith('sk_production_')) {
    return SUPPORTED_CHAINS.POLYGON; // Use polygon for production
  } else {
    return SUPPORTED_CHAINS.POLYGON_AMOY; // Use polygon-amoy for staging
  }
}

const DEFAULT_EMAIL = 'devin-ai@example.com';

// Supported blockchain networks
export const SUPPORTED_CHAINS = {
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
export function extractAsinFromUrl(url: string): string | null {
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
export function createProductLocator(identifier: string, isUrl: boolean): string {
  if (isUrl) {
    return `amazon:${identifier}`;
  } else {
    return `amazon:${identifier}`;
  }
}

// Amazon product source implementation
export const AmazonSource: ProductSource = {
  name: 'amazon',
  extractProductId(url: string): string | null {
    // Match ASIN pattern in Amazon URLs
    const asinPattern = /\/([A-Z0-9]{10})(?:\/|\?|$)/;
    const match = url.match(asinPattern);
    return match ? match[1] : null;
  },
  createProductLocator(identifier: string, isUrl: boolean): string {
    if (isUrl) {
      const asin = this.extractProductId(identifier);
      return asin ? `amazon:${asin}` : `amazon:${identifier}`;
    } else {
      return `amazon:${identifier}`;
    }
  },
  validateIdentifier(identifier: string, isUrl: boolean): boolean {
    if (isUrl) {
      return this.extractProductId(identifier) !== null;
    }
    return /^[A-Z0-9]{10}$/.test(identifier);
  }
};

// Source registry to manage product sources
class SourceRegistry {
  private sources: Map<string, ProductSource> = new Map();

  registerSource(source: ProductSource): void {
    this.sources.set(source.name, source);
  }

  getSource(name: string): ProductSource | undefined {
    return this.sources.get(name);
  }

  getAllSources(): ProductSource[] {
    return Array.from(this.sources.values());
  }
}

// Create and initialize the source registry
export const sourceRegistry = new SourceRegistry();
sourceRegistry.registerSource(AmazonSource);

/**
 * Create an order for a physical product
 * @param options Order options
 * @returns Order response
 */
export async function createOrder(options: OrderOptions): Promise<OrderResponse> {
  const { source, productIdentifier, isUrl, apiKey, email, shippingAddress, chain } = options;
  
  // Get the source from the registry
  const productSource = sourceRegistry.getSource(source);
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
  const requestBody: any = {
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
    const payerAddress = getWalletAddressFromPrivateKey(privateKey);
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
    const response = await axios.post(`${apiBaseUrl}/orders`, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      }
    });
    
    // Store the response data
    const data = response.data;
    
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error(`API Error Response: ${JSON.stringify(axiosError.response.data)}`);
      throw new Error(`Failed to create order: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
    } else {
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
export async function updateOrderWithShippingAddress(
  orderId: string,
  apiKey: string,
  shippingAddress: ShippingAddress
): Promise<OrderResponse> {
  const requestBody: {
    recipient: {
      physicalAddress: {
        name: string;
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      }
    }
  } = {
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
    const response = await axios.patch(`${apiBaseUrl}/orders/${orderId}`, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      }
    });
    
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      throw new Error(`Failed to update order: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
    } else {
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
export async function getOrderStatus(orderId: string, apiKey: string): Promise<OrderStatusResponse> {
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
    
    const response = await axios.get(url, {
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
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error(`API Error Response: ${JSON.stringify(axiosError.response.data)}`);
      throw new Error(`Failed to get order status: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
    } else {
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
export async function buyProductWithCrypto(options: OrderOptions): Promise<{ orderId: string; status: string }> {
  // Create initial order
  const orderResponse = await createOrder(options);
  const orderId = orderResponse.order.orderId;
  let status = orderResponse.order.quote.status;
  
  // If status requires physical address and we have one, update the order
  if (status === 'requires-physical-address' && options.shippingAddress) {
    const updatedOrder = await updateOrderWithShippingAddress(
      orderId,
      options.apiKey,
      options.shippingAddress
    );
    status = updatedOrder.order.quote.status;
  }
  
  return { orderId, status };
}

/**
 * Process Amazon purchase with crypto (for backward compatibility)
 * @param options Order options without source
 * @returns Order ID and status
 */
export async function buyAmazonProductWithCrypto(options: Omit<OrderOptions, 'source'>): Promise<{ orderId: string; status: string }> {
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
export async function waitForPaymentPreparation(
  orderId: string,
  apiKey: string,
  maxAttempts: number = DEFAULT_POLLING_MAX_ATTEMPTS,
  delayMs: number = DEFAULT_POLLING_DELAY_MS
): Promise<OrderStatusResponse> {
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
    } catch (error) {
      if (attempts >= maxAttempts) {
        throw error;
      }
      console.error(`Error polling order status: ${error instanceof Error ? error.message : String(error)}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error(`Payment preparation not available after ${maxAttempts} attempts`);
}
