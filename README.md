## BE CAREFUL, THE SCRIPTS USER YOUR CLI CONFIG WALLET AND NETWORK

## MAKE SURE YOUR CONFIG IS SET TO DEVNET

### Available addresses

    Deployed Contract: V1N6BFK52NFyyvXMWdvPqmQVxFs8E6RPetwrBhFBKpL

    Wallet for testing: `src/skytrade-test.json` 97s91qvMSUY5SbbxFsMpW2eeCg7Y7zGyFeEkfyLHujnK

    Nonce account: B7B9sL5nTVcKVf2ebVHK4z2P7mwZb23TJTUzT2RjeZjS

    Collection config: AyT6jRrZNw9XsL7PeVHdVtAVxwG9KnkQL5zTTgTiJTRR

    Collection name: testcol

### Deploying contract

    cd src/rust

    cargo-build-sbf

    cd target/deploy

    solana program deploy firstproject.so

### Running transactions

To create a tree run

    npm run createTree

To create a nonce account run

    npm run createNonceAccount

To create a collection, copy the src/client/collections/testcol.json file and run

    npm run createCollection <yourcollectionname>

To generate transactions and add them to the simulated db file run

    npm run mintCnft <yourcollectionname> <nonceAccount>

To run the transactions awaiting to be sent run

    npm run runMintTransactions
