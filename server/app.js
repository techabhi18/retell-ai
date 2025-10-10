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

app.post("/upload-csv", async (req, res) => {
  try {
    const { csvContent, batchName, fromNumber } = req.body;

    if (!csvContent || !batchName || !fromNumber) {
      return res.status(400).send("Missing required fields");
    }

    const results = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    const rows = results.data;

    if (!rows.length) return res.status(400).send("CSV is empty");

    const MAX_ROWS_PER_BATCH = 15;
    const chunks = [];

    for (let i = 0; i < rows.length; i += MAX_ROWS_PER_BATCH) {
      chunks.push(rows.slice(i, i + MAX_ROWS_PER_BATCH));
    }

    const batchDocs = [];
    const allTasks = [];

    chunks.forEach((chunk, i) => {
      const batch = {
        batchIndex: i,
        batchName,
        fromNumber,
        totalTasks: chunk.length,
      };
      batchDocs.push(batch);

      chunk.forEach((row) => {
        const toNumberRaw = row["phone number"];
        const toNumber = toNumberRaw.startsWith("+")
          ? toNumberRaw
          : `+${toNumberRaw}`;
        allTasks.push({
          batchIndex: i,
          rowData: row,
          toNumber,
        });
      });
    });

    const insertedBatches = await Batch.insertMany(batchDocs);

    await Task.insertMany(allTasks);

    triggerBatchCalls().catch(console.error);

    res.status(200).send({
      message: "CSV uploaded and tasks saved",
      jobId: insertedBatches[0]._id,
      totalBatches: insertedBatches.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing CSV");
  }
});

const BATCH_LIMIT = 40;

const triggerBatchCalls = async () => {
  try {
    const pendingBatches = await Batch.find({ status: "pending" }).limit(
      BATCH_LIMIT
    );
    console.log("Pending batches", pendingBatches.length);

    const isValidNumber = (num) => {
      if (!num) return false;

      const cleaned = num.trim();
      if (!/^\+?\d+$/.test(cleaned)) return false;

      const digitsOnly = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
      return digitsOnly.length >= 10;
    };

    await Promise.allSettled(
      pendingBatches.map(async (batch) => {
        batch.status = "in-progress";
        await batch.save();

        const tasks = await Task.find({
          batchIndex: batch.batchIndex,
          status: "pending",
        });

        const validTasks = [];

        for (const t of tasks) {
          if (isValidNumber(t.toNumber)) {
            validTasks.push({
              to_number: t.toNumber,
              retell_llm_dynamic_variables: t.rowData,
            });
          } else {
            await Task.deleteOne({ _id: t._id });
            console.log(`Deleted invalid task with number: ${t.toNumber}`);
          }
        }

        if (!validTasks.length) {
          batch.status = "done";
          batch.completedTasks = 0;
          await batch.save();
          return;
        }

        try {
          const res = await axios.post(
            "https://api.retellai.com/create-batch-call",
            {
              name: `${batch.batchName}_part_${batch.batchIndex + 1}`,
              from_number: batch.fromNumber,
              tasks: validTasks,
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
          batch.status = "in-progress";
          await batch.save();

          await Task.updateMany(
            {
              _id: {
                $in: tasks
                  .filter((t) => t.status === "pending")
                  .map((t) => t._id),
              },
            },
            { $set: { batchCallId, status: "in-progress" } }
          );

          const validTasks = await Task.find({
            batchIndex: batch.batchIndex,
            batchCallId: batch.batchCallId,
          });

          monitorBatch(batch, validTasks);
        } catch (err) {
          console.error(
            `Error creating batch call for batch ${batch._id}:`,
            err.response?.data || err.message
          );
          batch.status = "error";
          batch.errorMessage = err.response?.data?.message || err.message;
          await batch.save();
        }
      })
    );
  } catch (err) {
    console.error("Error in triggerBatchCalls:", err.message);
  }
};

const monitorBatch = async (batch, tasks) => {
  const interval = setInterval(async () => {
    try {
      const res = await axios.post(
        "https://api.retellai.com/v2/list-calls",
        {
          filter_criteria: {
            batch_call_id: [batch.batchCallId],
            call_status: ["ended", "registered", "not_connected", "error"],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${RETELL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      const callStatuses = res.data || [];
      const endedCallsSet = new Set(callStatuses.map((c) => c.to_number));

      let doneCount = 0;

      for (const t of tasks) {
        if (endedCallsSet.has(t.toNumber)) {
          t.status = "done";
          await t.save();
          doneCount++;
        }
      }

      batch.completedTasks = doneCount;
      batch.totalTasks = tasks.length;
      if (doneCount === tasks.length) {
        batch.status = "done";
        clearInterval(interval);
        triggerBatchCalls();
      } else {
        batch.status = "in-progress";
      }

      await batch.save();
    } catch (err) {
      console.error(
        "Error monitoring batch",
        err.response?.data || err.message
      );
    }
  }, 5000);
};

app.get("/job-progress/:batchId", async (req, res) => {
  const { batchId } = req.params;

  try {
    const batches = await Batch.find({ _id: batchId });
    if (!batches.length)
      return res.status(404).send({ message: "Job not found" });

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

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    triggerBatchCalls().catch((err) =>
      console.error("Initial triggerBatchCalls error:", err)
    );
    setInterval(triggerBatchCalls, 60000);

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error", err));

app.post("/list/calls", async (req, res) => {
  try {
    const { batch_call_ids, limit = 50, pagination_key } = req.body;

    if (batch_call_ids && !Array.isArray(batch_call_ids)) {
      return res.status(400).json({
        error: "Invalid input: 'batch_call_ids' must be an array.",
      });
    }

    if (typeof limit !== "number" || limit <= 0 || limit > 1000) {
      return res.status(400).json({
        error: "Invalid 'limit': must be an integer between 1 and 1000.",
      });
    }

    const requestBody = {
      sort_order: "descending",
      limit,
    };

    if (pagination_key) {
      requestBody.pagination_key = pagination_key;
    }

    if (Array.isArray(batch_call_ids) && batch_call_ids.length > 0) {
      requestBody.filter_criteria = {
        batch_call_id: batch_call_ids,
      };
    }

    const response = await axios.post(
      "https://api.retellai.com/v2/list-calls",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${RETELL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching batch calls:", error.message);
    res.status(500).json({
      error: "Error fetching batch calls",
      details: error.message,
    });
  }
});
