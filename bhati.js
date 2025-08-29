import { formatDate,searchItem, showMessageBox, showConfirmBox,loadEmployees , setSelectedEmployees ,
    getSelectedEmployeeIds,exportTableToPdf ,exportTableToExcel, loadItems,validatePaidByAndDate} from './utils.js'; // Assuming utils.js contains these functions

document.addEventListener('DOMContentLoaded', function() {

    let isEditMode = false;
    let currentBhatiId = null;


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
                    console.log('Switching to View Records tab in bhati');
                   loadRecords(); // Load records for the View Records tab
                }
                else if (tabId === 'bhati-payments') {
                    console.log('Switching to Add Record tab in bhati');
                    loadItems('employee','labour'); // Reload employees for the multi-select
                }
                else if (tabId === 'rate-change') {
                    console.log('Switching to Rate Change tab in bhati');
                    // loadRates(); // You might have a function here to load current rate
                }
            }
        });
    });

    const weekStartInput = document.getElementById('week-start');
    const weekEndInput = document.getElementById('week-end');

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

    const bhatiDutyInput = document.getElementById('bhati-duty');
    const rateInput = document.getElementById('bhati-rate');
    const amountToPayInput = document.getElementById('amount-to-pay');
    bhatiDutyInput.addEventListener('input', calculateAmountToPay);

    function calculateAmountToPay(){
        
        const rate = getRate(bhatiDutyInput.value) || 0;

        if(rate < 0 || bhatiDutyInput < 0 || bhatiDutyInput > 7) {
            showMessageBox('Wrong rate or bhatiduty input or both.');
            return;
        }    

        amountToPayInput.value = bhatiDutyInput.value * rate;

    }

    const bhatiForm = document.getElementById('bhati-payments-form');
    bhatiForm.addEventListener('submit', async function(event) {

        event.preventDefault();
        const week_start = document.getElementById('week-start').value;
        const week_end = document.getElementById('week-end').value;
        const eid = document.getElementById('employee').value;
        const shift = document.getElementById('shift').value;
        const bhatiDuty = document.getElementById('bhati-duty').value;
        const rate = document.getElementById('bhati-rate').value;
        const amountToPay = document.getElementById('amount-to-pay').value;
        const paidBy = document.getElementById('paid-by').value;
        const remarks = document.getElementById('remarks').value;
        const payment_date = document.getElementById('payment-date').value;

        
        if (!week_start || !week_end || !eid ||!shift || !bhatiDuty|| !rate || !amountToPay) {
            showMessageBox('Please fill in all fields.');
            return;
        }

        if (!validatePaidByAndDate(paidBy, payment_date)) return;

        const mainTable = 'bhati_payments';
       // const junctionTable = 'bhati_employees';
        const mainTableColumns = ['week_start','week_end','employee_id','shift','bhati_duty','rate','amount_to_pay',
            'paid_by','remarks','payment_date'];
        const data = {
           week_start:week_start,week_end:week_end,employee_id:eid, shift:shift ,bhati_duty:bhatiDuty,
            rate:rate ,amount_to_pay:amountToPay ,
             paid_by:paidBy ,remarks:remarks || '', payment_date:payment_date || 0        
        }
        // const junctionRefColumn = 'bhati_id', junctionFkColumn = 'eid';
        // const junctionFkValues = selectedEmployeeIds;
        console.log(data);

         try {
                let response;
                if (isEditMode) {
                    // Add bhatiId to the data for editing
                    // data.bhatiId = currentBhatiId;
                    // response = await window.electronAPI.updateBhatiRecord(data);
                    const mainIdColumn = 'bhati_id';
                    response = await window.electronAPI.updateRecord({mainTable,mainIdColumn,id:currentBhatiId,data});
                } else {
                    response = await window.electronAPI.insertRecord({mainTable,mainTableColumns,data});
                }
                if (response) {
                    showMessageBox(
                        isEditMode ? 'Bhati record updated successfully!' : 'Bhati payment recorded successfully!',
                        'Success'
                    );
                    bhatiForm.reset();
                    isEditMode = false; // Reset edit mode
                    currentBhatiId = null; // Clear current bhati ID
                    document.getElementById('bhati-payments-form').querySelector('button[type="submit"]').textContent = 'Submit';
                    document.getElementById('cancel-edit-btn').style.display = 'none';
                    loadItems('employee','labour');;
                    setWeekRange();
                    loadRecords();
                }
        } catch (error) {
            showMessageBox(`Failed to ${isEditMode ? 'update' : 'record'} Bhati payment. Please try again.`, 'Error');
             console.error('Error processing Bhati payment:', error);
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


    async function loadRecords(){
        try {
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            if (!startDate || !endDate) {
                showMessageBox('Please select a valid date range to filter records.', 'error');
                return;
            }
          //  const records = await window.electronAPI.getBhatiRecords(startDate, endDate);
            const mainTable = 'bhati_payments',mainAlias = 'bp', idColumn = 'bhati_id' ,dateColumn = 'week_start';
           // const junctionTable = 'bhati_employees' , junctionAlias = 'bpe' ,junctionMainId = 'bhati_id';
            const groupEmployees = 1;

            const records = await window.electronAPI.getRecords({mainTable,mainAlias,idColumn,dateColumn,
                groupEmployees},startDate, endDate);

            console.log(records);
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
                    <td>(${formatDate(record.week_start)})-(${formatDate(record.week_end)})</td>
                    <td>${record.employee_nicknames}</td>
                    <td>${record.shift}</td>
                    <td>${record.bhati_duty}</td>
                    <td>${record.rate}</td>
                    <td>${record.amount_to_pay}</td>
                    <td>${record.paid_by}</td>
                    <td>
                        <button class="delete-btn" data-id="${record.bhati_id}"><i class="fa fa-close"></i></button>
                        <button class="edit-btn" data-id = "${record.bhati_id}"><i class="fas fa-edit"></i></button>
                    </td>
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
                    const bhatiId = this.getAttribute('data-id');
                    console.log('Delete button clicked for bhati ID:', bhatiId);
                    deleteBhatiRecord(bhatiId);
                });
            });

            document.querySelectorAll(".edit-btn").forEach(btn =>{
                btn.addEventListener('click', function() {
                    const bhatiId = this.getAttribute('data-id');
                    console.log('Edit button clicked for ot id:', bhatiId);
                    editBhatiRecord(bhatiId);
                });
            });
            // Update totals
            updateTotals(records);
        } catch (error) {
            console.error('Error bhati records:', error);
        }
    }

    // Function to update totals based on the currently displayed records
    function updateTotals(records) {
        document.getElementById('record-count').textContent = records.length;
        const totalAmount = records.reduce((sum, record) => sum + (record.amount_to_pay || 0), 0);
        document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
    }

    const search = document.getElementById('item-search');
    search.addEventListener('input',function(){
       
        searchItem('item-search' , '#records-table tbody tr' , 7)
    });

    function deleteBhatiRecord(bhatiId) {
        showConfirmBox('Are you sure you want to delete this bhati record?' , async (confirmed) => {
            console.log('bhati record delete confirmation:', confirmed, bhatiId);
            if (confirmed) {
                try {
                    const mainTable = 'bhati_payments' , mainIdColumn = 'bhati_id', id = bhatiId;
                    //const junctionTable = 'bhati_employees' , junctionRefColumn = 'bhati_id';
                    
                   // console.log(data + "in js file");
                    const result = await window.electronAPI.deleteRecord({mainTable,mainIdColumn,id});
                   // const result = await window.electronAPI.deleteBhatiRecord(bhatiId);
                    if (result > 0) {
                        console.log('bhati record deleted:', result);
                        showMessageBox('bhati deleted successfully!');
                        loadRecords(); // Refresh records after deletion
                    }
                    else {
                        console.error('bhati record not found or already deleted:', result);
                        showMessageBox('bhati not found or already deleted.');
                    }
                } catch (error) {
                    console.error('Error deleting bhati record:', error);
                    showMessageBox(`Error deleting bhati record: ${error.message}`);
                }
            }
        });
    }


    const exportExcelBtn = document.getElementById('export-excel-btn');
    exportExcelBtn.addEventListener('click', () => {
        exportTableToExcel('records-table', 'Bhati Records', 'bhati_records');
    });

    // Event listener for the new Export to PDF button
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    exportPdfBtn.addEventListener('click', () => {
        exportTableToPdf('records-table', 'bhati_records', 'bhati Records', 'total-amount');
    });


    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            bhatiForm.reset();
            isEditMode = false;
            currentBhatiId = null;
            setWeekRange();
            document.getElementById('bhati-payments-form').querySelector('button[type="submit"]').textContent = 'Submit';
            document.getElementById('cancel-edit-btn').style.display = 'none';
            loadItems('employee','labour');
        });
    
        async function editBhatiRecord(bhatiId) {
            try {
                // Fetch the bhati record with associated employee IDs
                const result = await window.electronAPI.getRecordById(
                    bhatiId,'bhati_payments','bhati_id');
                console.log(result , 'after edit button');
                if (!result) {
                    showMessageBox('Bhati record not found.', 'Error');
                    return;
                }
    
               // const { record, employeeIds } = result;

                
    
                // Switch to the Bhati Payments tab
                const bhatiTabBtn = document.querySelector('.tab-btn[data-tab="bhati-payments"]');
                bhatiTabBtn.click();
    
                // Set edit mode
                isEditMode = true;
                currentBhatiId = bhatiId;

                await loadItems('employee' , 'labour');
    
                // Populate the form
                document.getElementById('week-start').value = result.week_start;
                document.getElementById('week-end').value = result.week_end;
                document.getElementById('employee').value = result.employee_nicknames;
                document.getElementById('bhati-rate').value = result.rate;
                document.getElementById('bhati-duty').value = result.bhati_duty;
                document.getElementById('amount-to-pay').value = result.amount_to_pay;
                document.getElementById('paid-by').value = result.paid_by;
                document.getElementById('shift').value = result.shift;
                document.getElementById('remarks').value = result.remarks;
                document.getElementById('payment-date').value = result.payment_date;

                document.getElementById('cancel-edit-btn').style.display = 'inline-block';
    
                // Populate the employee selection
                //const employeeTags = document.getElementById('employee-selected-tags');
                await loadItems('employee','labour');;
               // setSelectedEmployees(employeeIds); // Assumes this method exists in utils.js
                // Update the submit button text
                document.getElementById('bhati-payments-form').querySelector('button[type="submit"]').textContent = 'Update';
            } catch (error) {
                console.error('Error loading bhati record for editing:', error);
                showMessageBox('Failed to load bhati record for editing.', 'Error');
            }
        }

    function loadCurrentRate() {
        const savedRate = JSON.parse(localStorage.getItem('bhatiRate'));
        if(!savedRate){
            showMessageBox('No Saved bhati rates found');
            return;
        }
        console.log(savedRate.rate_5_days);
        document.getElementById('bhati_rate_7_day').value = savedRate.rate_7_days;
        document.getElementById('bhati_rate_6_day').value = savedRate.rate_6_days;
        document.getElementById('bhati_rate_5_day').value = savedRate.rate_5_days;
        
    }

    function getRate(bhatiDuties){
        const savedRate = JSON.parse(localStorage.getItem('bhatiRate'));
        if(!savedRate){
            showMessageBox('No Saved bhati rates found');
            document.getElementById('bhati-rate').value = 0; // Fixed: Fallback to 0
            return;
        }
        console.log(bhatiDuties);
        if (bhatiDuties == 7) {
            console.log("here");
            document.getElementById('bhati-rate').value = savedRate.rate_7_days;
            return savedRate.rate_7_days;

        }else if(bhatiDuties == 6){
            document.getElementById('bhati-rate').value = savedRate.rate_6_days;
            return savedRate.rate_6_days;
        }else if(bhatiDuties >= 0 && bhatiDuties <= 5){
            document.getElementById('bhati-rate').value = savedRate.rate_5_days;
            return savedRate.rate_5_days;
        }
    }

    const rateChangeForm = document.getElementById('bhati-rate-change-form');
    rateChangeForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const newRate_7_days = parseInt(document.getElementById('bhati_rate_7_day').value);
        const newRate_6_days = parseInt(document.getElementById('bhati_rate_6_day').value);
        const newRate_5_days = parseInt(document.getElementById('bhati_rate_5_day').value);

        if (newRate_7_days > 0 && newRate_6_days && newRate_5_days  
            && newRate_7_days && newRate_6_days && newRate_5_days 
            && !isNaN(newRate_7_days) && !isNaN(newRate_6_days) && !isNaN(newRate_5_days)) {
            let bhatiRate = {
                rate_7_days:newRate_7_days,
                rate_6_days:newRate_6_days,
                rate_5_days:newRate_5_days,
            }
            localStorage.setItem('bhatiRate', JSON.stringify(bhatiRate));
            showMessageBox('Bhati Rate updated successfully!');
            loadCurrentRate();
        } else {
            showMessageBox('Please enter a valid rate.', 'error');
        }
    });

    loadCurrentRate();
    setWeekRange();
    setDefaultFilterDates(); // Set default filter dates
    loadRecords();
    loadItems('employee','labour');
    loadItems('paid-by','manager');
    

});