const ADMISSION_FEE_DEFAULTS = {
  Nursery: {
    totalFees: 19000,
    firstTermFee: 5000,
    monthlyBalanceText: "Rs. 2000/- per month",
  },
  LKG: {
    totalFees: 20000,
    firstTermFee: 6000,
    monthlyBalanceText: "Rs. 2000/- per month",
  },
  UKG: {
    totalFees: 21000,
    firstTermFee: 6000,
    monthlyBalanceText: "Rs. 2000/- per month",
  },
  "1st": {
    totalFees: 24000,
    firstTermFee: 4000,
    monthlyBalanceText: "Rs. 3000/- per month",
  },
  "2nd": {
    totalFees: 25000,
    firstTermFee: 5000,
    monthlyBalanceText: "Rs. 3000/- per month",
  },
  "3rd": {
    totalFees: 26000,
    firstTermFee: 6000,
    monthlyBalanceText: "Rs. 3000/- per month",
  },
  "4th": {
    totalFees: 27000,
    firstTermFee: 7000,
    monthlyBalanceText: "Rs. 3000/- per month",
  },
  "5th": {
    totalFees: 28000,
    firstTermFee: 8000,
    monthlyBalanceText: "Rs. 3000/- per month",
  },
};

function getAdmissionFeeDefault(className) {
  return ADMISSION_FEE_DEFAULTS[String(className || "").trim()] || null;
}

module.exports = {
  ADMISSION_FEE_DEFAULTS,
  getAdmissionFeeDefault,
};
