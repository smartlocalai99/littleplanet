const test = require("node:test");
const assert = require("node:assert/strict");

const { applyAttendanceSalaries } = require("../lib/staffSalarySync");

test("applies attendance salaries to linked staff rows", () => {
  const staff = [
    { id: 1, full_name: "Asha", attendance_staff_id: "att-1", monthly_salary: "0" },
    { id: 2, full_name: "Bala", attendance_staff_id: "att-2", monthly_salary: "15000" },
    { id: 3, full_name: "Chandra", attendance_staff_id: null, monthly_salary: "12000" },
  ];

  const salaryByAttendanceId = new Map([
    ["att-1", 18000],
    ["att-2", 22000],
  ]);

  assert.deepEqual(applyAttendanceSalaries(staff, salaryByAttendanceId), [
    { id: 1, full_name: "Asha", attendance_staff_id: "att-1", monthly_salary: 18000 },
    { id: 2, full_name: "Bala", attendance_staff_id: "att-2", monthly_salary: 22000 },
    { id: 3, full_name: "Chandra", attendance_staff_id: null, monthly_salary: "12000" },
  ]);
});

test("keeps school salary when attendance salary is empty", () => {
  const staff = [{ id: 1, attendance_staff_id: "att-1", monthly_salary: "12000" }];
  const salaryByAttendanceId = new Map([["att-1", 0]]);

  assert.deepEqual(applyAttendanceSalaries(staff, salaryByAttendanceId), staff);
});
