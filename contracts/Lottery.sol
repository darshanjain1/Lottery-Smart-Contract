// Lottery smart contract

// This contract is used to manage a lottery
// Players can enter the lottery by sending ether to this contract
// Pick a random winner from all players who have entered(verifiably random)
// The chainlink VRF coordinator handles randomness 
// Winner to be selected every X minutes  -> completely automate
// The chanlink keeper allows randomness to be requested
// from the chainlink VRF and delivered on-chain 
// Chainlink oracle -> Randomness, Automated Execution (Chainlink keeper)

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

error Lottery__NotEnoughEtherSent(uint256 amountFunded, uint256 amountRequired);
error Lottery__TransferFailed();
error Lottery__NotOpen(string message);
error Lottery__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 lotteryState);

/** @title A sample lottery contract
 * @author Darshan Jain
 * @notice This contract is for creating an untemparable decentralized smart contract
 * @dev This implements Chainlink VRF V2 to get random winner and Chainlink Keeper to automate the lottery.
 */
contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum LotteryState {
        OPEN,
        CALCULATING
    }
    // State variables
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    uint256 public immutable i_entranceFee;
    address private immutable i_owner;
    address payable[]  private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint8 private immutable i_interval;
    
    // lottery variables 
    address private s_recentWinner;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimeStamp;

    // naming convention for events is to name events with the function name reversed
    event LotteryEnter(address indexed player);
    event RequestLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    modifier minAmount() {
        if( msg.value < i_entranceFee){ revert Lottery__NotEnoughEtherSent(msg.value, i_entranceFee);}
        _;
    }
    modifier openOnly() {
        if(s_lotteryState != LotteryState.OPEN){ revert Lottery__NotOpen("Lottery is not open");}
        _;
    }

    constructor(address _vrfCoordinatorV2, uint256 _entranceFee, bytes32 _gasLane, uint64 _subscriptionId, uint32 _callbackGasLimit, uint8 _interval) VRFConsumerBaseV2(_vrfCoordinatorV2){
        i_owner = msg.sender;
        i_entranceFee = _entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_gasLane = _gasLane;
        i_subscriptionId = _subscriptionId;
        i_callbackGasLimit = _callbackGasLimit;
        i_interval = _interval;
        s_lastTimeStamp = block.timestamp;
        s_lotteryState = LotteryState.OPEN;
    }

    function enterLottery()  public payable openOnly minAmount {
        s_players.push(payable(msg.sender));
        emit LotteryEnter(msg.sender);

    }
 /**
     * @dev This is the function that the chainlink keeper nodes call
     * they look for upkeepNeeded to return true.
     * The following should be true in order to return true
     * 1. Our time interval should have passed.
     * 2. The lottery should have at least 1 player, and have some ETH
     * 3. Our subscription is funded with LINK
     * 4. The lottery should be in "open" state 
     */ 
    function checkUpkeep(bytes memory /*checkData*/) public view override returns (bool upkeepNeeded, bytes memory /*performData */) {
        bool isOpen = s_lotteryState == LotteryState.OPEN;
        bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayers  = s_players.length != 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = timePassed && isOpen && hasPlayers && hasBalance;
    }
    function performUpkeep(bytes calldata /*performData*/) external override {
        (bool upkeepNeeded,) = checkUpkeep("");
        if(!upkeepNeeded) revert Lottery__UpkeepNotNeeded(address(this).balance, s_players.length, uint256(s_lotteryState));
        s_lotteryState = LotteryState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        // This is redundant
        emit RequestLotteryWinner(requestId);
    }
    function fulfillRandomWords(uint256, uint256[] memory randomWords) internal override{
        // Pick a random winner from the players array using the modulos operator with random number and length of players array
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_lotteryState = LotteryState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp; 
        // Send the lottery money to the random winner
        (bool success, ) = recentWinner.call{value:address(this).balance}("");
        if(!success){
            revert Lottery__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    // view & pure functions
    function getOwner() public view returns (address){
        return i_owner;
    }
    function getPlayer(uint256 index) public view returns (address){
        return s_players[index];
    }
    function getVRFCoordinator() public view returns (VRFCoordinatorV2Interface ) {
        return i_vrfCoordinator;
    }
    function getRecentWinner() public view returns (address){
        return s_recentWinner;
    }
    function getLotteryState() public view returns (LotteryState){
        return s_lotteryState;
    }
    function getNumWords() public pure returns (uint32) {
        return NUM_WORDS;
    }
    function getNumberOfPlayers() public view returns (uint256){
        return s_players.length;
    }
    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }
    function getRequestConfirmations() public pure returns (uint16){
        return REQUEST_CONFIRMATIONS;
    }
    function getInterval() public view returns (uint8) {
        return i_interval;
    }
    function setState(uint8 stateIndex) public {
        s_lotteryState = LotteryState(stateIndex);
    }
}