use solana_program::borsh0_10::try_from_slice_unchecked;

pub mod error;
pub mod instructions;
pub mod states;

use {
    crate::error::CustomError,
    solana_program::{
        account_info::AccountInfo, entrypoint, entrypoint::ProgramResult,
        program_error::PrintProgramError, program_error::ProgramError, pubkey::Pubkey,
    },
};

entrypoint!(process_instruction);
fn process_instruction<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction: u8 = instruction_data[0];

    if let Err(error) = match instruction {
        1 => instructions::create_collection::process(program_id, accounts, &instruction_data[1..]),
        2 => instructions::mint::process(
            program_id,
            accounts,
            try_from_slice_unchecked(&instruction_data[1..])?,
        ),
        _ => Err(ProgramError::InvalidArgument),
    } {
        error.print::<CustomError>();
        return Err(error);
    }

    Ok(())
}
