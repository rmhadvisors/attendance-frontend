// Definitions for the letters the admin can generate (Letters page).
//
// `fields` drives the form: every field names its `group` (a section of the form, see GROUPS).
// `initial()` builds the starting values and `fromEmployee(emp)` prefills them from an employee.
// The matching Word file and endpoint live in the backend (app/routers/letters.py, app/services/letters_docx.py).

const today = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const ICONS = {
  document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  note: "M7 8h10M7 12h6m-6 8l-3-3V6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-2 3z",
  money: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  pen: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 112.8 2.8L11.8 15H9v-2.8l8.6-8.6z",
  download: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3",
  close: "M6 18L18 6M6 6l12 12",
  check: "M5 13l4 4L19 7",
}

export const GROUPS = {
  letter: { title: "Letter", icon: ICONS.document },
  employee: { title: "Employee", icon: ICONS.user },
  dates: { title: "Dates", icon: ICONS.calendar },
  terms: { title: "Terms", icon: ICONS.money },
  details: { title: "Details", icon: ICONS.note },
  signatory: { title: "Company signatory", icon: ICONS.pen },
}

const ADDRESS = { key: "address", label: "Address", type: "textarea", group: "employee", full: true, placeholder: "One line per address line", maxLength: 500 }

export const LETTERS = {
  experience: {
    label: "Experience Letter",
    description: "Certifies an employee's tenure, role and conduct.",
    fields: [
      { key: "date", label: "Date", type: "date", group: "letter" },
      { key: "employee_name", label: "Name of Employee", type: "text", group: "employee" },
      { key: "gender", label: "Gender (for he / she in the letter)", type: "select", group: "employee", options: [["male", "Male"], ["female", "Female"]] },
      { key: "designation", label: "Designation", type: "text", group: "employee" },
      { key: "department", label: "Department", type: "text", group: "employee" },
      { key: "manager_name", label: "Name of Manager", type: "text", group: "employee" },
      { key: "tenure_from", label: "Tenure — from", type: "date", group: "dates" },
      { key: "tenure_to", label: "Tenure — to", type: "date", group: "dates" },
      { key: "tasks", label: "Tasks undertaken", type: "textarea", group: "details", full: true, placeholder: "e.g. GST filings and related tasks" },
    ],
    initial: () => ({
      date: today(), employee_name: "", gender: "male", designation: "", department: "",
      manager_name: "", tenure_from: "", tenure_to: "", tasks: "",
    }),
    fromEmployee: (e) => ({
      employee_name: e.name || "",
      designation: e.designation || "",
      department: e.department || "",
      manager_name: e.reporting_manager || "",
      tenure_from: e.date_of_joining || "",
      tenure_to: e.date_of_exit || "",
    }),
  },

  relieving: {
    label: "Relieving Letter",
    description: "Confirms an employee has been relieved from their duties.",
    fields: [
      { key: "date", label: "Date", type: "date", group: "letter" },
      { key: "employee_name", label: "Name (after “Dear”)", type: "text", group: "employee" },
      ADDRESS,
      { key: "designation", label: "Designation", type: "text", group: "employee" },
      { key: "department", label: "Department", type: "text", group: "employee" },
      { key: "manager_name", label: "Name of Manager", type: "text", group: "employee" },
      { key: "tenure_from", label: "Tenure — from", type: "date", group: "dates" },
      { key: "tenure_to", label: "Tenure — to", type: "date", group: "dates" },
      { key: "relieving_date", label: "Relieved with effect from (close of working hours)", type: "date", group: "dates", full: true },
      { key: "tasks", label: "Responsible for assisting in", type: "textarea", group: "details", full: true, placeholder: "e.g. GST and related tasks" },
      { key: "subject", label: "Subject", type: "text", group: "letter", full: true, optional: true, placeholder: "Relieving Letter" },
    ],
    initial: () => ({
      date: today(), employee_name: "", address: "", designation: "", department: "", manager_name: "",
      tenure_from: "", tenure_to: "", relieving_date: "", tasks: "GST and related tasks", subject: "",
    }),
    fromEmployee: (e) => ({
      employee_name: e.name || "",
      designation: e.designation || "",
      department: e.department || "",
      manager_name: e.reporting_manager || "",
      tenure_from: e.date_of_joining || "",
      tenure_to: e.date_of_exit || "",
      relieving_date: e.date_of_exit || "",
    }),
  },

  offer: {
    label: "Offer of Contractual Employment",
    description: "Contractual offer with probation, notice, compensation and an acceptance page.",
    fields: [
      { key: "date", label: "Date", type: "date", group: "letter" },
      { key: "employee_name", label: "Name (after “Dear”)", type: "text", group: "employee" },
      ADDRESS,
      { key: "designation", label: "Designation", type: "text", group: "employee", placeholder: "e.g. Intern" },
      { key: "department", label: "Department", type: "text", group: "employee", placeholder: "e.g. Income Tax Department" },
      { key: "manager_name", label: "Name of Manager", type: "text", group: "employee" },
      { key: "joining_date", label: "Date of joining (with effect from)", type: "date", group: "dates", full: true },
      { key: "probation_months", label: "Probation period (months)", type: "number", group: "terms", min: 1, max: 24, step: 1 },
      { key: "notice_months", label: "Notice period (months)", type: "number", group: "terms", min: 1, max: 24, step: 1 },
      { key: "compensation", label: "Compensation (₹ per month)", type: "number", group: "terms", min: 1, step: "any" },
      { key: "tds_percent", label: "TDS deducted (%)", type: "number", group: "terms", min: 0, max: 100, step: "any" },
      { key: "subject", label: "Subject", type: "text", group: "letter", full: true, optional: true, placeholder: "Offer of Contractual Employment" },
    ],
    initial: () => ({
      date: today(), employee_name: "", address: "", designation: "", department: "", manager_name: "",
      joining_date: "", probation_months: "2", notice_months: "2", compensation: "", tds_percent: "10", subject: "",
    }),
    fromEmployee: (e) => ({
      employee_name: e.name || "",
      designation: e.designation || "",
      department: e.department || "",
      manager_name: e.reporting_manager || "",
      joining_date: e.date_of_joining || "",
    }),
  },

  bond: {
    label: "Employment Bond / Service Agreement",
    description: "Two-page service agreement with a bond period, penalty and signature blocks.",
    fields: [
      { key: "date", label: "Agreement date", type: "date", group: "letter" },
      { key: "title", label: "Title", type: "select", group: "employee", options: [["Ms.", "Ms."], ["Mr.", "Mr."], ["Mrs.", "Mrs."]] },
      { key: "employee_name", label: "Name of Employee", type: "text", group: "employee" },
      { ...ADDRESS, label: "Address (residing at)" },
      { key: "designation", label: "Designation", type: "text", group: "employee" },
      { key: "department", label: "Department", type: "text", group: "employee", placeholder: "e.g. GST Department" },
      { key: "effective_date", label: "Position effective from", type: "date", group: "dates", full: true },
      { key: "bond_from", label: "Bond period — from", type: "date", group: "dates" },
      { key: "bond_to", label: "Bond period — to", type: "date", group: "dates" },
      { key: "penalty_months", label: "Penalty (months of salary)", type: "number", group: "terms", min: 1, max: 60, step: 1 },
      { key: "notice_months", label: "Notice period after bond (months)", type: "number", group: "terms", min: 1, max: 60, step: 1 },
      { key: "signatory_name", label: "Name", type: "text", group: "signatory" },
      { key: "signatory_designation", label: "Designation", type: "text", group: "signatory" },
    ],
    initial: () => ({
      date: today(), title: "Ms.", employee_name: "", address: "", designation: "", department: "",
      effective_date: "", bond_from: "", bond_to: "", penalty_months: "2", notice_months: "2",
      signatory_name: "", signatory_designation: "",
    }),
    fromEmployee: (e) => ({
      employee_name: e.name || "",
      designation: e.designation || "",
      department: e.department || "",
      effective_date: e.date_of_joining || "",
    }),
  },
}
