import os from "os";
import fs from "mz/fs";
import path from "path";
import yaml from "yaml";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  sendAndConfirmTransaction,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  METADATA_PROGRAM_ID,
  MPL_BUBBLEGUM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "./constants";

/**
 * @private
 */
async function getConfig(): Promise<any> {
  // Path to Solana CLI config file
  const CONFIG_FILE_PATH = path.resolve(
    os.homedir(),
    ".config",
    "solana",
    "cli",
    "config.yml"
  );
  const configYml = await fs.readFile(CONFIG_FILE_PATH, { encoding: "utf8" });
  return yaml.parse(configYml);
}

/**
 * Load and parse the Solana CLI config file to determine which RPC url to use
 */
export async function getRpcUrl(): Promise<string> {
  try {
    const config = await getConfig();
    return config.json_rpc_url;
  } catch (err) {
    throw err;
  }
}

/**
 * Load and parse the Solana CLI config file to determine which payer to use
 */
export async function getPayer(): Promise<Keypair> {
  try {
    const config = await getConfig();
    if (!config.keypair_path) throw new Error("Missing keypair path");
    return await createKeypairFromFile(config.keypair_path);
  } catch (err) {
    throw err;
  }
}

/**
 * Create a Keypair from a secret key stored in file as bytes' array
 */
export async function createKeypairFromFile(
  filePath: string
): Promise<Keypair> {
  const secretKeyString = await fs.readFile(filePath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
}

export function accountInfo(
  pubkey: PublicKey,
  isSigner: boolean,
  isWritable: boolean
) {
  return {
    pubkey,
    isSigner,
    isWritable,
  };
}

export function getBubblegumSigner() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("collection_cpi", "utf8")],
    new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID)
  )[0];
}

export function getAuthPDA(pda_buf: number, program: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      new Uint8Array([pda_buf & 0xff, (pda_buf & 0xff00) >> 8]),
      new Uint8Array([97, 117, 116, 104]),
      program.toBuffer(),
    ],
    program
  )[0];
}

export function getUniqTimePDA(wallet: PublicKey, program: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      new Uint8Array([108, 116, 105, 109, 101]),
      wallet.toBuffer(),
      program.toBuffer(),
    ],
    program
  )[0];
}

export function getPointsPDA(wallet: PublicKey, program: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("userPoints"), wallet.toBuffer(), program.toBuffer()],
    program
  )[0];
}

export async function getPointsAccount(wallet: PublicKey, program: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("userPoints"), wallet.toBuffer(), program.toBuffer()],
    program
  )[0];
}

export function getUniqStagePDA(
  pda_buf: number,
  stage_name: string,
  wallet: PublicKey,
  program: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [
      new Uint8Array([pda_buf & 0xff, (pda_buf & 0xff00) >> 8]),
      Buffer.from(stage_name),
      wallet.toBuffer(),
      program.toBuffer(),
    ],
    program
  )[0];
}

export function getTokenRecord(
  mint: PublicKey,
  associate_token_address: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("token_record"),
      associate_token_address.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  )[0];
}

export function getTokenWallet(wallet: PublicKey, mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export function getEditionPDA(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    METADATA_PROGRAM_ID
  )[0];
}

export function getMetadataPDA(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID
  )[0];
}

export function getMasterEdition(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    METADATA_PROGRAM_ID
  )[0];
}

export function ComputeUnitLimitIX(amount: number) {
  return ComputeBudgetProgram.setComputeUnitLimit({
    units: amount,
  });
}

export function ComputeUnitPriceIX(amount: number) {
  return ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: amount,
  });
}

export const executeTx = async (
  connection: Connection,
  keypair: Keypair,
  ixs: TransactionInstruction[],
  finalized: boolean,
  skipPreflight: boolean,
  txn_description: string,
  extraSigner?: Keypair[]
) => {
  console.log(`--${txn_description}--`);
  const tx = new Transaction();
  ixs.forEach((ix) => tx.add(ix));
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = keypair.publicKey;
  const signers = [keypair];
  if (extraSigner) {
    for (let i = 0; i < extraSigner.length; i++) {
      signers.push(extraSigner[i]);
    }
  }
  const sig = await sendAndConfirmTransaction(connection, tx, signers, {
    commitment: finalized ? "finalized" : "confirmed",
    skipPreflight,
    maxRetries: 5,
  });
  console.log({ sig });
  return sig;
};
