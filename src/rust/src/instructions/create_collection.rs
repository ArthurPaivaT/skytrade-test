use borsh::BorshDeserialize;

use crate::states::config::CollectionConfig;

use {
    crate::error::CustomError,
    mpl_token_metadata::{
        instructions::{CreateV1CpiBuilder, MintV1CpiBuilder},
        types::{CollectionDetails, Creator, PrintSupply, TokenStandard},
    },
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg, program,
        program_error::ProgramError,
        pubkey::Pubkey,
        rent::Rent,
        system_instruction,
        sysvar::Sysvar,
    },
};

pub fn process<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    data: &[u8],
) -> ProgramResult {
    let input: CollectionConfig = CollectionConfig::try_from_slice(data).unwrap();

    let accounts_iter = &mut accounts.iter();
    let payer_account = next_account_info(accounts_iter)?; // 0
    let config_account = next_account_info(accounts_iter)?; // 1
    let auth_pda = next_account_info(accounts_iter)?; // 2
    let col_mint = next_account_info(accounts_iter)?; // 3
    let col_ata = next_account_info(accounts_iter)?; // 4
    let col_meta = next_account_info(accounts_iter)?; // 5
    let col_masteredition = next_account_info(accounts_iter)?; // 6
    let token_program = next_account_info(accounts_iter)?; // 7
    let associate_program = next_account_info(accounts_iter)?; // 8
    let system_program = next_account_info(accounts_iter)?; // 9
    let _rent_program = next_account_info(accounts_iter)?; // 10
    let metadata_program = next_account_info(accounts_iter)?; // 11
    let system_instructions = next_account_info(accounts_iter)?; // 12

    if !payer_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // config seeds
    let config_seeds: &[&[_]] = &[input.name.as_ref(), program_id.as_ref()];
    let (config_key, config_bump) = Pubkey::find_program_address(config_seeds, program_id);
    if config_key != *config_account.key {
        return Err(CustomError::InvalidConfigAccount.into());
    }
    let config_auth_seeds: &[&[_]] = &[input.name.as_bytes(), program_id.as_ref(), &[config_bump]];

    if config_account.data.borrow().len() == 0 {
        program::invoke_signed(
            &system_instruction::create_account(
                payer_account.key,
                &config_account.key,
                Rent::get().unwrap().minimum_balance(1400),
                1400,
                program_id,
            ),
            &[
                payer_account.clone(),
                config_account.clone(),
                system_program.clone(),
            ],
            &[config_auth_seeds],
        )?;

        let auth_pda_seeds = &[input.name.as_bytes(), b"auth", program_id.as_ref()];
        let (auth_pda_key, auth_pda_bump) =
            Pubkey::find_program_address(auth_pda_seeds, program_id);
        if auth_pda_key != *auth_pda.key {
            return Err(CustomError::AuthKeyFailure.into());
        }

        let authority_seeds: &[&[_]] = &[
            input.name.as_bytes(),
            b"auth",
            program_id.as_ref(),
            &[auth_pda_bump],
        ];

        let col_name = input.name.clone();
        let col_uri = input.uri.clone();
        let col_symbol = input.symbol.clone();
        let sfbp = input.sfbp.clone();

        let creators: Vec<Creator> = vec![Creator {
            address: *auth_pda.key,
            verified: true,
            share: 100,
        }];

        // mints the collection NFT
        CreateV1CpiBuilder::new(&metadata_program)
            .metadata(&col_meta)
            .mint(&col_mint, true)
            .authority(&payer_account)
            .payer(&payer_account)
            .update_authority(&auth_pda, true)
            .master_edition(Some(&col_masteredition))
            .token_standard(TokenStandard::NonFungible)
            .name(col_name)
            .uri(format!("{}collection.json", col_uri))
            .symbol(col_symbol)
            .seller_fee_basis_points(sfbp)
            .is_mutable(true)
            .creators(creators)
            .decimals(0)
            .print_supply(PrintSupply::Zero)
            .system_program(&system_program)
            .sysvar_instructions(&system_instructions)
            .spl_token_program(&token_program)
            .collection_details(CollectionDetails::V1 { size: 1 })
            .invoke_signed(&[authority_seeds])?;

        MintV1CpiBuilder::new(&metadata_program)
            .token(&col_ata)
            .token_owner(Some(&auth_pda))
            .metadata(&col_meta)
            .master_edition(Some(&col_masteredition))
            .mint(&col_mint)
            .payer(&payer_account)
            .authority(&auth_pda)
            .system_program(&system_program)
            .sysvar_instructions(&system_instructions)
            .spl_token_program(&token_program)
            .spl_ata_program(&associate_program)
            .amount(1)
            .invoke_signed(&[authority_seeds])?;
    }

    let new_config = CollectionConfig::create(input)?;

    if let Err(e) = new_config.save(config_account) {
        msg!("Error saving collection config {:?}", e);
        return Err(ProgramError::InvalidInstructionData);
    }

    Ok(())
}
