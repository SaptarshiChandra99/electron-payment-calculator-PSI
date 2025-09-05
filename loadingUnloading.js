import { formatDate, showConfirmBox , showMessageBox ,loadEmployees,setSelectedEmployees, exportTableToExcel ,
    getSelectedEmployeeIds, getSelectedEmployeeNicknames,exportTableToPdf, loadItems,validatePaidByAndDate} from "./utils.js";

document.addEventListener("DOMContentLoaded" , function(){

    let isEditMode = false;
    let currentUlId = null;


    async function loadManagerEmployees() {    
        const include = { column : 'position' , data : 'manager'};
        await loadItems('paid-by' , include );
    }

    // Tab functionality
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

                // --- Refresh data based on the active tab ---
                if (tabId === 'view-records') {
                    console.log('Switching to View Records tab in loading  unloading');
                    loadRecords(); // Load records for the View Records tab
                }
                else if (tabId === 'loading-unloading') {
                    console.log('Switching to Add Record tab in loading unloading');
                    loadEmployees('labour'); // Reload employees for the multi-select
                }
                else if (tabId === 'rate-change') {
                    console.log('Switching to Rate Change tab in loading unloading');
                    // loadRates(); // You might have a function here to load current rate
                }
            }
        });
    });

    // Set the current date as the work date in the input field
    const workDate  = new Date().toISOString().split('T')[0];
    document.getElementById('work-date').value = workDate;


    const ratePerTonInput = document.getElementById('rate');

    const amount_to_pay = document.getElementById('amount-to-pay');
    const weightInput = document.getElementById('weight');
  //  const ratePerTon = parseFloat(ratePerTonInput.value) || 0;
    weightInput.addEventListener('input', calculateAmountToPay);
    ratePerTonInput.addEventListener('input', calculateAmountToPay);

    function calculateAmountToPay() {
        const weight = parseFloat(weightInput.value);
        const rate = parseFloat(ratePerTonInput.value);

        if (!isNaN(weight) && !isNaN(rate)) {
            const amount = (weight / 1000) * rate; // Convert weight to tons
            amount_to_pay.value = amount.toFixed(2); // Update amount to pay
        } else {
            amount_to_pay.value = ''; // Clear if input is invalid
        }
    }

    // Handle form submission
    const loadingUloadingForm = document.getElementById('loading-unloading-form');
    loadingUloadingForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const workDate = document.getElementById('work-date').value;
        
        const selectedEmployeeIds = getSelectedEmployeeIds(); //
        // Get selected employee nicknames using the exported getter function
        const selectedEmployeeNicknames = getSelectedEmployeeNicknames();


        const lorry_no = document.getElementById('lorry-no').value;
        const type = document.getElementById('type').value;
        const weight = parseFloat(document.getElementById('weight').value);
        const rate = parseFloat(document.getElementById('rate').value);
        const amountToPay = parseFloat(amount_to_pay.value);
        const paidBy = document.getElementById('paid-by').value;
        const remarks = document.getElementById('remarks').value;
        const payment_date = document.getElementById('payment-date').value;

        // Validate inputs
        if (!workDate || selectedEmployeeIds.length === 0 || !type || isNaN(weight) || isNaN(amountToPay)) {
            document.getElementById('loading-unloading-error').textContent = 'Please fill in all required fields and select at least one employee.';
            return;
        }
        if (!validatePaidByAndDate(paidBy, payment_date)) return;
        
        const mainTable = 'loading_unloading_payments';
        const junctionTable = 'loading_unloading_employees';
        const mainTableColumns = ['work_date','lorry_number','type','weight','rate','amount_to_pay','paid_by','remarks','payment_date'];
        const data = {
            work_date: workDate,
            lorry_number: lorry_no,
            type: type,
            weight: weight,
            rate:rate,
            amount_to_pay:amountToPay,
            paid_by: paidBy,
            remarks:remarks,
            payment_date:payment_date
        }
        const junctionRefColumn = 'ul_id', junctionFkColumn = 'eid';
        const junctionFkValues = selectedEmployeeIds;
        console.log(data);

        try {
                let response;
                if (isEditMode) {
                    // Add otId to the data for editing
                   const mainIdColumn = 'ul_id';
                    response = await window.electronAPI.updateRecord({mainTable,mainIdColumn,id:currentUlId,data,
                        junctionTable,junctionRefColumn,junctionFkValues});
                } else {
                    response = await window.electronAPI.insertRecord({mainTable,junctionTable,mainTableColumns,
                        data,junctionRefColumn,junctionFkColumn,junctionFkValues});
                }
                if (response) {
                    showMessageBox(
                        isEditMode ? 'loading  record updated successfully!' : 'Loading payment recorded successfully!',
                        'Success'
                    );
                    loadingUloadingForm.reset();
                    isEditMode = false; // Reset edit mode
                    currentUlId = null; // Clear current loading ID
                    document.getElementById('loading-unloading-form').querySelector('button[type="submit"]').textContent = 'Submit';
                    document.getElementById('cancel-edit-btn').style.display = 'none';
                    document.getElementById('work-date').value = workDate;
                    loadEmployees('labour');
                    loadRecords();
                } 
        } catch (error) {
            console.error('Error adding record:', error);
             showMessageBox(`Failed to ${isEditMode ? 'update' : 'record'} loading payment. Please try again.`, 'Error');
        }
    });

    const filterStartDateInput = document.getElementById('filter-start-date');
    const filterEndDateInput = document.getElementById('filter-end-date');

    filterStartDateInput.addEventListener('change', loadRecords);
    filterEndDateInput.addEventListener('change', loadRecords);
    // Function to set default start and end dates (past week)
    function setDefaultFilterDates() {
        const today = new Date();
        const endDate = today.toISOString().split('T')[0]; // Today's date
        
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7); // 7 days ago
        const startDate = lastWeek.toISOString().split('T')[0];

        filterStartDateInput.value = startDate;
        filterEndDateInput.value = endDate;
    }

    async function loadRecords() {
        try {

            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            if (!startDate || !endDate) {
                showMessageBox('Please select a valid date range to filter records.', 'error');
                return;
            }
           // const records = await window.electronAPI.getLoadingUnloadingRecords(startDate, endDate);

            const mainTable = 'loading_unloading_payments',mainAlias = 'lup', idColumn = 'ul_id' ,dateColumn = 'work_date';
            const junctionTable = 'loading_unloading_employees' , junctionAlias = 'lue' ,junctionMainId = 'ul_id';
            const groupEmployees = 1;

            const records = await window.electronAPI.getRecords({mainTable,mainAlias,idColumn,dateColumn,
                junctionTable,junctionAlias,junctionMainId,groupEmployees},startDate, endDate);

            const tbody = document.querySelector('#records-table tbody');
            tbody.innerHTML = '';

            records.forEach((record, index) => {
                const row = document.createElement('tr');
                // Join employee nicknames for display
               // const employeeNames = record.employee_nicknames ? record.employee_nicknames.split(',').join(', ') : 'N/A'; // Assuming employee_nicknames is a comma-separated string from DB

                row.innerHTML = `
                    <td>
                        ${index + 1}
                        <button class="expand-record-btn"><i class="fas fa-chevron-down"></i></button>
                    </td>
                    <td>${formatDate(record.work_date)}</td>
                    <td>${record.employee_nicknames}</td>
                    <td>${record.lorry_number}</td>
                    <td>${record.type}</td>
                    <td>${record.weight}</td>
                    <td>${record.rate}</td>
                    <td>${record.amount_to_pay}</td>
                    <td>${record.paid_by}</td>
                    <td>
                        <button class="delete-btn" data-id="${record.ul_id}"><i class="fas fa-close"></i></button>
                        <button class="edit-btn" data-id = "${record.ul_id}"><i class="fas fa-edit"></i></button></td>
                `;
                const detailsRow = document.createElement('tr');
                detailsRow.classList.add('record-details-row');
                detailsRow.style.display = 'none'; // hidden by default

                detailsRow.innerHTML = `
                    <td colspan="10">
                        <div class="record-details">
                            <p><strong>Payment Date:</strong> ${formatDate(record.payment_date)}</p>
                            <p><strong>Remarks:</strong> ${record.remarks || 'None'}</p>
                        </div>
                    </td>
                `;

                const expandBtn = row.querySelector('.expand-record-btn');
                expandBtn.addEventListener('click', () => {
                    if (detailsRow.style.display === 'none') {
                        detailsRow.style.display = 'table-row';
                        expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                    } else {
                        detailsRow.style.display = 'none';
                        expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    }
                });
                tbody.appendChild(row);
                tbody.appendChild(detailsRow);
            });

            // Add event listeners to all delete buttons
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const loadingId = this.getAttribute('data-id');
                    console.log('Delete button clicked for loading ID:', loadingId);
                    deleteLoadingUnloadingRecord(loadingId);
                });
            });

            document.querySelectorAll(".edit-btn").forEach(btn =>{
                btn.addEventListener('click', function() {
                    const ulId = this.getAttribute('data-id');
                    console.log('Edit button clicked for ul id:', ulId);
                    editLoadingRecord(ulId);
                });
            });

            // Update totals
            updateTotals(records);
        } catch (error) {
            console.error('Error loading records:', error);
        }
    }

    // Function to update totals based on the currently displayed records
    function updateTotals(records) {
        document.getElementById('record-count').textContent = records.length;
        const totalAmount = records.reduce((sum, record) => sum + (record.amount_to_pay || 0), 0);
        document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
    }

    function deleteLoadingUnloadingRecord(loadingId) {
        showConfirmBox('Are you sure you want to delete this loading/unloading record?' , async (confirmed) => {
            console.log('Loading record delete confirmation:', confirmed, loadingId);
            if (confirmed) {
                try {
                    const mainTable = 'loading_unloading_payments' , mainIdColumn = 'ul_id', id = loadingId;
                    const junctionTable = 'loading_unloading_employees' , junctionRefColumn = 'ul_id';
                    
                   // console.log(data + "in js file");
                    const result = await window.electronAPI.deleteRecord({mainTable,mainIdColumn,id,junctionTable,junctionRefColumn});
                    if (result > 0) {
                        console.log('loading unloading record deleted:', result);
                        showMessageBox('loading record deleted successfully!');
                        loadRecords(); // Refresh records after deletion
                    }
                    else {
                        console.error('Loading unloading record not found or already deleted:', result);
                        showMessageBox('Loading record not found or already deleted.');
                    }
                } catch (error) {
                    console.error('Error deleting Loading record:', error);
                    showMessageBox(`Error deleting loading unloading record: ${error.message}`);
                }
            }
        });
    }

    
    const exportExcelBtn = document.getElementById('export-excel-btn');
    exportExcelBtn.addEventListener('click', () => {
        exportTableToExcel('records-table', 'Loading Unloading Records', 'loading_unloading_records');
    });    

     // Event listener for the new Export to PDF button
        const exportPdfBtn = document.getElementById('export-pdf-btn');
        exportPdfBtn.addEventListener('click', () => {
            exportTableToPdf('records-table', 'loading_unloading_records', 'loading Records', 'total-amount');
        });

    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        loadingUloadingForm.reset();
        isEditMode = false;
        currentUlId = null;
        document.getElementById('loading-unloading-form').querySelector('button[type="submit"]').textContent = 'Submit';
        document.getElementById('cancel-edit-btn').style.display = 'none';
        loadEmployees('labour');
    });

    async function editLoadingRecord(ulId) {
        try {
            // Fetch the overtime record with associated employee IDs
            const result = await window.electronAPI.getRecordWithEmployeesById(
                ulId,'loading_unloading_payments','ul_id','loading_unloading_employees','ul_id');

            if (!result || !result.record) {
                showMessageBox('loading unloading record not found.', 'Error');
                return;
            }

            const { record, employeeIds } = result;

            // Switch to the Overtime Payments tab
            const loadingTabBtn = document.querySelector('.tab-btn[data-tab="loading-unloading"]');
            loadingTabBtn.click();

            // Set edit mode
            isEditMode = true;
            currentUlId = ulId;

           // updated till here nigger
            // Populate the form
            document.getElementById('lorry-no').value = record.lorry_number;
            document.getElementById('work-date').value = record.work_date;
            document.getElementById('type').value = record.type;;
            document.getElementById('weight').value = record.weight;
            document.getElementById('rate').value  = record.rate;
            document.getElementById("amount-to-pay").value = record.amount_to_pay;
            document.getElementById('paid-by').value = record.paid_by;
            document.getElementById('remarks').value = record.remarks;
            document.getElementById('payment-date').value = record.payment_date;

            document.getElementById('cancel-edit-btn').style.display = 'inline-block';

            // Populate the employee selection
            //const employeeTags = document.getElementById('employee-selected-tags');
            await loadEmployees('labour');
            setSelectedEmployees(employeeIds); // Assumes this method exists in utils.js

            // Update the submit button text
            document.getElementById('loading-unloading-form').querySelector('button[type="submit"]').textContent = 'Update';
        } catch (error) {
            console.error('Error loading Loading-unloading record for editing:', error);
            showMessageBox('Failed to load loading-unloading record for editing.', 'Error');
        }
    }    

    function loadCurrentRate() {
        const savedRate = localStorage.getItem('loadingUnloadingRate');
        if (savedRate) {
            document.getElementById('rate').value = savedRate;
        }
    }

    const rateChangeForm = document.getElementById('rate-change-form');
    rateChangeForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const newRate = document.getElementById('rate-per-ton').value;

        if (newRate && !isNaN(newRate)) {
            localStorage.setItem('loadingUnloadingRate', newRate);
            showMessageBox('Rate updated successfully!');
            loadCurrentRate();
        } else {
            showMessageBox('Please enter a valid rate.', 'error');
        }
    });

    loadCurrentRate(); // Load the current rate from localStorage
    loadEmployees('labour'); // Initial load of employees for the new multi-select
    loadManagerEmployees(); // Load manager employees for the paid by dropdown
    setDefaultFilterDates(); // Set default filter dates for the view records tab
    loadRecords(); // Initial load of records

});