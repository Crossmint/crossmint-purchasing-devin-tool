# Crypto Physical Buyer

A tool for buying physical products using cryptocurrency via Crossmint's Headless Checkout API.

## Overview

This tool allows Devin to purchase physical products from various sources using cryptocurrency from a wallet funded in EVM (Base and Polygon supported). It leverages Crossmint's Headless Checkout API to handle the payment processing and order fulfillment.

Currently supported product sources:
- Amazon

## Features

- Purchase physical products using cryptocurrency
- Support for multiple product sources (currently Amazon, with more to come)
- Support for both product URLs and product IDs
- Configurable shipping address
- Integration with EVM (Base and Polygon) for payments
- Order status tracking

## Prerequisites

- Node.js 16+
- Crossmint API key
- Crypto wallet funded in EVM (Base and Polygon supported)

## Installation

```bash
# Install dependencies
pnpm install

# Build the tool
pnpm build
```

## Devin Knowledge Prompts
In order to properly run the tool, you will need to let Devin know how to work with them under Settings >> Knowledge. Click on "Add Knowledge", name the knowledge "Purchasing with Crypto" and add the following notes: 

```
The Crossmint team has installed you a tool. It's under the Crossmint/crossmint-purchasing-devin-tool repository. At the beginning of each session, you should check what the tool does and if it's available, in case it may help with your plan. 

1. Always check the tool at the start of a session
2. When a task mentions using specific tools (like "devin instances via API"), make sure to explore and understand the tool first
3. Don't skip tool exploration in favor of direct implementation
4. If unsure about a tool's functionality, review its documentation
```

## Usage

```bash
# Using an Amazon product URL (direct method)
node dist/cli.js buy --source amazon --url "https://www.amazon.com/dp/B01DFKC2SO" --api-key "your-crossmint-api-key" --private-key "your-private-key"

# Using an Amazon product ID (ASIN) (direct method)
node dist/cli.js buy --source amazon --id "B01DFKC2SO" --api-key "your-crossmint-api-key" --private-key "your-private-key"

# Check order status (direct method)
node dist/cli.js status --order-id "your-order-id" --api-key "your-crossmint-api-key"

# Alternative: Using pnpm start (note: arguments must be passed without spaces in the command)
pnpm start buy --source amazon --url "https://www.amazon.com/dp/B01DFKC2SO" --api-key "your-crossmint-api-key" --private-key "your-private-key"
```

You can also set the API key and private key using environment variables:

```bash
# Create a .env file based on the example
cp .env.example .env

# Edit the .env file with your keys
nano .env

# Run the command without passing the keys
node dist/cli.js buy --source amazon --url "https://www.amazon.com/dp/B01DFKC2SO"
```

### Command Options

```
Usage: crypto-physical-buyer [options] [command]

A tool for buying physical products using cryptocurrency via Crossmint

Options:
  -V, --version             output the version number
  -h, --help                display help for command

Commands:
  buy [options]             Buy a physical product using cryptocurrency
  status [options]          Check the status of an existing order
  help [command]            display help for command
```

### Buy Command Options

```
Usage: crypto-physical-buyer buy [options]

Buy a physical product using cryptocurrency

Options:
  -s, --source <source>              Product source (e.g., amazon) (default: "amazon")
  -u, --url <url>                    Product URL
  -i, --id <id>                      Product ID (e.g., ASIN for Amazon)
  -k, --api-key <key>                Crossmint API key
  -e, --email <email>                Buyer email address
  -p, --private-key <key>            Private key for transaction signing
  --address-name <name>              Shipping address name
  --address-line1 <line1>            Shipping address line 1
  --address-line2 <line2>            Shipping address line 2
  --address-city <city>              Shipping address city
  --address-state <state>            Shipping address state
  --address-postal-code <code>       Shipping address postal code
  --address-country <country>        Shipping address country
  -h, --help                         display help for command
```

### Status Command Options

```
Usage: crypto-physical-buyer status [options]

Check the status of an existing order

Options:
  -i, --order-id <id>       Order ID (required)
  -k, --api-key <key>       Crossmint API key
  -h, --help                display help for command
```

### Environment Variables

The tool supports the following environment variables:
- `CROSSMINT_API_KEY` - Your Crossmint API key for authentication
- `PRIVATE_KEY` - Private key for transaction signing
- `NODE_ENV` - Environment setting (production or staging)

## Development

### Building
```bash
pnpm build
```

### Testing
```bash
pnpm test
```

## API Reference

For more information about the Crossmint API, see the [official documentation](https://docs.crossmint.com/nft-checkout/headless/guides/physical-good-purchases).
