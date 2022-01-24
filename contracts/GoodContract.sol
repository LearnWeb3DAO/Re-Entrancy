// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract GoodContract {
    
    mapping(address => uint) public balances;

    /**
        addBalance is used to add ether to the user's balance
     */
    function addBalance() public payable {
        balances[msg.sender] += msg.value;
    }

    /**
        withdraw is used to remove the user's balance of ether
     */
    function withdraw() public {
        require(balances[msg.sender] > 0);
        (bool sent, ) = msg.sender.call{value: balances[msg.sender]}("");
        require(sent, "Failed to send ether");
        balances[msg.sender] = 0;
    }
}