import { formatDate,showMessageBox,showConfirmBox ,exportTableToPdf,exportTableToExcel,
    loadItems, searchItem,validatePaidByAndDate} from './utils.js'; // Assuming utils.js contains these functions

document.addEventListener('DOMContentLoaded', function() {

    let isEditMode = false;
    let currentBbId = null;

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
                    console.log('Switching to View Records tab in bull block');
                    loadBullBlockRecords(); // Load records for the View Records tab
                   
                } 
                else if (tabId === 'bull-block') {
                    console.log('Switching to Add Record tab in bull block');
                    loadBullBlockEmployees(); // Load employees for the Add Record tab
                }
                else if (tabId === 'rate-change') {
                    console.log('Switching to Rate Change tab in bull block');
                    loadRates(); // Load rates for the Rate Change tab
                }
            }
        });
    });

    // Set the current date as the work date in the input field
    const workDate  = new Date().toISOString().split('T')[0];
    document.getElementById('work-date').value = workDate;

   async function loadBullBlockEmployees() {
    try {
        await loadItems('employee', 'bull block');
        console.log('Employees loaded successfully for Bull Block tab');
    } catch (error) {
        console.error('Error loading employees:', error);
        showMessageBox(`Failed to load employees: ${error.message}`, 'Error');
        throw error; // Propagate error to be caught by caller
    }
}

    const gaugeInput = document.getElementById('gauge');
    const weightInput = document.getElementById('weight');
    const amountToPayInput = document.getElementById('amount-to-pay');
    const rateInput = document.getElementById('rate');

    function calculateAmountToPay() {
        const gauge = parseFloat(gaugeInput.value);
        const weight = parseFloat(weightInput.value);
        const submitbutton = document.getElementById('submit-btn');
        const submitButton = document.querySelector(".btn-primary");

        let amountToPay = 0;
        let rate = 0;
        if (gauge >= 4 && gauge <= 14.5 && weight > 0) {
            rate = getRate(gauge) / 1000; // Convert rate to per kg
            amountToPay = rate * weight;
            rateInput.value = (rate * 1000).toFixed(0); // Set the rate based on gauge, rounded to integer
            amountToPayInput.value = amountToPay.toFixed(2); // Display amount to 2 decimal places
            submitbutton.disabled = false; // Enable submit button if inputs are valid
            document.getElementById('bull-block-error').innerText = ''; // Clear any previous
            submitButton.classList.remove("invalid-input"); // Restore original color
        } else {
           document.getElementById('bull-block-error').innerText = 'Gauge must be between 4 and 14.5 and Weight must be greater than 0';
            amountToPayInput.value = '';
            submitbutton.disabled = true; // Disable submit button if inputs are invalid
            submitButton.classList.add("invalid-input"); // Fade the button
        }
    }    
    gaugeInput.addEventListener('input', calculateAmountToPay) ;
    weightInput.addEventListener('input', calculateAmountToPay);

    /**
     * Retrieves the appropriate rate based on the gauge value from localStorage.
     * If rates are not found in localStorage, default values are used.
     * @param {number} gauge - The gauge value.
     * @returns {number} The rate per ton (1000kg).
     */
    function getRate(gauge){
        let rates = {
            rate_4_to_12_5: 350,
            rate_13_to_13_5: 500,
            rate_14_to_14_5: 600
        };

        const storedRates = localStorage.getItem('bullBlockRates');
        if (storedRates) {
            try {
                rates = JSON.parse(storedRates);
            } catch (e) {
                console.error("Error parsing bullBlockRates from localStorage:", e);
                // Fallback to default rates if parsing fails
            }
        }

        if (gauge >= 4 && gauge <= 12.5) {
            return rates.rate_4_to_12_5;
        } else if (gauge >= 13 && gauge <= 13.5) {
            return rates.rate_13_to_13_5;
        } else if (gauge >= 14 && gauge <= 14.5) {
            return rates.rate_14_to_14_5;
        } else {
            return 0; // Default rate if gauge is out of range
        }
    }

    // --- DOM Elements for Rate Change Tab ---
    const rateChangeForm = document.getElementById('rate-change-form');
    const rate4To12_5Input = document.getElementById('rate_4_to_12_5');
    const rate13To13_5Input = document.getElementById('rate_13_to_13_5');
    const rate14To14_5Input = document.getElementById('rate_14_to_14_5');

    /**
     * Loads rates from localStorage and populates the input fields in the rate change tab.
     */
    function loadRates() {
        let rates = {
            rate_4_to_12_5: 350, // Default values
            rate_13_to_13_5: 500,
            rate_14_to_14_5: 600
        };

        const storedRates = localStorage.getItem('bullBlockRates');
        if (storedRates) {
            try {
                rates = JSON.parse(storedRates);
            } catch (e) {
                console.error("Error parsing bullBlockRates from localStorage:", e);
            }
        } else {
            // If no rates exist in localStorage, save the default ones
            localStorage.setItem('bullBlockRates', JSON.stringify(rates));
        }

        // Populate the input fields with the loaded rates
        if (rate4To12_5Input) rate4To12_5Input.value = rates.rate_4_to_12_5;
        if (rate13To13_5Input) rate13To13_5Input.value = rates.rate_13_to_13_5;
        if (rate14To14_5Input) rate14To14_5Input.value = rates.rate_14_to_14_5;
    }

    /**
     * Saves the current rates from the input fields to localStorage.
     */
    function saveRates() {
        const ratesData = {
            rate_4_to_12_5: parseFloat(rate4To12_5Input.value) || 0,
            rate_13_to_13_5: parseFloat(rate13To13_5Input.value) || 0,
            rate_14_to_14_5: parseFloat(rate14To14_5Input.value) || 0,
        };
        localStorage.setItem('bullBlockRates', JSON.stringify(ratesData));
        console.log('Rates saved to localStorage:', ratesData);
    }

    // --- Event Listeners for Rate Change Tab ---
    if (rateChangeForm) {
        // Listen for changes on any input field within the rate change form
        rateChangeForm.addEventListener('submit', saveRates);
    }

    // --- Initial Load of Rates when the page is ready ---
    // Load rates initially when the page loads, in case the 'rate-change' tab is active by default
    const rateChangeTabContent = document.getElementById('rate-change');
    if (rateChangeTabContent && rateChangeTabContent.classList.contains('active')) {
        loadRates();
    }


    //function to insert data into bullblock table
    const bullBlockForm = document.getElementById('bull-block-form');

    bullBlockForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent the default form submission
        
        const employee = document.getElementById('employee').value;
        const workDate = document.getElementById('work-date').value;
        const gauge = parseFloat(document.getElementById('gauge').value) || 0;
        const weight = parseFloat(document.getElementById('weight').value) || 0;
        const rate = parseFloat(document.getElementById('rate').value) || 0;
        const amountToPay = parseFloat(document.getElementById('amount-to-pay').value) || 0;
        const remarks = document.getElementById('remarks').value;
        const no_of_coils = document.getElementById('no-of-coils').value;
        const paidBy = document.getElementById('paid-by').value;
        const shift = document.getElementById('shift').value;
        const payment_date = document.getElementById('payment-date').value;

        console.log('Bull block form submitted with data bull block .js:'+ workDate,employee,gauge,weight,rate, amountToPay, no_of_coils);

         if (!validatePaidByAndDate(paidBy, payment_date)) return;

        // Prepare data to send to main process
        const mainTable = 'bullblock_payments';
      //  const junctionTable = 'driver_employees';
        const mainTableColumns = ['work_date','employee_id','gauge','weight','rate','amount_to_pay','no_of_coils','paid_by','shift'];
        const data = {
            work_date: workDate,
            employee_id: employee, // Assuming employee is a select element with value as employee ID
            gauge: gauge,
            weight: weight,
            rate: rate,
            amount_to_pay: amountToPay,
            no_of_coils:no_of_coils,
            paid_by : paidBy,
            shift : shift,
            remarks:remarks,
            payment_date:payment_date
        };

        try {
            let response;
            if (isEditMode) {
                // Add bbId to the data for editing
               // bullBlockData.bbId = currentBbId;
               // response = await window.electronAPI.updateBullBlockRecord(bullBlockData);
                const mainIdColumn = 'bullblock_id';
                response = await window.electronAPI.updateRecord({mainTable,mainIdColumn,id:currentBbId,data});
            } else {
                response = await window.electronAPI.insertRecord({mainTable,mainTableColumns,data});
               // response = await window.electronAPI.addBullBlock(bullBlockData);
            }
            console.log('bullblock response:', response);
            if (response) {
                showMessageBox(
                isEditMode ? 'bullblock record updated successfully!' : ' Bullblock payment recorded successfully!','Success');
                bullBlockForm.reset();
                isEditMode = false; // Reset edit mode
                currentBbId = null; // Clear current bullblock ID
                document.getElementById('bull-block-form').querySelector('button[type="submit"]').textContent = 'Submit';
                document.getElementById('cancel-edit-btn').style.display = 'none';
                document.getElementById('work-date').value = new Date().toISOString().split('T')[0]; // Reset work date to today
                loadBullBlockRecords(); // Refresh records after adding a new one
                loadBullBlockEmployees(); // Reload employees in case of any changes
            } 
        } catch (error) {
            console.error('Error adding bull block record:', error);
            showMessageBox(`Error adding bull block record: ${error.message}`);
        }
    });

    const filterStartDateInput = document.getElementById('filter-start-date');
    const filterEndDateInput = document.getElementById('filter-end-date');

    filterStartDateInput.addEventListener('change', loadBullBlockRecords);
    filterEndDateInput.addEventListener('change', loadBullBlockRecords);
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

    // Function to load bull block records
    async function loadBullBlockRecords() {

        try {
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            if (!startDate || !endDate) {
                showMessageBox('Please select a valid date range to filter records.', 'error');
                return;
            }
            // const records = await window.electronAPI.getBullBlockRecords(startDate, endDate);
            // console.log('Loaded Bull Block Records:', records);

             const mainTable = 'bullblock_payments',mainAlias = 'bb', idColumn = 'bullblock_id' ,dateColumn = 'work_date';
            // const junctionTable = 'driver_employees' , junctionAlias = 'dre' ,junctionMainId = 'dr_id';
             const groupEmployees = 1;

            const records = await window.electronAPI.getRecords({mainTable,mainAlias,idColumn,dateColumn,groupEmployees},
                startDate, endDate);
            
            // Clear existing records in the table
            const tbody = document.querySelector('#records-table tbody');
            tbody.innerHTML = ''; // Clear existing rows
            
            // Populate the table with new records
            records.forEach((record , index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        ${index + 1}
                        <button class="expand-record-btn"><i class="fas fa-chevron-down"></i></button>
                    </td>
                    <td>${formatDate(record.work_date)}</td>
                    <td>${record.employee_nicknames}</td>
                    <td>${record.shift}</td>
                    <td>${record.gauge}</td>
                    <td>${record.weight}</td>
                    <td>${record.rate}</td>
                    <td>${record.amount_to_pay}</td>
                    <td>${record.paid_by}</td>
                    <td>
                        <button class="btn btn-danger delete-btn" data-id="${record.bullblock_id}"><i class="fas fa-close"></i></button>
                        <button class="edit-btn" data-id="${record.bullblock_id}"><i class="fas fa-edit"></i></button>
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
                    const bullblock_id = this.getAttribute('data-id');
                    console.log('Delete button clicked for bullblock ID:', bullblock_id);
                    deleteBullBlockRecord(bullblock_id);
                });
            });            
            
            document.querySelectorAll(".edit-btn").forEach(btn =>{
                btn.addEventListener('click', function() {
                    const bbId = this.getAttribute('data-id');
                    console.log('Edit button clicked for bullblock id:', bbId);
                    editBullBlockRecord(bbId);
                });
            });
            
            // Update totals
            updateTotals(records); 

        } catch (error) {
            console.error('Error loading bull block records:', error);
            showMessageBox(`Error loading bull block records: ${error.message}`);
        }

         // Function to update totals based on the currently displayed records
    function updateTotals(records) { // Removed weekStart, year, month from parameters
        document.getElementById('record-count').textContent = records.length;
        const totalAmount = records.reduce((sum, record) => sum + (record.amount_to_pay || 0), 0);
        document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
    }

    const search = document.getElementById('item-search');
    search.addEventListener('input',function(){
       
        searchItem('item-search' , '#records-table tbody tr' , 7)
    });

    function deleteBullBlockRecord(bullblock_id) {
        showConfirmBox('Are you sure you want to delete this Bull block record?' , async (confirmed) => {
            console.log('BullBlock record delete confirmation:', confirmed, bullblock_id);
            if (confirmed) {
                try {
                    // This still assumes window.electronAPI.deleteBullBlockRecord for database interaction
                   // const result = await window.electronAPI.deleteBullBlockRecord(bullblock_id);
                    const mainTable = 'bullblock_payments' , mainIdColumn = 'bullblock_id', id = bullblock_id;
                    const result = await window.electronAPI.deleteRecord({mainTable,mainIdColumn,id});
                    console.log('bullblock record delete result:', result);
                    if (result > 0) {
                        console.log('bullblock record deleted:', result);
                        showMessageBox('BullBlock record deleted successfully!');
                        loadBullBlockRecords(); // Refresh records after deletion
                    }
                    else {
                        console.error('BullBlock record not found or already deleted:', result);
                        showMessageBox('BullBlock record not found or already deleted.');
                    }
                    
                } catch (error) {
                    console.error('Error deleting BullBlock record:', error);
                    showMessageBox(`Error deleting BullBlock record: ${error.message}`);
                }
            }
        });
    }

    
    }

    const exportExcelBtn = document.getElementById('export-excel-btn');
    exportExcelBtn.addEventListener('click', () => {
        exportTableToExcel('records-table', 'Bullblock Records', 'bullblock_records');
    });    

    // Event listener for the new Export to PDF button
            const exportPdfBtn = document.getElementById('export-pdf-btn');
            exportPdfBtn.addEventListener('click', () => {
                exportTableToPdf('records-table', 'Bullblock_records', 'bullblock Records', 'total-amount');
            });

     document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        bullBlockForm.reset();
        isEditMode = false;
        currentBbId = null;
        document.getElementById('bull-block-form').querySelector('button[type="submit"]').textContent = 'Submit';
        document.getElementById('cancel-edit-btn').style.display = 'none';
        loadBullBlockEmployees();
    });

    async function editBullBlockRecord(bbId) {
        try {
            // Fetch the overtime record with associated employee IDs
            const record = await window.electronAPI.getRecordById(bbId,'bullblock_payments','bullblock_id');

            if (!record) {
                showMessageBox('bull block record not found.', 'Error');
                return;
            }

            //const { record} = result;

            // Switch to the Overtime Payments tab
            const bbTabBtn = document.querySelector('.tab-btn[data-tab="bull-block"]');
            bbTabBtn.click();

            // Set edit mode
            isEditMode = true;
            currentBbId = bbId;

            console.log('Editing bull block record:', record);

           await loadBullBlockEmployees(); // Ensure employees are loaded before setting values

           // document.getElementById('employee').value = record.employee_id;
            document.getElementById('employee').value = record.employee_id;
            document.getElementById('work-date').value = record.work_date;
            gaugeInput.value = record.gauge;
            weightInput.value = record.weight;
            rateInput.value = record.rate;
            document.getElementById('amount-to-pay').value = record.amount_to_pay;
            document.getElementById('shift').value = record.shift;
            document.getElementById('remarks').value = record.remarks;
            document.getElementById('no-of-coils').value = record.no_of_coils;
            document.getElementById('paid-by').value = record.paid_by;
            document.getElementById('payment-date').value = record.payment_date;
            document.getElementById('cancel-edit-btn').style.display = 'inline-block';

            // Update the submit button text
            document.getElementById('bull-block-form').querySelector('button[type="submit"]').textContent = 'Update';
        } catch (error) {
            console.error('Error loading bull block record for editing:', error);
            showMessageBox('Failed to load bull block record for editing.', 'Error');
        }
    }        

    // Load initial records when the page is ready
    setDefaultFilterDates(); // Set default filter dates
    loadBullBlockRecords();
    loadItems('paid-by','Manager');
    loadBullBlockEmployees(); // Load employees for the dropdown

    // Initial load of rates if the 'rate-change' tab is the default active tab
    // This is already handled by the tabBtns.forEach listener and the DOMContentLoaded check above.

});
