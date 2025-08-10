import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import Retell from "retell-sdk";
import nodemailer from 'nodemailer';

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
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1800000;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

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

          console.log("retryTracker", retryTracker);

          const fromNumber = callEndedData.from_number;
          const toNumber = callEndedData.to_number;
          const agentId = callEndedData.agent_id;
          const dynamicVariables = callEndedData.retell_llm_dynamic_variables;

          setTimeout(async () => {
            const payload = {
              from_number: fromNumber,
              to_number: toNumber,
              agent_id: agentId,
              retell_llm_dynamic_variables: {
                summary: callAnalyzedData.call_analysis.call_summary,
                ...dynamicVariables,
              },
            };

            console.log("Payload for new call:", payload);

            try {
              const phoneCallResponse = await client.call.createPhoneCall(
                payload
              );
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

app.post("/send-email", async (req, res) => {
  console.log("Received outbound call request to send email:", req.body);

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

      const dynamicVariables = callEndedData.retell_llm_dynamic_variables;

      const summary = callAnalyzedData.call_analysis.call_summary;
      const transcript = callEndedData.transcript;

      const name = dynamicVariables?.name || "Unknown User";

      if (summary && transcript) {
        try {
          const mailOptions = {
            from: `StrategicERP <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_TO,
            subject: `StrategicERP Feedback from - ${name}`,
            text: `Summary: ${summary}\n\nTranscript: ${transcript}`,
          };

          await transporter.sendMail(mailOptions);
          console.log(`Email sent for call ID ${callId} to ${process.env.EMAIL_TO}`);
        } catch (err) {
          console.error("Error sending email:", err);
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
