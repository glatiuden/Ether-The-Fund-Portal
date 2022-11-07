import { ethers } from "./ethers-5.1.esm.min.js";
import { abi, contractAddress } from "./constants.js";

const connectButton = document.getElementById("connectButton");
const withdrawButton = document.getElementById("withdrawButton");
const form = document.getElementById("form");

connectButton.onclick = connect;
withdrawButton.onclick = withdraw;
form.onsubmit = fund;

function getProvider() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  return provider;
}

function getEthereum() {
  const { ethereum } = window;
  if (typeof ethereum !== "undefined") {
    return ethereum;
  }

  alert("Please install Metamask before proceeding!");
  const connectButton = document.getElementById("connectButton");
  connectButton.innerHTML = "Please install Metamask";
  connectButton.setAttribute("disabled", true);
  return;
}

async function connect() {
  const ethereum = getEthereum();
  try {
    await ethereum.request({ method: "eth_requestAccounts" });
    document.getElementById("connectButton").innerHTML = "Connected";
    await Promise.all([
      getBalance(),
      getCurrentUserBalance(),
      getGasEstimation(),
    ]);
  } catch (error) {
    console.error(error);
  }
}

async function getCurrentUserBalance() {
  const ethereum = getEthereum();
  try {
    const accounts = await ethereum.request({
      method: "eth_accounts",
    });
    const account = accounts[0];
    const provider = getProvider();
    const balance = await provider.getBalance(account);
    const balanceInETH = ethers.utils.formatEther(balance);
    document.getElementById("ethBalanceText").innerHTML = balanceInETH;

    if (balanceInETH > 0) {
      document.getElementById("fundButton").removeAttribute("disabled");
    } else {
      document.getElementById("fundButton").setAttribute("disabled", true);
    }
  } catch (error) {
    console.error(error);
  }
}

async function getBalance() {
  if (typeof window.ethereum === "undefined") {
    return;
  }

  const provider = getProvider();
  try {
    const balance = await provider.getBalance(contractAddress);
    const balanceInETH = ethers.utils.formatEther(balance);
    document.getElementById("contractBalanceText").innerHTML = balanceInETH;

    if (balanceInETH > 0) {
      document.getElementById("withdrawButton").removeAttribute("disabled");
    } else {
      document.getElementById("withdrawButton").setAttribute("disabled", true);
    }
  } catch (error) {
    console.error(error);
  }
}

async function fund(event) {
  event.preventDefault();
  if (typeof window.ethereum === "undefined") {
    return;
  }

  const provider = getProvider();
  const signer = provider.getSigner(); // whichever wallet that is connected to the metamask
  const contract = new ethers.Contract(contractAddress, abi, signer);

  const fundButton = document.getElementById("fundButton");
  const fundLoader = document.getElementById("fundLoader");

  try {
    const ethAmount = document.getElementById("input-amount").value;
    console.log(`Funding account with ${ethAmount} ETH...`);

    fundButton.classList.add("d-none");
    fundLoader.classList.remove("d-none");
    const transactionResponse = await contract.fund({
      value: ethers.utils.parseEther(ethAmount),
    });
    await listenForTransactionMine(transactionResponse, provider);
    alert(`You have funded the account successfully!`);
    await Promise.all([getBalance(), getCurrentUserBalance()]);
    document.getElementById("input-amount").value = "";
  } catch (error) {
    console.error(error);
  } finally {
    fundButton.classList.remove("d-none");
    fundLoader.classList.add("d-none");
  }
}

async function withdraw() {
  if (typeof window.ethereum === "undefined") {
    return;
  }

  const provider = getProvider();
  const signer = provider.getSigner(); // whichever wallet that is connected to the metamask
  const contract = new ethers.Contract(contractAddress, abi, signer);

  const withdrawButton = document.getElementById("withdrawButton");
  const withdrawLoader = document.getElementById("withdrawLoader");

  try {
    console.log(`Withdrawing ETH...`);

    withdrawButton.classList.add("d-none");
    withdrawLoader.classList.remove("d-none");
    const transactionResponse = await contract.withdraw();
    await listenForTransactionMine(transactionResponse, provider);
    alert("You have successfully withdrawn the funds!");
    await Promise.all([getBalance(), getCurrentUserBalance()]);
  } catch (error) {
    console.error(error);
  } finally {
    withdrawButton.classList.remove("d-none");
    withdrawLoader.classList.add("d-none");
  }
}

async function getGasEstimation() {
  const provider = getProvider();
  const signer = provider.getSigner();

  try {
    const gasPrice = await provider.getGasPrice();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    const functionGasFeesForFund = await contract.estimateGas.fund({
      value: ethers.utils.parseEther("0.1"),
    });
    const functionGasFeesForWithdraw = await contract.estimateGas.withdraw();

    const averageGasFees = functionGasFeesForFund
      .add(functionGasFeesForWithdraw)
      .div(2);
    const transactionFee = gasPrice.mul(averageGasFees);
    const transactionFeeInETH = ethers.utils.formatEther(transactionFee);
    document.getElementById("estimationText").innerHTML = transactionFeeInETH;
  } catch (error) {
    console.error(error);
  }
}

function listenForTransactionMine(transactionResponse, provider) {
  console.log(`Mining ${transactionResponse.hash}`);
  return new Promise((resolve, reject) => {
    try {
      provider.once(transactionResponse.hash, (transactionReceipt) => {
        console.log(
          `Completed with ${transactionReceipt.confirmations} confirmations.`
        );
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}
