function isSubmittedPayroll(status) {
  return String(status || "").toUpperCase() === "PAID";
}

module.exports = {
  isSubmittedPayroll,
};
