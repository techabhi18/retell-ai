import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import Retell from 'retell-sdk';

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const client = new Retell({
    apiKey: process.env.RETELL_API_TOKEN,
});

app.post("/trigger-call", (req, res) => {
    const callData = req.body.call;

    let shouldRecal = callData.disconnection_reason === "dial_busy" ||
        callData.disconnection_reason === "dial_no_answer";

    if (callData.call_analysis && callData.call_analysis.user_sentiment === "positive" &&
        callData.call_analysis.call_successful === false) {
        shouldRecal = true;
    }

    if (shouldRecal) {
        const fromNumber = callData.to_number;
        const toNumber = callData.from_number;
        const agentId = callData.agent_id;
        const dynamicVariables = callData.retell_llm_dynamic_variables;

        setTimeout(async () => {
            try {
                const phoneCallResponse = await client.call.createPhoneCall({
                    from_number: fromNumber,
                    to_number: toNumber,
                    agent_id: agentId,
                    retell_llm_dynamic_variables: dynamicVariables,
                });
                console.log("Successfully placed new outbound call:", phoneCallResponse);
            } catch (error) {
                console.error("Error creating phone call:", error);
            }
        }, 30000);
    }

    res.status(200).send("Event received and processed.");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
