import { Keypair } from "@solana/web3.js";
import {
  establishConnection,
  establishPayer,
  checkAccounts,
  connection,
  umi,
} from "./init";
import { executeTx, ComputeUnitPriceIX, ComputeUnitLimitIX } from "./utils";
import {
  createTreeConfig,
  findTreeConfigPda,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  createAllocTreeIx,
} from "@solana/spl-account-compression";
import {
  createSignerFromKeypair,
  publicKey,
  PublicKey as UmiPK,
  signerIdentity,
} from "@metaplex-foundation/umi";

export * from "./borsh";
require("process");

async function main() {
  await establishConnection();
  const payer = await establishPayer();
  await checkAccounts();

  const merkle_tree_key = Keypair.generate();

  const merkle_tree_config = findTreeConfigPda(umi, {
    merkleTree: merkle_tree_key.publicKey.toBase58() as UmiPK,
  })[0];

  const merkle_tree_data = await connection.getAccountInfo(
    merkle_tree_key.publicKey
  );

  const allocTreeIx = await createAllocTreeIx(
    connection,
    merkle_tree_key.publicKey,
    payer.publicKey,
    { maxDepth: 14, maxBufferSize: 64 },
    0
  );

  umi.use(
    signerIdentity(
      createSignerFromKeypair(umi, {
        publicKey: publicKey(payer.publicKey),
        secretKey: payer.secretKey,
      })
    )
  );

  console.log("tree", merkle_tree_key.publicKey);

  await executeTx(
    connection,
    payer,
    [
      ComputeUnitPriceIX(120000),
      ComputeUnitLimitIX(1000000),
      allocTreeIx,
    ],
    true,
    false,
    "Creating merkle tree and its config",
    [merkle_tree_key]
  );

  await createTreeConfig(umi, {
    merkleTree: publicKey(merkle_tree_key.publicKey.toString()),
    maxDepth: 14,
    maxBufferSize: 64,
  }).sendAndConfirm(umi, { send: { skipPreflight: false } });
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
);
