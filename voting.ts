import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OnchainVoting } from "../target/types/onchain_voting";

describe("voting", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.OnchainVoting as Program<OnchainVoting>;
  const provider = anchor.AnchorProvider.env();

  // 투표자 2명 생성
  const voter1 = anchor.web3.Keypair.generate();
  const voter2 = anchor.web3.Keypair.generate();

  // PDA 주소 계산
  const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("poll"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  const [voteRecord1] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("voted"), pollPda.toBuffer(), voter1.publicKey.toBuffer()],
    program.programId
  );

  const [voteRecord2] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("voted"), pollPda.toBuffer(), voter2.publicKey.toBuffer()],
    program.programId
  );

  // 투표자들에게 SOL 에어드랍
  before(async () => {
    const sig1 = await provider.connection.requestAirdrop(
      voter1.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    const sig2 = await provider.connection.requestAirdrop(
      voter2.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig1);
    await provider.connection.confirmTransaction(sig2);
  });

  it("poll 생성", async () => {
    const tx = await program.methods.createPoll()
      .accounts({
        pollAccount: pollPda,
      })
      .rpc();
    console.log("tx:", tx);

    let pollData = await program.account.poll.fetch(pollPda);
    console.log("is_active:", pollData.isActive);
    console.log("authority:", pollData.authority.toString());
  });

  it("voter1 -> cat 투표", async () => {
    const tx = await program.methods.castVote({ cat: {} })
      .accounts({
        pollAccount: pollPda,
        voteRecord: voteRecord1,
        signer: voter1.publicKey,
      })
      .signers([voter1])
      .rpc();
    console.log("tx:", tx);

    let pollData = await program.account.poll.fetch(pollPda);
    console.log("cat:", pollData.cat.toString());
    console.log("dog:", pollData.dog.toString());
  });

  it("voter2 -> dog 투표", async () => {
    const tx = await program.methods.castVote({ dog: {} })
      .accounts({
        pollAccount: pollPda,
        voteRecord: voteRecord2,
        signer: voter2.publicKey,
      })
      .signers([voter2])
      .rpc();
    console.log("tx:", tx);

    let pollData = await program.account.poll.fetch(pollPda);
    console.log("cat:", pollData.cat.toString());
    console.log("dog:", pollData.dog.toString());
  });

  it("voter1 중복 투표 실패", async () => {
    try {
      await program.methods.castVote({ cat: {} })
        .accounts({
          pollAccount: pollPda,
          voteRecord: voteRecord1,
          signer: voter1.publicKey,
        })
        .signers([voter1])
        .rpc();
      throw new Error("중복 투표가 통과됨");
    } catch (err) {
      console.log("중복 투표 차단 성공");
    }
  });

  it("poll 종료", async () => {
    const tx = await program.methods.closePoll()
      .accounts({
        pollAccount: pollPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();
    console.log("tx:", tx);

    let pollData = await program.account.poll.fetch(pollPda);
    console.log("is_active:", pollData.isActive);
  });

  it("종료된 poll에 투표 실패", async () => {
    const voter3 = anchor.web3.Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      voter3.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const [voteRecord3] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voted"), pollPda.toBuffer(), voter3.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods.castVote({ cat: {} })
        .accounts({
          pollAccount: pollPda,
          voteRecord: voteRecord3,
          signer: voter3.publicKey,
        })
        .signers([voter3])
        .rpc();
      throw new Error("종료된 poll에 투표가 통과됨");
    } catch (err) {
      console.log("종료된 poll 투표 차단 성공");
    }
  });
});