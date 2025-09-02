import { loadItems, showConfirmBox,showMessageBox,formatDate,
    exportTableToExcel,exportTableToPdf,searchItem,validatePaidByAndDate } from "./utils.js";
document.addEventListener("DOMContentLoaded" , function(){

    let isEditMode = false;
    let currentMiscId = null;

    function setDate(){
        const workDate = new Date().toISOString().split('T')[0];
        document.getElementById('work-date').value = workDate;
    }

    async function loadAllEmployees(){
        loadItems('employee' , '');
    }

    async function loadManagerEmployees(){
        loadItems('paid-by' , 'manager');
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

               
                if (tabId === 'view-records') {
                    console.log('Switching to View Records tab');
                    loadRecords(); // Refresh unpaid employees for attendance tab
                   
                } 
            }
        });
    });

    const miscPaymentForm = document.getElementById('misc-payments-form');
    miscPaymentForm.addEventListener('submit',async function(event){
        event.preventDefault();


        const workDate = document.getElementById('work-date').value;
        const employee = document.getElementById('employee').value;
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount-to-pay').value);
        const paidBy = document.getElementById('paid-by').value;
        const payment_date = document.getElementById('payment-date').value;

        if (!validatePaidByAndDate(paidBy, payment_date)) return;

      //  const data = {workDate,employee,description,amount,paidBy};
        //console.log(data);

        const mainTable = 'misc_payments';
      //  const junctionTable = 'driver_employees';
        const mainTableColumns = ['work_date','employee_id','description','amount','paid_by','payment_date'];
        const data = {
            work_date: workDate,
            employee_id: employee,
            description: description,
            amount: amount,
            paid_by: paidBy ,
            payment_date        
        }
        // const junctionRefColumn = 'misc_id', junctionFkColumn = 'eid';
        // const junctionFkValues = selectedEmployeeIds;
       // console.log(data);


        let response;
        try{
            if(isEditMode){
                const mainIdColumn = 'misc_id';
                response = await window.electronAPI.updateRecord({mainTable,mainIdColumn,id:currentMiscId,data});
            }else{
                response = await window.electronAPI.insertRecord({mainTable,mainTableColumns,data});
            }
            console.log(response);
            if (response) {
                showMessageBox(
                isEditMode ? 'Miscellenous record updated successfully!' : 'Miscellenous payment recorded successfully!','Success');
                miscPaymentForm.reset();
                isEditMode = false; // Reset edit mode
                currentMiscId = null; // Clear current misc ID
                miscPaymentForm.querySelector('button[type="submit"]').textContent = 'Submit';
                document.getElementById('cancel-edit-btn').style.display = 'none';
                setDate();
               // loadAllEmployees();
              //  loadMiscRecords();
            } 
                
        } catch (error) {
            console.error('Error adding Misc record:', error);
            showMessageBox(`Failed to ${isEditMode ? 'update' : 'record'} Miscellaneous payment. Error:${error.message}`, 'Error');
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
        try{
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            if (!startDate || !endDate) {
                showMessageBox('Please select a valid date range to filter records.', 'error');
                return;
            }
            const mainTable = 'misc_payments',mainAlias = 'mp', idColumn = 'misc_id' ,dateColumn = 'work_date';
            // const junctionTable = 'driver_employees' , junctionAlias = 'dre' ,junctionMainId = 'dr_id';
             const groupEmployees = 1;

            const records = await window.electronAPI.getRecords({mainTable,mainAlias,idColumn,dateColumn,groupEmployees},
                startDate, endDate);
           // const records = await window.electronAPI.getMiscRecords(startDate,endDate);
            const tbody = document.querySelector('#records-table tbody');
            tbody.innerHTML = '';
            records.forEach((record, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        ${index + 1}
                        <button class="expand-record-btn"><i class="fas fa-chevron-down"></i></button>
                    </td>
                    <td>${formatDate(record.work_date)}</td>
                    <td>${record.employee_nicknames}</td>
                    <td>${record.description}</td>
                    <td>${record.amount}</td>
                    <td>${record.paid_by}</td>
                    <td>
                    <button class="delete-btn" data-id="${record.misc_id}"><i class="fa fa-close"></i></button>
                    <button class="edit-btn" data-id="${record.misc_id}"><i class="fas fa-edit"></i></button>
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
                    const miscId = this.getAttribute('data-id');
                    console.log('Delete button clicked for misc ID:', miscId);
                    deleteMiscRecord(miscId);
                });
            });

            
            document.querySelectorAll(".edit-btn").forEach(btn =>{
                btn.addEventListener('click', function() {
                    const miscId = this.getAttribute('data-id');
                    console.log('Edit button clicked for misc id:', miscId);
                    editMiscRecord(miscId);
                });
            });
            
            // Update totals
            updateTotals(records); // No longer passing weekStart, year, month to updateTotals
        } catch (error) {
            console.error('Error loading records:', error);
        }
            
    }

     //event listener for search box
    document.getElementById('employee-search').addEventListener('input', function(){
       // console.log('event listener activated');
        searchItem('employee-search','#records-table tbody tr',4);//search box id , quary of where data will be search,total amount cell no in table
    }); 
  

     // Function to update totals based on the currently displayed records
    function updateTotals(records) { // Removed weekStart, year, month from parameters
        document.getElementById('record-count').textContent = records.length;
        const totalAmount = records.reduce((sum, record) => sum + (record.amount || 0), 0);
        document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
    }

    function deleteMiscRecord(miscId) {
            showConfirmBox('Are you sure you want to delete this misc record?' , async (confirmed) => {
                console.log('Misc record delete confirmation:', confirmed, miscId);
                if (confirmed) {
                    try {

                        const mainTable = 'misc_payments' , mainIdColumn = 'misc_id', id = miscId;
                    //const junctionTable = 'driver_employees' , junctionRefColumn = 'dr_id';
                       // const result = await window.electronAPI.deleteMiscRecord(miscId);
                        const result = await window.electronAPI.deleteRecord({mainTable,mainIdColumn,id});
                        console.log('Misc record delete result:', result);
                        if (result > 0) {
                            console.log('Misc record deleted:', result);
                            showMessageBox('Misc record deleted successfully!');
                            loadRecords(); // Refresh records after deletion
                            //loadEmployees();
                        }
                        else {
                            console.error('Misc record not found or already deleted:', result);
                            showMessageBox('Misc record not found or already deleted.');
                        }
                        
                    } catch (error) {
                        console.error('Error deleting Misc record:', error);
                        showMessageBox(`Error deleting Misc record: ${error.message}`);
                    }
                }
            });
        }
        
    const exportExcelBtn = document.getElementById('export-excel-btn');
    exportExcelBtn.addEventListener('click', () => {
        exportTableToExcel('records-table', 'Miscellaneous Records', 'misc_records');
    });    

    // Event listener for the new Export to PDF button
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    exportPdfBtn.addEventListener('click', () => {
            exportTableToPdf('records-table', 'misc_records', 'Miscellanous Records', 'total-amount');
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        miscPaymentForm.reset();
        isEditMode = false;
        currentPkId = null;
        document.getElementById('misc-payments-form').querySelector('button[type="submit"]').textContent = 'Submit';
        document.getElementById('cancel-edit-btn').style.display = 'none';
       // loadEmployees();
    });


    async function editMiscRecord(miscId) {
        try {
            // Fetch the overtime record with associated employee IDs
            const record = await window.electronAPI.getRecordById(miscId,'misc_payments','misc_id');

            if (!record) {
                showMessageBox('misc record not found.', 'Error');
                return;
            }

            //const { record} = result;

            // Switch to the Overtime Payments tab
            const miscTabBtn = document.querySelector('.tab-btn[data-tab="misc-payments"]');
            miscTabBtn.click();

            // Set edit mode
            isEditMode = true;
            currentMiscId = miscId;

            document.getElementById('employee').value = record.employee_id;
            document.getElementById('work-date').value = record.work_date;
            document.getElementById('amount-to-pay').value = record.amount;
            document.getElementById('description').value = record.description;
            document.getElementById('paid-by').value = record.paid_by;
            document.getElementById('payment-date').value = record.payment_date;


            document.getElementById('cancel-edit-btn').style.display = 'inline-block';

            // Update the submit button text
            document.getElementById('misc-payments-form').querySelector('button[type="submit"]').textContent = 'Update';
        } catch (error) {
            console.error('Error loading misc record for editing:', error);
            showMessageBox('Failed to load misc record for editing.', 'Error');
        }
    }


    loadAllEmployees();
    loadManagerEmployees();
    setDefaultFilterDates();
    setDate();

});

