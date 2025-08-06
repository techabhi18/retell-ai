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

const retryTracker = new Map();
const pendingCallEvents = new Map();
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 30000;

app.post("/trigger-call", (req, res) => {
  console.log("Received trigger call request:", req.body);

  const events = Array.isArray(req.body) ? req.body : [req.body];

  for (const eventObj of events) {
    const eventType = eventObj.event;
    const callData = eventObj.call;
    const callId = callData.call_id;

    if (!pendingCallEvents.has(callId)) {
      pendingCallEvents.set(callId, {});
    }

    const storedData = pendingCallEvents.get(callId);

    if (eventType === "call_ended") {
      storedData.callEndedData = callData;
    }
    if (eventType === "call_analyzed") {
      storedData.callAnalyzedData = callData;
    }

    if (storedData.callEndedData && storedData.callAnalyzedData) {
      const { callEndedData, callAnalyzedData } = storedData;

      let shouldRecal =
        callEndedData.disconnection_reason === "dial_busy" ||
        callEndedData.disconnection_reason === "dial_no_answer";

      if (
        callAnalyzedData.call_analysis &&
        callAnalyzedData.call_analysis.user_sentiment === "positive" &&
        callAnalyzedData.call_analysis.call_successful === false
      ) {
        shouldRecal = true;
      }

      if (shouldRecal) {
        const retryCount = retryTracker.get(callId) || 0;

        if (retryCount >= MAX_RETRIES) {
          console.log(`Max retry limit reached for call ID: ${callId}`);
        } else {
          retryTracker.set(callId, retryCount + 1);

          const fromNumber = callEndedData.to_number;
          const toNumber = callEndedData.from_number;
          const agentId = callEndedData.agent_id;
          const dynamicVariables = callEndedData.retell_llm_dynamic_variables;

          setTimeout(async () => {
            try {
              const phoneCallResponse = await client.call.createPhoneCall({
                from_number: fromNumber,
                to_number: toNumber,
                agent_id: agentId,
                retell_llm_dynamic_variables: {
                  summary: callAnalyzedData.call_analysis.call_summary,
                  ...dynamicVariables,
                },
              });
              console.log(
                "Successfully placed new outbound call:",
                phoneCallResponse
              );
            } catch (error) {
              console.error("Error creating phone call:", error);
            }
          }, RETRY_DELAY_MS);
        }
      }

      pendingCallEvents.delete(callId);
    }
  }

  res.status(200).send("Event received and processed.");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
