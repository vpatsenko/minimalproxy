import { resolve, Resolver } from "dns";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { Bytecode } from "hardhat/internal/hardhat-network/stack-traces/model";

describe("StoreProxy", function () {

  const getGasUsed = async (tx: ContractTransaction): Promise<number> => {
    let reciept = await tx.wait()
    return Promise.resolve(reciept.gasUsed.toNumber());
  }

  it("Should print amount of gas used to deploy a clone", async function () {
    const Store = await ethers.getContractFactory("StoreCl");
    const StoreFactory = await ethers.getContractFactory("StoreFactoryClones");

    const sf = await StoreFactory.deploy();
    await sf.deployed();

    let eventFilter = sf.filters.cloneCreated()

    const salt = ethers.utils.formatBytes32String('1');
    const cloneTx = await sf.cloneStore(salt);

    let events = await sf.queryFilter(eventFilter);
    const store = Store.attach(events[0].args.cloned);
    await store.setValue("first store val");

    // second clone creation
    const secondCloneSalt = ethers.utils.formatBytes32String('2');
    const cloneTx2 = await sf.cloneStore(secondCloneSalt);
    await cloneTx2.wait();

    let eventsFromSecondClone = await sf.queryFilter(eventFilter);

    const secondStoreClone = Store.attach(eventsFromSecondClone[1].args.cloned);
    await secondStoreClone.setValue("second store val");

    let gasUsedToCreateClone = await getGasUsed(cloneTx2);
    console.log(gasUsedToCreateClone);
  });

  it("Should print amount of gas used to deploy a clone", async function () {
    const Store = await ethers.getContractFactory("StoreMaster");
    const StoreFactory = await ethers.getContractFactory("StoreFactory");

    const storeMaster = await Store.deploy();
    await storeMaster.deployed();

    const sf = await StoreFactory.deploy(storeMaster.address);
    await sf.deployed();

    let tx = await sf.clone();
    let gasUsed = await getGasUsed(tx);
    console.log(gasUsed);

    let proxyAddress = await sf.storeAddress(0);
    console.log("proxy address: ", proxyAddress)
    tx = await sf.clone();

    let storeProxy1 = await Store.attach(proxyAddress);

    tx = await storeProxy1.initialize("proxy1");
    await tx.wait();

    proxyAddress = await sf.storeAddress(1);
    console.log("proxy address: ", proxyAddress)


    let storeProxy2 = await Store.attach(proxyAddress);
    await tx.wait();

    tx = await storeProxy1.initialize("proxy1");
    await tx.wait();

    tx = await storeProxy2.initialize("proxy2");
    await tx.wait();

    tx = await storeMaster.initialize("master");
    await tx.wait();

    const proxyVal1 = await storeProxy1.value();
    console.log(proxyVal1)

    const proxyVal2 = await storeProxy2.value();
    console.log(proxyVal2)

    const masterVal = await storeMaster.value();
    console.log(masterVal)
  })
});
