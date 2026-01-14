// Utility functions for formatting and currency conversion

const EXCHANGE_RATE = 4000; // 1 USD = 4000 KHR

function convertToKHR(amount, fromCurrency) {
  if (fromCurrency === "USD") {
    return amount * EXCHANGE_RATE;
  }
  return amount; // Already in KHR
}

function convertToUSD(amount, fromCurrency) {
  if (fromCurrency === "KHR") {
    return amount / EXCHANGE_RATE;
  }
  return amount; // Already in USD
}

function getConvertedAmounts(amount, currency) {
  const numAmount = parseFloat(amount) || 0;
  return {
    khr: convertToKHR(numAmount, currency),
    usd: convertToUSD(numAmount, currency),
    original: numAmount,
    originalCurrency: currency,
  };
}

function formatCurrency(amount, currency) {
  const num = parseFloat(amount) || 0;
  if (currency === "KHR") {
    return num.toLocaleString("km-KH") + " ៛";
  } else {
    return (
      "$" +
      num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
}

function formatKhmerNumber(num) {
  return num.toLocaleString("km-KH");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

module.exports = {
  EXCHANGE_RATE,
  convertToKHR,
  convertToUSD,
  getConvertedAmounts,
  formatCurrency,
  formatKhmerNumber,
  escapeHtml,
};
