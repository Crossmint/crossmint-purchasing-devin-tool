import { extractAsinFromUrl, createProductLocator, AmazonSource, sourceRegistry } from '../src/index';

describe('Crypto Physical Buyer', () => {
  describe('Amazon Source', () => {
    describe('extractProductId', () => {
      it('should extract ASIN from standard Amazon product URL', () => {
        const url = 'https://www.amazon.com/dp/B01DFKC2SO';
        expect(AmazonSource.extractProductId(url)).toBe('B01DFKC2SO');
      });

      it('should extract ASIN from Amazon URL with additional parameters', () => {
        const url = 'https://www.amazon.com/Product-Name/dp/B01DFKC2SO/ref=sr_1_1';
        expect(AmazonSource.extractProductId(url)).toBe('B01DFKC2SO');
      });

      it('should return null for invalid Amazon URL', () => {
        const url = 'https://www.amazon.com/product-without-asin';
        expect(AmazonSource.extractProductId(url)).toBeNull();
      });
    });

    describe('createProductLocator', () => {
      it('should create product locator for URL', () => {
        const url = 'https://www.amazon.com/dp/B01DFKC2SO';
        expect(AmazonSource.createProductLocator(url, true)).toBe('amazon:B01DFKC2SO');
      });

      it('should create product locator for ASIN', () => {
        const asin = 'B01DFKC2SO';
        expect(AmazonSource.createProductLocator(asin, false)).toBe('amazon:B01DFKC2SO');
      });
    });

    describe('validateIdentifier', () => {
      it('should validate a valid Amazon URL', () => {
        const url = 'https://www.amazon.com/dp/B01DFKC2SO';
        expect(AmazonSource.validateIdentifier(url, true)).toBe(true);
      });

      it('should invalidate an invalid Amazon URL', () => {
        const url = 'https://www.amazon.com/product-without-asin';
        expect(AmazonSource.validateIdentifier(url, true)).toBe(false);
      });

      it('should validate a valid ASIN', () => {
        const asin = 'B01DFKC2SO';
        expect(AmazonSource.validateIdentifier(asin, false)).toBe(true);
      });

      it('should invalidate an invalid ASIN', () => {
        const asin = 'invalid';
        expect(AmazonSource.validateIdentifier(asin, false)).toBe(false);
      });
    });
  });

  describe('Source Registry', () => {
    it('should have Amazon source registered', () => {
      expect(sourceRegistry.getSource('amazon')).toBe(AmazonSource);
    });

    it('should return undefined for unknown source', () => {
      expect(sourceRegistry.getSource('unknown')).toBeUndefined();
    });
  });

  // Keep legacy function tests for backward compatibility
  describe('Legacy Functions', () => {
    describe('extractAsinFromUrl', () => {
      it('should extract ASIN from standard Amazon product URL', () => {
        const url = 'https://www.amazon.com/dp/B01DFKC2SO';
        expect(extractAsinFromUrl(url)).toBe('B01DFKC2SO');
      });
    });

    describe('createProductLocator', () => {
      it('should create product locator for URL', () => {
        const url = 'https://www.amazon.com/dp/B01DFKC2SO';
        expect(createProductLocator(url, true)).toBe('amazon:https://www.amazon.com/dp/B01DFKC2SO');
      });
    });
  });
});
