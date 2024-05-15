use {
    crate::error::CustomError,
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
        pubkey::Pubkey,
    },
};

#[derive(BorshSerialize, BorshDeserialize, Debug, Default)]
pub struct CollectionConfig {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub auth_pda: Pubkey,
    pub sfbp: u16,
    pub collection_key: Pubkey,
    pub creator_1: Pubkey,
    pub creator_1_cut: u8,
    pub update_auth: Pubkey,
    pub merkle_tree: Pubkey,
}

impl CollectionConfig {
    pub fn create(args: CollectionConfig) -> Result<CollectionConfig, CustomError> {
        let new_account = CollectionConfig {
            merkle_tree: args.merkle_tree,
            name: args.name,
            symbol: args.symbol,
            sfbp: args.sfbp,
            uri: args.uri,
            auth_pda: args.auth_pda,
            collection_key: args.collection_key,
            creator_1: args.creator_1,
            creator_1_cut: args.creator_1_cut,
            update_auth: args.update_auth,
        };

        // fixed string lengths & validation
        if args.sfbp >= 10000 {
            return Err(CustomError::InvalidSfbp.into());
        }

        // shares validation
        let mut creator_pubkeys = Vec::<Pubkey>::with_capacity(4);

        creator_pubkeys.push(args.creator_1);

        Ok(new_account)
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        borsh::to_writer(&mut account.data.borrow_mut()[..], self).map_err(|error| {
            msg!("error saving compressed config: {}", error);
            ProgramError::InvalidAccountData
        })
    }
}
