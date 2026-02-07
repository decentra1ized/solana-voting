use anchor_lang::prelude::*;
declare_id!("여기에_anchor_keys_list_결과");

#[program]
pub mod voting {
    use super::*;

    pub fn create_poll(ctx: Context<CreatePoll>) -> Result<()> {
        let poll = &mut ctx.accounts.poll_account;
        poll.is_active = true;
        poll.authority = ctx.accounts.signer.key();
        Ok(())
    }

    pub fn cast_vote(ctx: Context<CastVote>, pick: Pick) -> Result<()> {
        require!(ctx.accounts.poll_account.is_active, ErrorCode::PollClosed);
        match pick {
            Pick::Cat => {
                msg!("Voted for Cat");
                ctx.accounts.poll_account.cat += 1;
            },
            Pick::Dog => {
                msg!("Voted for Dog");
                ctx.accounts.poll_account.dog += 1;
            },
        };
        Ok(())
    }

    pub fn close_poll(ctx: Context<ClosePoll>) -> Result<()> {
        ctx.accounts.poll_account.is_active = false;
        msg!("Poll closed");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreatePoll<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 1 + 32 + 8 + 8,
        seeds = [b"poll", signer.key().as_ref()],
        bump,
    )]
    pub poll_account: Account<'info, Poll>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub poll_account: Account<'info, Poll>,
    #[account(
        init,
        payer = signer,
        space = 8,
        seeds = [b"voted", poll_account.key().as_ref(), signer.key().as_ref()],
        bump,
    )]
    pub vote_record: Account<'info, VoteRecord>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClosePoll<'info> {
    #[account(mut, has_one = authority)]
    pub poll_account: Account<'info, Poll>,
    pub authority: Signer<'info>,
}

#[account]
#[derive(Default)]
pub struct Poll {
    pub is_active: bool,
    pub authority: Pubkey,
    pub cat: u64,
    pub dog: u64,
}

#[account]
pub struct VoteRecord {}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum Pick {
    Cat,
    Dog,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Poll is closed")]
    PollClosed,
}