const { ethers,network, getNamedAccounts } = require("hardhat");

async function mockKeepers() {
  const lottery = await ethers.getContract("Lottery");
  const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x");
  if (upkeepNeeded) {
    const tx = await lottery.performUpkeep("0x");
    const txReceipt = await tx.wait(1);
    const requestId = txReceipt.logs[1].args[0];
    console.log(`Performed upkeep with RequestId: ${requestId}`);
    if (network.config.chainId == 31337) {
      await mockVrf(requestId, lottery);
    }
  } else {
    console.log("No upkeep needed!");
  }
}

async function mockVrf(requestId, lottery) {
  console.log("We on a local network? Ok let's pretend...");
  const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.target);
  console.log("Responded!");
  const recentWinner = await lottery.getRecentWinner();
  console.log(`The winner is: ${recentWinner}`);
}

mockKeepers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
