/**
 * Usage: node scripts/make-admin.js user@example.com
 *
 * Promotes an already-registered user to admin so they can access /admin.
 * Run from the project root after setting MONGODB_URI in .env.local.
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/make-admin.js <email>");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const User = mongoose.connection.collection("users");
  const result = await User.updateOne(
    { email: email.toLowerCase() },
    { $set: { isAdmin: true } }
  );

  if (result.matchedCount === 0) {
    console.error(`No user found with email: ${email}`);
  } else {
    console.log(`✓ ${email} is now an admin.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
