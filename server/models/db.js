import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
    batchIndex: Number,
    rowData: Object,
    toNumber: String,
    status: { type: String, default: "pending" },
    batchCallId: String,
});

const BatchSchema = new mongoose.Schema({
    batchIndex: Number,
    batchName: String,
    fromNumber: String,
    totalTasks: Number,
    completedTasks: { type: Number, default: 0 },
    status: { type: String, default: "pending" },
    batchCallId: String,
});

export const Task = mongoose.model("Task", TaskSchema);
export const Batch = mongoose.model("Batch", BatchSchema);
