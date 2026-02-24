const bcrypt = require("bcrypt");
const User = require("../modules/users/User");

module.exports = async function seedAdmin() {
  const adminEmail = "admin@rms.com";

  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    console.log("[seedAdmin] Admin already exists");
    return;
  }

  const hash = await bcrypt.hash("Admin@123", 10);

  await User.create({
    name: "Super Admin",
    email: adminEmail,
    passwordHash: hash,
    role: "admin",
    isSuperAdmin: true,
    status: "active",
    mustChangePassword: false,
  });

  console.log("[seedAdmin] Admin created successfully!");
};
