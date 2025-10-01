import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";
import Papa from "papaparse";
import { Task, Batch } from "./models/db.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const RETELL_API_TOKEN = process.env.RETELL_API_TOKEN;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error", err));

app.post("/upload-csv", async (req, res) => {
  try {
    const { csvContent, batchName, fromNumber } = req.body;

    if (!csvContent || !batchName || !fromNumber) {
      return res.status(400).send("Missing required fields");
    }

    const results = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    const rows = results.data;

    if (!rows.length) return res.status(400).send("CSV is empty");

    const MAX_ROWS_PER_BATCH = 15;
    const chunks = [];

    for (let i = 0; i < rows.length; i += MAX_ROWS_PER_BATCH) {
      chunks.push(rows.slice(i, i + MAX_ROWS_PER_BATCH));
    }

    const batchDocs = [];

    for (let i = 0; i < chunks.length; i++) {
      const batch = new Batch({ batchIndex: i, batchName, fromNumber, totalTasks: chunks[i].length });
      await batch.save();
      batchDocs.push(batch);

      for (const row of chunks[i]) {
        const toNumberRaw = row["phone number"];
        const toNumber = toNumberRaw.startsWith("+") ? toNumberRaw : `+${toNumberRaw}`;

        const task = new Task({
          batchIndex: i,
          rowData: row,
          toNumber,
        });

        await task.save();
      }
    }

    res.status(200).send({ message: "CSV uploaded and tasks saved", jobId: batchDocs[0]._id, totalBatches: chunks.length });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing CSV");
  }
});

const BATCH_LIMIT = 49;

const triggerBatchCalls = async () => {
  const pendingBatches = await Batch.find({ status: "pending" }).limit(BATCH_LIMIT);
  console.log("Pending batches", pendingBatches);

  for (const batch of pendingBatches) {
    batch.status = "in-progress";
    await batch.save();

    const tasks = await Task.find({ batchIndex: batch.batchIndex, status: "pending" });

    const payloadTasks = tasks.map((t) => ({
      to_number: t.toNumber,
      retell_llm_dynamic_variables: t.rowData,
    }));

    try {
      const res = await axios.post(
        "https://api.retellai.com/create-batch-call",
        {
          name: `${batch.batchName}_part_${batch.batchIndex + 1}`,
          from_number: batch.fromNumber,
          tasks: payloadTasks,
        },
        {
          headers: {
            Authorization: `Bearer ${RETELL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      const batchCallId = res.data?.batch_call_id;
      if (!batchCallId) throw new Error("No batch_call_id returned");

      batch.batchCallId = batchCallId;
      await batch.save();

      for (const t of tasks) {
        t.batchCallId = batchCallId;
        t.status = "in-progress";
        await t.save();
      }

      monitorBatch(batch, tasks);

    } catch (err) {
      console.error("Error creating batch call", err.response?.data || err.message);
      batch.status = "pending";
      await batch.save();
    }
  }
};

const monitorBatch = async (batch, tasks) => {
  const interval = setInterval(async () => {
    try {
      const res = await axios.post(
        "https://api.retellai.com/v2/list-calls",
        {
          filter_criteria: { batch_call_id: [batch.batchCallId], call_status: ["ended", "registered", "not_connected", "error"] },
        },
        {
          headers: {
            Authorization: `Bearer ${RETELL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("List calls response", res.data?.length);
      console.log("Tasks calls response", tasks?.length);

      const endedCalls = res.data?.length || 0;

      if (endedCalls >= tasks.length) {
        for (const t of tasks) {
          t.status = "done";
          await t.save();
        }

        batch.status = "done";
        batch.completedTasks = tasks.length;
        await batch.save();

        clearInterval(interval);

        triggerBatchCalls();
      }
    } catch (err) {
      console.error("Error monitoring batch", err.response?.data || err.message);
    }
  }, 5000);
};

triggerBatchCalls().catch(err => console.error("Initial triggerBatchCalls error:", err));
setInterval(triggerBatchCalls, 60000);

app.get("/job-progress/:batchId", async (req, res) => {
  const { batchId } = req.params;

  try {
    const batches = await Batch.find({ _id: batchId });
    if (!batches.length) return res.status(404).send({ message: "Job not found" });

    let done = 0;
    let total = 0;
    let status = "pending";

    for (const b of batches) {
      const tasks = await Task.find({ batchIndex: b.batchIndex });
      done += tasks.filter((t) => t.status === "done").length;
      total += tasks.length;

      if (b.status === "in-progress") status = "in-progress";
      else if (b.status === "done") status = "completed";
    }

    res.status(200).send({ done, total, status });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching job progress");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
