import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import Retell from "retell-sdk";

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const client = new Retell({
  apiKey: process.env.RETELL_API_TOKEN,
});

app.get("/", (req, res) => {
  res.send("Server Working");
});

app.post("/trigger-call", async (req, res) => {
  const { toNumber } = req.body;

  if (!toNumber) {
    return res.status(400).send("To Number is required");
  }

  const payload = {
    from_number: '+447723577328',
    to_number: toNumber,
    agent_id: 'agent_a007f15c3f376daa894b1d3c6c',
  };

  try {
    const phoneCallResponse = await client.call.createPhoneCall(
      payload
    );
    return res.status(200).send(phoneCallResponse);
  } catch (e) {
    return res.status(500).send("Error Triggering Phone Call", e);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
