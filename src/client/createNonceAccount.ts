import {
  Keypair,
  LAMPORTS_PER_SOL,
  NONCE_ACCOUNT_LENGTH,
  SystemProgram,
} from "@solana/web3.js";
import {
  establishConnection,
  establishPayer,
  checkAccounts,
  connection,
} from "./init";
import { executeTx, ComputeUnitPriceIX, ComputeUnitLimitIX } from "./utils";

export * from "./borsh";
require("process");

async function main() {
  await establishConnection();
  const payer = await establishPayer();
  await checkAccounts();

  const nonce_key = Keypair.generate();

  const createIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: nonce_key.publicKey,
    lamports: 0.0015 * LAMPORTS_PER_SOL,
    space: NONCE_ACCOUNT_LENGTH,
    programId: SystemProgram.programId,
  });
  const initNonceIx = SystemProgram.nonceInitialize({
    noncePubkey: nonce_key.publicKey,
    authorizedPubkey: payer.publicKey,
  });

  console.log("nonce", nonce_key.publicKey);

  await executeTx(
    connection,
    payer,
    [
      ComputeUnitPriceIX(120000),
      ComputeUnitLimitIX(30000),
      createIx,
      initNonceIx,
    ],
    true,
    false,
    "Creating nonce account",
    [nonce_key]
  );
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
);
