import { showMessageBox, showConfirmBox, exportTableToPdf, exportTableToExcel,loadItems } from './utils.js';

// Constants for hardcoded values
const HOURS_PER_DAY = 12;
const MAX_BENEFIT_DAYS = 6;
const BENEFIT_AMOUNT = 50;

document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let isEditMode = false;
    let currentWpId = null;

    // DOM elements
    const attendanceForm = document.getElementById('attendance-form');
    const employeeDropdown = document.getElementById('employee');
    const daysInput = document.getElementById('days');
    const rateInput = document.getElementById('rate');
    const overtimeInput = document.getElementById('overtime');
    const amountToPay = document.getElementById('amount-to-pay');
    const weekStartInput = document.getElementById('week-start');
    const weekEndInput = document.getElementById('week-end');
    const filterYear = document.getElementById('filter-year');
    const filterMonth = document.getElementById('filter-month');
    const filterWeek = document.getElementById('filter-week');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const remarksInput = document.getElementById('remarks');

    // Validate DOM elements
    const requiredElements = [attendanceForm, employeeDropdown, daysInput, weekStartInput, weekEndInput, filterYear, filterMonth, filterWeek, cancelEditBtn];
    if (requiredElements.some(el => !el)) {
        console.error('Required DOM elements are missing');
        showMessageBox('Application initialization failed: Missing UI elements.', 'Error');
        return;
    }

    // Calculate week range for last week
    function getWeekRange() {
        const today = new Date();
        const day = today.getDay();
        const lastWeekMonday = new Date(today);
        lastWeekMonday.setDate(today.getDate() - day - 7 + (day === 0 ? 0 : 1));
        const lastWeekSunday = new Date(lastWeekMonday);
        lastWeekSunday.setDate(lastWeekMonday.getDate() + 6);
        return {
            start: lastWeekMonday.toISOString().split('T')[0],
            end: lastWeekSunday.toISOString().split('T')[0]
        };
    }

    function setWeekRange() {
        const { start, end } = getWeekRange();
        weekStartInput.value = start;
        weekEndInput.value = end;
    }

    // function calculateHours() {
    //     const daysWorked = parseFloat(dutyDaysInput.value);
    //     if (isNaN(daysWorked) || daysWorked < 0) {
    //         hoursInput.value = '';
    //         return;
    //     }
    //     hoursInput.value = (daysWorked * HOURS_PER_DAY).toFixed(2);
    // }

    async function calculatePayment() {
        const daysWorked = parseFloat(daysInput.value);
        const overtime = parseFloat(overtimeInput.value);
        const selectedEmployeeId = employeeDropdown.value;

        // Clear previous error
        document.getElementById('attendance-error').textContent = '';

        // Input validation
        if (!selectedEmployeeId || !employeeDropdown.options[employeeDropdown.selectedIndex]) {
            showMessageBox('Please select an employee.', 'Error');
            return;
        }
        if (isNaN(daysWorked) || daysWorked < 0) {
            document.getElementById('attendance-error').textContent = 'Number of days must be a non-negative number.';
            return;
        }

        try {
            const employeeDetails = await window.electronAPI.getEmployeeById(selectedEmployeeId);
            if (!employeeDetails || !employeeDetails.rate_6 || !employeeDetails.rate_7) {
                throw new Error('Invalid employee data received.');
            }

            const rate = daysWorked < 7 ? employeeDetails.rate_6 : employeeDetails.rate_7;
            const payment = daysWorked * rate;
            const overtimePay =  (overtime / 12) * rate;

            rateInput.value = rate;
            amountToPay.value = Math.round(payment + overtimePay);


            // document.getElementById('rate').textContent = rate.toFixed(2);
            // document.getElementById('total-payment').textContent = payment.toFixed(2);
            // document.getElementById('pf-esi').textContent = benefits.toFixed(2);
            // document.getElementById('amount-to-pay').textContent = amountToPay.toFixed(2);
        } catch (error) {
            console.error('Error calculating payment:', error);
            showMessageBox(`Error calculating payment: ${error.message}`, 'Error');
        }
    }

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Only proceed with tab switching if data-tab attribute exists
            if (tabId) {
                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active tab content
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(tabId).classList.add('active');

                if (tabId === 'attendance' && !isEditMode) {
                    loadEmployees(); // Refresh unpaid employees for attendance tab
                    clearPaymentDisplay(); // Clear payment display
                } else if (tabId === 'view-records') {
                    // Re-initialize filters and load records for view tab
                    initializeFilters();
                }
            }
        });
    });
    async function loadEmployees() {
        try {
            const weekStart = weekStartInput.value;
            if (!weekStart) {
                throw new Error('Week start date is required.');
            }
            const employees = await window.electronAPI.getUnpaidEmployees(weekStart);
            if (!Array.isArray(employees)) {
                throw new Error('Invalid employee data received.');
            }

            employeeDropdown.innerHTML = '<option value="">Select Employee</option>';
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.eid.toString();
                option.textContent = `${emp.nickname} (${emp.position})`;
                employeeDropdown.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading employees:', error);
            showMessageBox(`Failed to load employees: ${error.message}`, 'Error');
        }
    }

    async function loadAllEmployees() {         loadItems('employee' , 'labour');     }

    async function loadYearFilters(defaultYear = '') {
        try {
            const years = await window.electronAPI.getDistinctYears();
            if (!Array.isArray(years)) throw new Error('Invalid years data.');
            filterYear.innerHTML = '<option value="">All years</option>';
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === defaultYear) option.selected = true;
                filterYear.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading years:', error);
            showMessageBox(`Failed to load year filters: ${error.message}`, 'Error');
        }
    }

    async function loadMonthFilters(year, defaultMonth = '') {
        if (!year) {
            filterMonth.innerHTML = '<option value="">All months</option>';
            filterMonth.disabled = true;
            return;
        }
        try {
            const months = await window.electronAPI.getDistinctMonths(year);
            if (!Array.isArray(months)) throw new Error('Invalid months data.');
            filterMonth.innerHTML = '<option value="">All months</option>';
            filterMonth.disabled = false;
            months.forEach(month => {
                const option = document.createElement('option');
                option.value = month;
                option.textContent = new Date(`${year}-${month}-01`).toLocaleString('default', { month: 'long' });
                if (month === defaultMonth) option.selected = true;
                filterMonth.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading months:', error);
            showMessageBox(`Failed to load month filters: ${error.message}`, 'Error');
        }
    }

    async function loadWeekFilters(year, month, defaultWeek = '') {
        try {
            const weeks = await window.electronAPI.getDistinctWeeks(year, month);
            if (!Array.isArray(weeks)) throw new Error('Invalid weeks data.');
            filterWeek.innerHTML = '<option value="">All weeks</option>';
            filterWeek.disabled = !year && !month;
            weeks.forEach(week => {
                const option = document.createElement('option');
                option.value = week.week_start;
                option.textContent = `${week.week_start} to ${week.week_end}`;
                if (week.week_start === defaultWeek) option.selected = true;
                filterWeek.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading weeks:', error);
            showMessageBox(`Failed to load week filters: ${error.message}`, 'Error');
        }
    }

    async function initializeFilters() {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear().toString();
        const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');

       // console.log(currentMonth,currentYear);

        await loadYearFilters(currentYear);
        await loadMonthFilters(currentYear, currentMonth);
        await loadWeekFilters(currentYear, currentMonth);

        const selectedYear = filterYear.value;
        console.log(selectedYear);
        const selectedMonth = filterMonth.value;
        console.log(selectedMonth);
        const selectedWeek = filterWeek.value;

        await loadRecords(selectedWeek, selectedYear, selectedMonth);
    }

    async function loadRecords(weekStart = '', year = '', month = '') {
        try {
            const records = await window.electronAPI.getFilteredRecords(weekStart, year, month);
            if (!Array.isArray(records)) throw new Error('Invalid records data.');

            const tbody = document.querySelector('#records-table tbody');
            if (!tbody) throw new Error('Records table body not found.');

            tbody.innerHTML = '';
            records.forEach((record, index) => {
                if (!record.amount_payable) record.amount_payable = 0;
                const row = document.createElement('tr');
              //  row.classList.add('weekly-pay-record');
              //  row.style.display = 'flex';
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${record.nickname}</td>
                    <td>${record.week_range}</td>
                    <td>${record.no_of_days}</td>
                    <td>${record.overtime.toFixed(2)}</td>
                    <td>${record.rate.toFixed(2)}</td>
                    <td>${record.amount_to_pay.toFixed(2)}</td>
                    <td>
                        <button class="delete-btn" data-id="${record.attendance_id}"><i class="fas fa-close"></i></button>
                        <button class="edit-btn" data-id="${record.attendance_id}"><i class="fas fa-edit"></i></button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // Event delegation for buttons
            tbody.removeEventListener('click', handleTableActions); // Prevent duplicate listeners
            tbody.addEventListener('click', handleTableActions);

            updateTotals(records);
        } catch (error) {
            console.error('Error loading records:', error);
            showMessageBox(`Failed to load records: ${error.message}`, 'Error');
        }
    }

    function handleTableActions(e) {
        const btn = e.target.closest('button');
        if (!btn) return;

        const attendanceId = btn.getAttribute('data-id');
        if (btn.classList.contains('delete-btn')) {
            deleteRecord(attendanceId);
        } else if (btn.classList.contains('edit-btn')) {
            editWeeklyPaymentsRecord(attendanceId);
        }
    }

    function updateTotals(records) {
        document.getElementById('record-count').textContent = records.length;
        const totalAmountPayable = records.reduce((sum, record) => sum + (record.amount_to_pay || 0), 0);
        document.getElementById('total-amount').textContent = totalAmountPayable.toFixed(2);
        
    }

    async function deleteRecord(attendanceId) {
        showConfirmBox('Are you sure you want to delete this record?', async (confirmed) => {
            if (!confirmed) return;
            try {
                const changes = await window.electronAPI.deleteAttendanceRecord(attendanceId);
                if (changes === 0) {
                    showMessageBox('Record not found.', 'Error');
                } else {
                    const weekFilter = filterWeek.value;
                    const yearFilter = filterYear.value;
                    const monthFilter = filterMonth.value;
                    await loadRecords(weekFilter, yearFilter, monthFilter);
                    await loadEmployees();
                    showMessageBox('Record deleted successfully.', 'Success');
                }
            } catch (error) {
                console.error('Error deleting record:', error);
                showMessageBox(`Error deleting record: ${error.message}`, 'Error');
            }
        });
    }

    function clearPaymentDisplay() {
        
        document.getElementById('overtime').value = '0.00';
        document.getElementById('amount-to-pay').value = '0.00';
        document.getElementById('rate').value = '0.00';
        remarksInput.value = '';
        daysInput.value = '';
        document.getElementById('attendance-error').textContent = '';
    }

    async function editWeeklyPaymentsRecord(wpId) {
        try {
            const record = await window.electronAPI.getRecordById(wpId, 'weekly_payments', 'attendance_id');
            if (!record || !record.eid) {
                showMessageBox('Weekly payment record not found.', 'Error');
                return;
            }

            const wpTabBtn = document.querySelector('.tab-btn[data-tab="attendance"]');
            if (!wpTabBtn) throw new Error('Attendance tab button not found.');
            wpTabBtn.click();

            await loadAllEmployees();

            isEditMode = true;
            currentWpId = wpId;

            console.log('Editing weekly payment record:', record);

            employeeDropdown.value = record.eid.toString();
            if (!employeeDropdown.value) {
                console.warn(`Employee ID ${record.eid} not found in dropdown.`);
                showMessageBox(`Employee ID ${record.eid} not found in dropdown.`, 'Warning');
            }

            weekStartInput.value = record.week_start;
            weekEndInput.value = record.week_end;
            daysInput.value = record.no_of_days;
            overtimeInput.value = record.overtime;
            remarksInput.value = record.remarks;

            await calculatePayment();

            cancelEditBtn.style.display = 'inline-block';
            attendanceForm.querySelector('button[type="submit"]').textContent = 'Update';
        } catch (error) {
            console.error('Error loading weekly payment record for editing:', error);
            showMessageBox(`Failed to load weekly payment record: ${error.message}`, 'Error');
        }
    }

    // Event listeners
    daysInput.addEventListener('input', () => {
        calculatePayment();
    });
    overtimeInput.addEventListener('input' , () =>{ calculatePayment(); })
    employeeDropdown.addEventListener('change', () => {
        
        calculatePayment();
    });

    weekStartInput.addEventListener('change', async () => {
        const startDate = new Date(weekStartInput.value);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        weekEndInput.value = endDate.toISOString().split('T')[0];
        await loadEmployees();
    });

    filterYear.addEventListener('change', async () => {
        filterMonth.value = '';
        filterWeek.value = '';
        await loadMonthFilters(filterYear.value);
        await loadWeekFilters(filterYear.value, '');
        await loadRecords('', filterYear.value, '');
    });

    filterMonth.addEventListener('change', async () => {
        filterWeek.value = '';
        await loadWeekFilters(filterYear.value, filterMonth.value);
        await loadRecords('', filterYear.value, filterMonth.value);
    });

    filterWeek.addEventListener('change', () => {
        loadRecords(filterWeek.value, filterYear.value, filterMonth.value);
    });

    //event listener for search box
    document.getElementById('employee-search').addEventListener('input', function () {
        const searchTerm = this.value.trim().toLowerCase();
        const rows = document.querySelectorAll('#records-table tbody tr');
        
        rows.forEach(row => {
            const rowText = Array.from(row.cells)
                .map(cell => cell.textContent.toLowerCase())
                .join(' ');
            
            row.style.display = rowText.includes(searchTerm) ? '' : 'none';
        });
    });

    attendanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const employeeId = employeeDropdown.value;
        const weekStart = weekStartInput.value;
        const weekEnd = weekEndInput.value;
        const days = parseFloat(daysInput.value);
        const rate = rateInput.value;
        const overtime = parseFloat(overtimeInput.value);
        const amount_to_pay = parseFloat(document.getElementById('amount-to-pay').value);
        const remarks = remarksInput.value;
       
        if (!employeeId || isNaN(days) || isNaN(rate) || isNaN(overtime) || isNaN(amount_to_pay)) {
            showMessageBox('Please fill all required fields with valid data.', 'Error');
            return;
        }

        const employeeNickname = employeeDropdown.options[employeeDropdown.selectedIndex]?.textContent.split(' (')[0] || 'Unknown';

        const data = {
            eid: employeeId,
            week_start: weekStart,
            week_end: weekEnd,
            no_of_days: days,
            rate,
            amount_to_pay,
            overtime,
            remarks
        };

        try {
            let response;
            if (isEditMode) {
                data.attendanceId = currentWpId;
                response = await window.electronAPI.updateWeeklyPaymentRecord(data);
            } else {
                response = await window.electronAPI.addAttendance(data);
            }

            if (response) {
                showMessageBox(
                    isEditMode ? 'Weekly payment record updated successfully!' : `Weekly payment recorded successfully for ${employeeNickname}!`,
                    'Success'
                );
                attendanceForm.reset();
                isEditMode = false;
                currentWpId = null;
                attendanceForm.querySelector('button[type="submit"]').textContent = 'Submit';
                cancelEditBtn.style.display = 'none';
                setWeekRange(); 
                await loadEmployees();
                await initializeFilters();
            }
        } catch (error) {
            console.error('Error recording weekly payment:', error);
            showMessageBox(`Error recording weekly payment: ${error.message}`, 'Error');
        }
    });

    cancelEditBtn.addEventListener('click', () => {
        attendanceForm.reset();
        isEditMode = false;
        currentWpId = null;
        attendanceForm.querySelector('button[type="submit"]').textContent = 'Submit';
        cancelEditBtn.style.display = 'none';
        clearPaymentDisplay();
        setWeekRange();
        loadEmployees();
    });

    document.getElementById('export-excel-btn')?.addEventListener('click', () => {
        exportTableToExcel('records-table', 'Weekly Payments Records', 'weekly_payments_records');
    });

    document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
        exportTableToPdf('records-table', 'weeklyPayments_records', 'Weekly Payments Records', 'total-amount');
    });

    // Initial setup
    setWeekRange();
    loadEmployees();
    initializeFilters();
});