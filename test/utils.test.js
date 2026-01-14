// Test cases for utility and UI functions
const assert = require("assert");
const format = require("../src/utils/format");
const ui = require("../src/utils/ui");

describe("Utility Function Tests", () => {
  it("convertToKHR should convert USD to KHR", () => {
    assert.strictEqual(format.convertToKHR(2, "USD"), 8000);
    assert.strictEqual(format.convertToKHR(4000, "KHR"), 4000);
  });

  it("convertToUSD should convert KHR to USD", () => {
    assert.strictEqual(format.convertToUSD(8000, "KHR"), 2);
    assert.strictEqual(format.convertToUSD(2, "USD"), 2);
  });

  it("getConvertedAmounts returns correct structure", () => {
    const result = format.getConvertedAmounts(4000, "KHR");
    assert.deepStrictEqual(result, {
      khr: 4000,
      usd: 1,
      original: 4000,
      originalCurrency: "KHR",
    });
  });

  it("formatCurrency formats KHR and USD correctly", () => {
    assert.strictEqual(format.formatCurrency(4000, "KHR").includes("៛"), true);
    assert.strictEqual(format.formatCurrency(2, "USD").startsWith("$"), true);
  });

  it("formatKhmerNumber returns Khmer formatted number", () => {
    assert.strictEqual(typeof format.formatKhmerNumber(1234), "string");
  });

  it("escapeHtml escapes HTML", () => {
    assert.strictEqual(
      format.escapeHtml("<div>Test</div>"),
      "&lt;div&gt;Test&lt;/div&gt;"
    );
  });
});

// UI tests are limited in Node.js, but we can check function existence

describe("UI Utility Function Existence", () => {
  it("showNotification exists", () => {
    assert.strictEqual(typeof ui.showNotification, "function");
  });
  it("showLoading exists", () => {
    assert.strictEqual(typeof ui.showLoading, "function");
  });
  it("setButtonLoading exists", () => {
    assert.strictEqual(typeof ui.setButtonLoading, "function");
  });
});
