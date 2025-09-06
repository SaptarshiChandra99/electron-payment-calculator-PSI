// viewDetailsRenderer.js

import { loadItems } from "./utils.js";

// viewDetailsRenderer.js

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('view-payment-details-form');
    const employeeSelect = document.getElementById('employee');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const errorMessageDiv = document.getElementById('view-details-error');
    const paymentDetailsOutput = document.getElementById('payment-details-output');
    const employeeDetailsDiv = document.getElementById('employee-payment-details');

    // Function to load employees into the select dropdown
    async function loadEmployees() {
      
        await loadItems('employee'  );
        
    }

    // Set default dates to current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    startDateInput.value = firstDayOfMonth;
    endDateInput.value = lastDayOfMonth;

    // Load employees when the page loads
    loadEmployees();

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        errorMessageDiv.textContent = ''; // Clear previous errors
        paymentDetailsOutput.innerHTML = ''; // Clear previous results

        const employeeId = employeeSelect.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!employeeId || !startDate || !endDate) {
            errorMessageDiv.textContent = 'Please select an employee and both start and end dates.';
            return;
        }

        try {
            const details = await window.electronAPI.getEmployeePaymentDetails(
                parseInt(employeeId),
                startDate,
                endDate
            );

            console.log('Fetched payment details:', details);

            if (details) {
                renderPaymentDetails(details);
            } else {
                paymentDetailsOutput.innerHTML = '<p>No payment records found for the selected employee in this period.</p>';
            }

        } catch (error) {
            console.error('Error fetching payment details:', error);
            errorMessageDiv.textContent = 'Error fetching payment details: ' + error.message;
        }
    });

    // New function to render the payment details
    function renderPaymentDetails(details) {
        paymentDetailsOutput.innerHTML = ''; // Clear previous content
        let total = 0;

        const summaryData = {
            'Weekly Payments': details.weeklyPayments,
            'Bhati Payments': details.bhatiPayments,
            'Draw Machine Payments': details.drawMachinePayments,
            'Loading/Unloading Payments': details.loadingUnloadingPayments,
            'Miscellaneous Payments': details.miscPayments
        };

        const list = document.createElement('ul');
        list.className = 'payment-summary-list';

        for (const [type, records] of Object.entries(summaryData)) {
            let sum  = 0;
            if(type === 'Loading/Unloading Payments'){
                sum = records.reduce((acc, record) => acc + (record.employee_share || record.amount), 0);
            }else
                sum = records.reduce((acc, record) => acc + (record.amount_to_pay || record.amount), 0);
            total += sum;

            const listItem = document.createElement('li');
            listItem.className = 'summary-item';

            const summaryHeader = document.createElement('div');
            summaryHeader.className = 'summary-header';
            summaryHeader.innerHTML = `<span>${type}:</span><span>₹ ${sum.toFixed(2)}</span>`;
            
            const dropdownIcon = document.createElement('span');
            dropdownIcon.className = 'expand-record-btn';
            dropdownIcon.innerHTML = '<i class="fas fa-chevron-down"></i>'; // Down arrow
            summaryHeader.appendChild(dropdownIcon);

            const detailsTableContainer = document.createElement('div');
            detailsTableContainer.className = 'details-table-container';
            detailsTableContainer.style.display = 'none'; // Hidden by default

            // Create and populate the detailed table
            if (records.length > 0) {
                const table = document.createElement('table');
                table.className = 'details-table';
                const thead = document.createElement('thead');
                const tbody = document.createElement('tbody');

                // Determine columns based on payment type
                const columns = getTableColumns(type);
                thead.innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>`;

                records.forEach(record => {
                    const row = document.createElement('tr');
                    row.innerHTML = columns.map(col => `<td>${record[getColumnKey(type, col)]}</td>`).join('');
                    tbody.appendChild(row);
                });

                table.appendChild(thead);
                table.appendChild(tbody);
                detailsTableContainer.appendChild(table);
            } else {
                 detailsTableContainer.innerHTML = '<p>No detailed records found for this category.</p>';
            }
           
            listItem.appendChild(summaryHeader);
            listItem.appendChild(detailsTableContainer);
            list.appendChild(listItem);
            
            // Toggle dropdown on click
            summaryHeader.addEventListener('click', () => {
                const isHidden = detailsTableContainer.style.display === 'none';
                detailsTableContainer.style.display = isHidden ? 'block' : 'none';
                dropdownIcon.innerHTML = isHidden ? '&#9650;' : '&#9660;'; // Change arrow direction
            });
        }
        
        // Add a line for total
        const totalDiv = document.createElement('div');
        totalDiv.className = 'total-payment';
        totalDiv.innerHTML = `<strong>Total Payments: ₹ ${total.toFixed(2)}</strong>`;

        paymentDetailsOutput.appendChild(list);
        paymentDetailsOutput.appendChild(totalDiv);
    }

    // Helper function to map payment types to table columns
    function getTableColumns(type) {
        switch (type) {
            case 'Weekly Payments':
                return ['Week Start', 'Week End', 'No. of Days', 'Overtime', 'Amount to Pay'];
            case 'Bhati Payments':
                return ['Week Start', 'Week End', 'Shift', 'Bhati Duty', 'Amount to Pay'];
            case 'Draw Machine Payments':
                return ['Date', 'Machine No.', 'Gauge', 'Weight', 'Amount to Pay'];
            case 'Loading/Unloading Payments':
                return ['Date', 'Lorry Number', 'Type', 'Weight', 'Amount to Pay' , 'Share'];
            case 'Miscellaneous Payments':
                return ['Date', 'Description', 'Amount'];
            default:
                return [];
        }
    }

    // Helper function to map column display names to their database keys
    function getColumnKey(type, column) {
        switch (type) {
            case 'Weekly Payments':
                const weeklyMap = {'Week Start': 'week_start', 'Week End': 'week_end', 'No. of Days': 'no_of_days', 'Overtime': 'overtime', 'Amount to Pay': 'amount_to_pay'};
                return weeklyMap[column];
            case 'Bhati Payments':
                const bhatiMap = {'Week Start': 'week_start', 'Week End': 'week_end', 'Shift': 'shift', 'Bhati Duty': 'bhati_duty', 'Amount to Pay': 'amount_to_pay'};
                return bhatiMap[column];
            case 'Draw Machine Payments':
                const drawMap = {'Date': 'work_date', 'Machine No.': 'machine_no', 'Gauge': 'gauge', 'Weight': 'weight', 'Amount to Pay': 'amount_to_pay'};
                return drawMap[column];
            case 'Loading/Unloading Payments':
                const luMap = {'Date': 'work_date', 'Lorry Number': 'lorry_number', 'Type': 'type', 'Weight': 'weight', 'Amount to Pay': 'amount_to_pay' , 'Share' : 'employee_share'};
                return luMap[column];
            case 'Miscellaneous Payments':
                const miscMap = {'Date': 'work_date', 'Description': 'description', 'Amount': 'amount'};
                return miscMap[column];
            default:
                return '';
        }
    }
});