import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  Keypair,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { fs } from "mz";
import { METADATA_PROGRAM_ID } from "./constants";
import {
  establishConnection,
  establishPayer,
  checkAccounts,
  connection,
  programId,
} from "./init";
import { ConfigClass, ConfigSchema } from "./schema";
import {
  getTokenWallet,
  getMetadataPDA,
  getMasterEdition,
  accountInfo,
  executeTx,
  ComputeUnitPriceIX,
  ComputeUnitLimitIX,
} from "./utils";
import * as borsh from "borsh";
export * from "./borsh";
require("process");

async function main() {
  await establishConnection();
  const payer = await establishPayer();
  await checkAccounts();

  let file = `./src/client/collections/${process.argv[2]}.json`;
  const config = JSON.parse(fs.readFileSync(file, { encoding: "utf-8" }));

  const [config_key] = PublicKey.findProgramAddressSync(
    [Buffer.from(config.name), programId.toBuffer()],
    programId
  );
  const col_auth_key = PublicKey.findProgramAddressSync(
    [Buffer.from(config.name), Buffer.from("auth"), programId.toBuffer()],
    programId
  )[0];

  const collection_mint_kp = Keypair.generate();
  const col_mint = collection_mint_kp.publicKey;

  const col_ata = getTokenWallet(col_auth_key, col_mint);
  const col_meta = getMetadataPDA(col_mint);
  const col_masteredition = getMasterEdition(col_mint);
  config.collection_key = col_mint.toString();
  config.auth_pda = col_auth_key.toString();
  config.config_key = config_key.toString();

  await fs.writeFile(file, JSON.stringify(config, null, 4));

  console.log("config", config);

  const create_input = Array.from(
    new Uint8Array(
      Buffer.from(borsh.serialize(ConfigSchema, new ConfigClass(config)))
    )
  );

  const createIx = new TransactionInstruction({
    keys: [
      accountInfo(payer.publicKey, true, true),
      accountInfo(config_key, false, true),
      accountInfo(col_auth_key, false, true),
      accountInfo(col_mint, true, true),
      accountInfo(col_ata, false, true),
      accountInfo(col_meta, false, true),
      accountInfo(col_masteredition, false, true),
      accountInfo(TOKEN_PROGRAM_ID, false, false),
      accountInfo(ASSOCIATED_TOKEN_PROGRAM_ID, false, false),
      accountInfo(SystemProgram.programId, false, false),
      accountInfo(SYSVAR_RENT_PUBKEY, false, false),
      accountInfo(METADATA_PROGRAM_ID, false, false),
      accountInfo(SYSVAR_INSTRUCTIONS_PUBKEY, false, false),
    ],
    programId: programId,
    data: Buffer.from(new Uint8Array([1].concat(create_input))),
  });

  await executeTx(
    connection,
    payer,
    [ComputeUnitPriceIX(120000), ComputeUnitLimitIX(700000), createIx],
    false,
    false,
    "creating config account and minting collection nft...",
    [collection_mint_kp]
  );

  console.log("Success");
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
);
