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
