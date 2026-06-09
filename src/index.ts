import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";

await (async () => {

  if (process.env.NODE_ENV === 'production') {

    if (cluster.isPrimary) {
      const workers = os.availableParallelism();
      for (let i = 0; i < workers; i++) {
        cluster.fork();
      }

      cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} exited (code=${code}, signal=${signal})`);
        cluster.fork();
      });
    } else {
      await import("./main");
      console.log(`Worker ${process.pid} started`);
    }

  } else {
    await import("./main");
    console.log(`Worker ${process.pid} started`);
  }
})();
