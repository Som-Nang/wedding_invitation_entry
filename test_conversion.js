const Database = require("./src/database.js");

async function testCurrencyConversion() {
  console.log("Testing Currency Conversion...\n");

  const db = new Database();
  await db.init();

  // Test data
  const testGuests = [
    {
      name: "Test Guest 1",
      amount: 100,
      currency: "USD",
      payment_type: "CASH",
    },
    {
      name: "Test Guest 2",
      amount: 400000,
      currency: "KHR",
      payment_type: "CASH",
    },
    { name: "Test Guest 3", amount: 50, currency: "USD", payment_type: "ABA" },
    {
      name: "Test Guest 4",
      amount: 200000,
      currency: "KHR",
      payment_type: "AC",
    },
  ];

  console.log("Adding test guests with automatic conversion...\n");

  for (const guest of testGuests) {
    try {
      const id = await db.addGuest(guest);
      console.log(`✓ Added: ${guest.name} - ${guest.amount} ${guest.currency}`);
    } catch (error) {
      console.error(`✗ Error adding ${guest.name}:`, error.message);
    }
  }

  console.log("\nRetrieving guests with converted amounts...\n");

  const guests = await db.getGuests();

  guests.slice(-4).forEach((guest) => {
    console.log(`Guest: ${guest.name}`);
    console.log(`  Original: ${guest.amount} ${guest.currency}`);
    console.log(`  KHR: ${guest.amount_khr.toLocaleString("km-KH")} ៛`);
    console.log(`  USD: $${guest.amount_usd.toFixed(2)}`);
    console.log("  ---");
  });

  console.log("\nTotals:");
  const totals = await db.getTotals();
  console.log(`  Total Guests: ${totals.total_guests}`);
  console.log(`  Total KHR: ${totals.total_khr.toLocaleString("km-KH")} ៛`);
  console.log(`  Total USD: $${totals.total_usd.toFixed(2)}`);

  // Clean up test data
  console.log("\nCleaning up test data...");
  for (const guest of guests.slice(-4)) {
    await db.deleteGuest(guest.id);
    console.log(`✓ Removed: ${guest.name}`);
  }

  db.close();
  console.log("\n✅ Currency conversion test completed successfully!");
}

testCurrencyConversion().catch(console.error);
