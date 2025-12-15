require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/database");
const seedAdmin = require("./config/seedAdmin");

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedAdmin();   

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
