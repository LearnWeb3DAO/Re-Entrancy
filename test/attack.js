const { expect } = require("chai");
const { ethers, uttils } = require("hardhat");

describe("Attack", function () {
  it("Should empty the balance of the good contract", async function () {
    const goodContract = await ethers.getContractFactory("GoodContract");
    const _goodContract = await goodContract.deploy();
    await _goodContract.deployed();

    const badContract = await ethers.getContractFactory("BadContract");
    const _badContract = await badContract.deploy(_goodContract.address);
    await _badContract.deployed();

    const [owner] = await ethers.getSigners();
    const tx = await badContract.attack(parseEther("500"));

    await tx.wait();
  });
});
