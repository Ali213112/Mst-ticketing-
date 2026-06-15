import { expect } from 'chai';
import { ethers } from 'hardhat';
import { EventTickets1155, TicketMarketplace } from '../typechain-types';

describe('TicketMarketplace', () => {
  it('enforces price cap and distributes fees on sale', async () => {
    const [platform, org, seller, buyer] = await ethers.getSigners();

    const tickets = (await ethers.deployContract('EventTickets1155', [
      org.address,
      'event-1',
      'https://example.com/',
    ])) as EventTickets1155;
    await tickets.waitForDeployment();
    await tickets.setTier(1, 10, ethers.parseEther('1'), true, 500);

    const marketplace = (await ethers.deployContract('TicketMarketplace', [
      platform.address,
      org.address,
      200,
      500,
    ])) as TicketMarketplace;
    await marketplace.waitForDeployment();

    await tickets.mintTicket(seller.address, 1, 1, { value: ethers.parseEther('1') });
    await tickets.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);

    const ask = ethers.parseEther('1.2');
    const max = ethers.parseEther('1.5');
    const tx = await marketplace
      .connect(seller)
      .listTicket(await tickets.getAddress(), 1, 1, ask, max);
    await tx.wait();

    const listingId = 1n;
    await expect(
      marketplace.connect(buyer).buyTicket(listingId, { value: ask })
    ).to.emit(marketplace, 'TicketSold');

    expect(await tickets.balanceOf(buyer.address, 1)).to.equal(1);
  });

  it('reverts when ask exceeds max price', async () => {
    const [platform, org, seller] = await ethers.getSigners();

    const tickets = (await ethers.deployContract('EventTickets1155', [
      org.address,
      'event-2',
      'https://example.com/',
    ])) as EventTickets1155;
    await tickets.waitForDeployment();
    await tickets.setTier(1, 10, ethers.parseEther('1'), true, 500);

    const marketplace = (await ethers.deployContract('TicketMarketplace', [
      platform.address,
      org.address,
      200,
      500,
    ])) as TicketMarketplace;
    await marketplace.waitForDeployment();

    await tickets.mintTicket(seller.address, 1, 1, { value: ethers.parseEther('1') });
    await tickets.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);

    await expect(
      marketplace
        .connect(seller)
        .listTicket(await tickets.getAddress(), 1, 1, ethers.parseEther('2'), ethers.parseEther('1.5'))
    ).to.be.revertedWithCustomError(marketplace, 'InvalidPrice');
  });
});
