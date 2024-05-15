import {
  Keypair,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import { Umi } from "@metaplex-foundation/umi";
import fs from "mz/fs";
import path from "path";

export * from "./borsh";

import { getPayer, getRpcUrl, createKeypairFromFile } from "./utils";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

export let connection: Connection;

let payer: Keypair;

export let programId: PublicKey;
const PROGRAM_PATH = path.resolve(__dirname, "../../src/rust/target/deploy/");
const PROGRAM_SO_PATH = path.join(PROGRAM_PATH, "test.so");
const PROGRAM_KEYPAIR_PATH = path.join(
  PROGRAM_PATH,
  "firstproject-keypair.json"
);

export let umi: Umi;

export async function establishConnection(): Promise<void> {
  const rpcUrl = await getRpcUrl();
  connection = new Connection(rpcUrl, "confirmed");
  const version = await connection.getVersion();
  umi = createUmi(rpcUrl);
  console.log("Connection to cluster established:", rpcUrl, version);
}

export async function establishPayer(): Promise<Keypair> {
  if (!payer) {
    payer = await getPayer();
  }

  return payer;
}

export async function checkAccounts(): Promise<void> {
  // Read program id from keypair file
  const programKeypair = await createKeypairFromFile(PROGRAM_KEYPAIR_PATH);
  programId = programKeypair.publicKey;
  console.log("program", programId.toString());

  // Check if the program has been deployed
  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo === null) {
    if (fs.existsSync(PROGRAM_SO_PATH)) {
      throw new Error("Program needs to be deployed");
    } else {
      throw new Error("Program needs to be built and deployed");
    }
  } else if (!programInfo.executable) {
    throw new Error(`Program is not executable`);
  }
  console.log(`Using program ${programId.toBase58()}`);
}
