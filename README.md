# Devin Tool for Purchasing Physical Products

A CLI tool for Devin to buy physical products. It pays using cryptocurrency via [Crossmint's Headless Checkout API](https://docs.crossmint.com/nft-checkout/headless/guides/physical-good-purchases). 

![image](https://github.com/user-attachments/assets/a0f6ae07-5799-4aad-98fc-28982156ef0c)

Questions? DM [@flymperopoulos](https://x.com/flymperopoulos) or [@alfongj](https://x.com/alfongj) on X.

## Overview

This tool allows Devin to purchase physical products from various sources. It is entirely headless,
not requiring any slow and unreliable browser automations, and sidestepping automated bot prevention
such as captchas, typical on e-commerce websites like Amazon. 

To use this tool, you must copy this code in a repo Devin has access to, set up an API key and crypto
wallet for Devin as secrets, and fill it up with USDC.

## Under the hood

This is a CLI tool wrapping [Crossmint's Headless Checkout API](https://docs.crossmint.com/nft-checkout/headless/guides/physical-good-purchases). 

It takes a URL or product ID, desired payment method (including crypto) and shipping information, and it returns 
a transaction that, when signed, will cause the product to be delivered. 

Crossmint acts as merchant of record, takes care of shipping, and acts as merchant of record. 

## Features

- Purchase physical products using cryptocurrency
- Support for multiple product sources (currently Amazon, with more to come)
- Same price as Amazon Prime, incl free shipping
- Payment can be token across most EVM chains (e.g. Polygon, Base)
- US only for now

## Code setup

- Node.js 16+
- Crossmint API key 
- Crypto wallet funded in EVM (Base and Polygon supported)

### Crossmint API Key

Get a server-side Crossmint API key on [its console](https://www.crossmint.com/console/overview).

- Required API key scopes: `orders.create` 

### Wallet Setup

You can use any existing EVM wallet of yours or create a new one and fund it. 

*Use existing wallet*
- Specify the wallet's private key as part of the CLI command when using the tool 

*Create new wallet*
- [Create a new wallet](https://docs.crossmint.com/api-reference/wallets/create-wallet) with Crossmint and fund it with some USDC and ETH
  - Required API key scopes: `wallets.create` and `wallets.fund`
 
You can obtain USDC and ETH on coinbase (or ping the Crossmint team for help).

## Devin Setup

### Repository 

Fork this repository inside your organization or copy the folder into an existing repo that Devin has access to. 

then, on Devin's machine, run the installation steps below, so it's ready to use.

### Knowledge Prompt
Let Devin know about the tool under Settings >> Knowledge. Click on "Add Knowledge", name the knowledge "Purchasing items" and add the following notes: 

```
You have a tool available to purchase amazon items programmatically.
It's in <path where tool was installed>.
If a user asks you to buy something, use this tool.
You can learn how to invoke the tool by reading the README.md file, Usage section
```

Make sure the prompt for the tool above points to the right repository.

### Secrets

- Define a `CROSSMINT_API_KEY` secret in Devin's knowledge for Devin to be able to access and use
- Define an `EVM_PRIVATE_KEY` secret in Devin's knowledge for Devin to be able to sign and execute onchain transactions

## Installation

```bash
# Install dependencies
pnpm install

# Build the tool
pnpm build
```

## Usage
These instructions are for Devin

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
