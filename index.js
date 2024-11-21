const express = require("express");
const userRoutes = require("./routes/userRoutes");
const app = express();

const port = 2001;

app.use(express.json());

app.use("/auth", userRoutes);

app.listen(port, () => {
   console.log(`listening on port ${port}...`);
});
