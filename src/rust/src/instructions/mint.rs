use {
    crate::{error::CustomError, states::config::CollectionConfig},
    borsh::{BorshDeserialize, BorshSerialize},
    mpl_bubblegum::{
        instructions::MintToCollectionV1CpiBuilder,
        types::{
            Collection as mplCollection, Creator as mplCreator, MetadataArgs, TokenProgramVersion,
            TokenStandard as mplTokenStandard,
        },
    },
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        borsh0_10::try_from_slice_unchecked,
        msg,
        program_error::ProgramError,
        pubkey::Pubkey,
    },
};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct MintArgs {
    pub name: String,
    pub uri: String,
    pub symbol: String,
}

pub fn process<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    input: MintArgs,
) -> Result<(), ProgramError> {
    let accounts_iter: &mut std::slice::Iter<'_, AccountInfo<'_>> = &mut accounts.iter();

    let payer_acc = next_account_info(accounts_iter)?; // 0
    let config_acc = next_account_info(accounts_iter)?; // 1
    let col_auth_pda = next_account_info(accounts_iter)?; // 3
    let tree_config_acc = next_account_info(accounts_iter)?; // 8
    let _tree_auth_acc = next_account_info(accounts_iter)?; // 12
    let merkle_tree_acc = next_account_info(accounts_iter)?; // 13
    let col_mint = next_account_info(accounts_iter)?; // 14
    let col_meta = next_account_info(accounts_iter)?; // 15
    let col_masteredition = next_account_info(accounts_iter)?; // 16
    let bubblegum_signer_acc = next_account_info(accounts_iter)?; // 17
    let log_wrapper_acc = next_account_info(accounts_iter)?; // 18
    let compression_program = next_account_info(accounts_iter)?; // 19
    let metadata_program = next_account_info(accounts_iter)?; // 20
    let bubblegum_program = next_account_info(accounts_iter)?; // 21
    let system_program = next_account_info(accounts_iter)?; // 22
    let sys_instr_account = next_account_info(accounts_iter)?; // 23

    let config: Box<CollectionConfig> =
        Box::new(try_from_slice_unchecked(&config_acc.data.borrow())?);

    if sys_instr_account.key != &solana_program::sysvar::instructions::id() {
        return Err(ProgramError::InvalidAccountData);
    }

    let config_seeds = &[config.name.as_bytes(), program_id.as_ref()];
    let (config_auth_key, _u_bump_seed) = Pubkey::find_program_address(config_seeds, program_id);

    if config_acc.key != &config_auth_key {
        return Err(ProgramError::InvalidAccountData);
    }

    let col_auth_seeds = &[config.name.as_bytes(), b"auth", program_id.as_ref()];
    let (col_auth_key, col_bump_seed) = Pubkey::find_program_address(col_auth_seeds, program_id);
    let col_authority_seeds: &[&[_]] = &[
        config.name.as_ref(),
        b"auth",
        program_id.as_ref(),
        &[col_bump_seed],
    ];

    if col_auth_key != *col_auth_pda.key {
        return Err(CustomError::AuthKeyFailure.into());
    }

    let creators: Vec<mplCreator> = vec![
        mplCreator {
            address: *col_auth_pda.key,
            verified: true,
            share: 0,
        },
        mplCreator {
            address: config.creator_1,
            verified: false,
            share: config.creator_1_cut,
        },
    ];

    MintToCollectionV1CpiBuilder::new(&bubblegum_program)
        .tree_config(&tree_config_acc)
        .leaf_owner(&payer_acc)
        .leaf_delegate(&payer_acc)
        .merkle_tree(&merkle_tree_acc)
        .payer(&payer_acc)
        .tree_creator_or_delegate(&payer_acc)
        .collection_authority(&col_auth_pda)
        .collection_authority_record_pda(Some(&bubblegum_program))
        .collection_mint(&col_mint)
        .collection_metadata(&col_meta)
        .collection_edition(&col_masteredition)
        .bubblegum_signer(&bubblegum_signer_acc)
        .log_wrapper(&log_wrapper_acc)
        .compression_program(&compression_program)
        .token_metadata_program(&metadata_program)
        .system_program(&system_program)
        .metadata(MetadataArgs {
            name: input.name,
            symbol: input.symbol,
            uri: input.uri,
            creators,
            seller_fee_basis_points: config.sfbp,
            primary_sale_happened: false,
            is_mutable: true,
            edition_nonce: Some(0),
            uses: None,
            collection: Some(mplCollection {
                verified: true,
                key: *col_mint.key,
            }),
            token_program_version: TokenProgramVersion::Original,
            token_standard: Some(mplTokenStandard::NonFungible),
        })
        .add_remaining_account(col_auth_pda, false, true)
        .invoke_signed(&[col_authority_seeds])?;

    msg!(
        "Minted new cNFT into collection: {}",
        col_mint.key.to_string()
    );

    Ok(())
}
