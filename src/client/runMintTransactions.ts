import {
  Transaction,
  sendAndConfirmRawTransaction,
} from "@solana/web3.js";
import { fs } from "mz";
import {
  establishConnection,
  establishPayer,
  checkAccounts,
  connection,
} from "./init";
require("process");

import * as bs58 from "bs58";
export * from "./borsh";
require("process");

async function main() {
  // Establish connection to the cluster
  await establishConnection();
  await establishPayer();
  await checkAccounts();

  let file = `./src/client/simulatedDB.json`;
  const txPool = JSON.parse(fs.readFileSync(file, { encoding: "utf-8" }));
  const notSent = [];

  let cnt = 0;
  for (const poolTx of txPool) {
    try {
      const tx = Transaction.from(bs58.decode(poolTx.buffer));
      const sig = await sendAndConfirmRawTransaction(
        connection,
        tx.serialize()
      );
      console.log("sent", sig);
      cnt++;
    } catch (error) {
      console.log("error sending tx", error);
      notSent.push(poolTx);
    }
  }

  await fs.writeFile(
    "./src/client/simulateddb.json",
    JSON.stringify(notSent, null, 4)
  );

  console.log("Sent ", cnt, "transactions", txPool.length - cnt, "failed");
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
);
