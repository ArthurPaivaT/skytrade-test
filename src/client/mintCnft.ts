import {
  findTreeConfigPda,
  TreeAuthorityIncorrectError,
} from "@metaplex-foundation/mpl-bubblegum";
import { publicKey } from "@metaplex-foundation/umi";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  NonceAccount,
} from "@solana/web3.js";
import { fs } from "mz";
import { METADATA_PROGRAM_ID, MPL_BUBBLEGUM_PROGRAM_ID } from "./constants";
import {
  establishConnection,
  establishPayer,
  checkAccounts,
  connection,
  programId,
  umi,
} from "./init";
import {
  getTokenWallet,
  getMetadataPDA,
  getMasterEdition,
  accountInfo,
  getBubblegumSigner,
  ComputeUnitPriceIX,
  ComputeUnitLimitIX,
} from "./utils";
require("process");

import * as borsh from "borsh";
import { ConfigClass, ConfigSchema, MintClass, MintSchema } from "./schema";
import bs58 from "bs58";
export * from "./borsh";
require("process");

async function main() {
  // Establish connection to the cluster
  await establishConnection();

  const payer = await establishPayer();

  await checkAccounts();

  let file = `./src/client/collections/${process.argv[2]}.json`;

  const nonceKey = process.argv[3];

  const config = JSON.parse(fs.readFileSync(file, { encoding: "utf-8" }));

  const [config_key, config_bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(config.name), programId.toBuffer()],
    programId
  );
  const col_auth_key = PublicKey.findProgramAddressSync(
    [Buffer.from(config.name), Buffer.from("auth"), programId.toBuffer()],
    programId
  )[0];

  config.auth_pda = col_auth_key.toBase58();
  config.config_key = config_key.toBase58();

  console.log(`Config Key ${config_key.toBase58()}`);

  await fs.writeFile(file, JSON.stringify(config, null, 4));

  const col_mint = new PublicKey(config.collection_key);
  const col_meta = getMetadataPDA(col_mint);
  const col_masteredition = getMasterEdition(col_mint);

  const config_account = await connection.getAccountInfo(config_key);
  if (!config_account) {
    console.log("no config, run createCollection");
    return;
  }
  const merkle_tree_key = new PublicKey(config.merkle_tree);

  const [treeConfigPub] = findTreeConfigPda(umi, {
    merkleTree: publicKey(merkle_tree_key.toString()),
  });
  const treeConfig = new PublicKey(treeConfigPub.toString());

  const input = Array.from(
    new Uint8Array(
      Buffer.from(
        borsh.serialize(
          MintSchema,
          new MintClass({
            name: "Test nft" + new Date().toISOString(),
            symbol: "TSTSMBL",
            uri: "anyuri.com",
          })
        )
      )
    )
  );

  const mint = new TransactionInstruction({
    keys: [
      accountInfo(payer.publicKey, true, true),
      accountInfo(config_key, false, true),
      accountInfo(col_auth_key, false, true),
      accountInfo(treeConfig, false, true),
      accountInfo(payer.publicKey, true, true),
      accountInfo(merkle_tree_key, false, true),
      accountInfo(col_mint, false, true),
      accountInfo(col_meta, false, true),
      accountInfo(col_masteredition, false, true),
      accountInfo(getBubblegumSigner(), false, true),
      accountInfo(
        new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV"),
        false,
        false
      ),
      accountInfo(
        new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK"),
        false,
        false
      ),
      accountInfo(METADATA_PROGRAM_ID, false, false),
      accountInfo(
        new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID.toString()),
        false,
        false
      ),
      accountInfo(SystemProgram.programId, false, false),
      accountInfo(SYSVAR_INSTRUCTIONS_PUBKEY, false, false),
    ],
    programId: programId,
    data: Buffer.from(new Uint8Array([2].concat(input))),
  });

  const nonce = new PublicKey(nonceKey);

  const advanceIX = SystemProgram.nonceAdvance({
    authorizedPubkey: payer.publicKey,
    noncePubkey: nonce,
  });

  const tx = new Transaction();
  tx.add(advanceIX);
  tx.add(ComputeUnitPriceIX(240000));
  tx.add(ComputeUnitLimitIX(200000));
  tx.add(mint);

  console.log("using nonce", nonce.toString());
  tx.feePayer = payer.publicKey;

  const nonceAccount = await fetchNonceInfo(nonce);
  tx.recentBlockhash = nonceAccount.nonce;

  tx.sign(payer);
  const ser = bs58.encode(tx.serialize({ requireAllSignatures: false }));

  const txPool = JSON.parse(
    fs.readFileSync("./src/client/simulateddb.json", { encoding: "utf-8" })
  );

  for (const tx of txPool) {
    if (tx.nonce == nonceKey) {
      console.log("nonce already has a reserved tx waiting to be sent");
      return;
    }
  }

  txPool.push({ nonce: nonceKey, buffer: ser });

  await fs.writeFile(
    "./src/client/simulateddb.json",
    JSON.stringify(txPool, null, 4)
  );

  console.log("Added tx to simulated db");
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
);

async function fetchNonceInfo(nonce: PublicKey) {
  const accountInfo = await connection.getAccountInfo(nonce);
  if (!accountInfo) throw new Error("No account info found");
  const nonceAccount = NonceAccount.fromAccountData(accountInfo.data);
  console.log("Nonce:", nonceAccount.nonce);
  return nonceAccount;
}
