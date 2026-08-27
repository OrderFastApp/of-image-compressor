import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";
import { logger } from "./shared/logger/logger";

await (async () => {
  if (process.env.NODE_ENV === "production") {
    if (cluster.isPrimary) {
      const configuredWorkers = Number.parseInt(process.env.WORKERS ?? "", 10);
      const workers =
        Number.isInteger(configuredWorkers) && configuredWorkers > 0
          ? configuredWorkers
          : os.availableParallelism();

      logger.info("Cluster primary started", { workers });

      for (let i = 0; i < workers; i++) {
        cluster.fork();
      }

      cluster.on("exit", (worker, code, signal) => {
        logger.warn("Worker exited", {
          pid: worker.process.pid,
          code,
          signal,
        });
        cluster.fork();
      });
    } else {
      await import("./main");
      logger.info("Worker started", { pid: process.pid });
    }
  } else {
    await import("./main");
    logger.info("Worker started", { pid: process.pid });
  }
})();
