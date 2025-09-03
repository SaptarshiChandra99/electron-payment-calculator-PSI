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
                    loadRecords(); // Load records for the View Records tab
                   
                } 
                else if (tabId === 'draw-machine') {
                    console.log('Switching to Add Record tab in bull block');
                    loadEmployees(); // Load employees for the Add Record tab
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

   async function loadEmployees() {
    try {
        await loadItems('employee', 'draw machine');
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
        if (gauge >= 18 && gauge <= 23 && weight > 0) {
            rate = getRate(gauge) / 1000; // Convert rate to per kg
            amountToPay = Math.round(rate * weight);
            rateInput.value = (rate * 1000).toFixed(0); // Set the rate based on gauge, rounded to integer
            amountToPayInput.value = amountToPay.toFixed(2); // Display amount to 2 decimal places
            submitbutton.disabled = false; // Enable submit button if inputs are valid
            document.getElementById('draw-machine-error').innerText = ''; // Clear any previous
            submitButton.classList.remove("invalid-input"); // Restore original color
        } else {
           document.getElementById('draw-machine-error').innerText = 'Gauge must be between 18 and 23 and Weight must be greater than 0';
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
            rate_18_to_19_5: 700,
            rate_20_to_21_5: 900,
            rate_22: 1100,
            rate_22_5: 1300,
            rate_23: 1400
        };

        const storedRates = localStorage.getItem('drawMachineRates');
        if (storedRates) {
            try {
                rates = JSON.parse(storedRates);
            } catch (e) {
                console.error("Error parsing drawMachine from localStorage:", e);
                // Fallback to default rates if parsing fails
            }
        }

        if (gauge >= 18 && gauge <= 19.5) {
            return rates.rate_18_to_19_5;
        } else if (gauge >= 20 && gauge <= 21.5) {
            return rates.rate_20_to_21_5;
        } else if (gauge >= 22 && gauge <= 22.4) {
            return rates.rate_22;
        }else if (gauge >= 22.5 && gauge <= 22.9) {
            return rates.rate_22_5;
        }
        else if (gauge >= 23 && gauge <= 23.5) {
            return rates.rate_23;
        } else {
            return 0; // Default rate if gauge is out of range
        }
    }

    // --- DOM Elements for Rate Change Tab ---
    const rateChangeForm = document.getElementById('rate-change-form');
    const rate18To19_5Input = document.getElementById('rate_18_to_19_5');
    const rate20To21_5Input = document.getElementById('rate_20_to_21_5');
    const rate22Input = document.getElementById('rate_22');
    const rate22_5Input = document.getElementById('rate_22_5');
    const rate23Input = document.getElementById('rate_23');

    /**
     * Loads rates from localStorage and populates the input fields in the rate change tab.
     */
    function loadRates() {
         let rates = {
            rate_18_to_19_5: 700,
            rate_20_to_21_5: 900,
            rate_22: 1100,
            rate_22_5: 1300,
            rate_23: 1400
        };

        const storedRates = localStorage.getItem('drawMachineRates');
        if (storedRates) {
            try {
                rates = JSON.parse(storedRates);
            } catch (e) {
                console.error("Error parsing drawMachineRates from localStorage:", e);
            }
        } else {
            // If no rates exist in localStorage, save the default ones
            localStorage.setItem('drawMachineRates', JSON.stringify(rates));
        }

        // Populate the input fields with the loaded rates
        
        if(rate18To19_5Input)   rate18To19_5Input.value = rate_18_to_19_5;
        if(rate20To21_5Input) rate20To21_5Input.value = rate_20_to_21_5;
        if(rate22Input) rate22Input.value = rate_22;
        if(rate22_5Input) rate22_5Input.value = rate_22_5;
        if(rate23Input) rate23Input.value = rate_23;
    }

    /**
     * Saves the current rates from the input fields to localStorage.
     */
    function saveRates() {
        const ratesData = {
        
            rate_18_to_19_5: parseFloat(rate18To19_5Input .value) || 0,
            rate_20_to_21_5: parseFloat(rate20To21_5Input.value) || 0,
            rate_22: parseFloat(rate22Input.value) || 0,
            rate_22_5: parseFloat(rate22_5Input.value) || 0,
            rate_23: parseFloat(rate23Input.value) || 0,
        };
        localStorage.setItem('drawMachineRates', JSON.stringify(ratesData));
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
    const bullBlockForm = document.getElementById('draw-machine-form');

    bullBlockForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent the default form submission
        
        const employee = document.getElementById('employee').value;
        const workDate = document.getElementById('work-date').value;
        const gauge = parseFloat(document.getElementById('gauge').value) || 0;
        const weight = parseFloat(document.getElementById('weight').value) || 0;
        const machine_no = document.getElementById('machine-no').value;
        const rate = parseFloat(document.getElementById('rate').value) || 0;
        const amountToPay = parseFloat(document.getElementById('amount-to-pay').value) || 0;
        const remarks = document.getElementById('remarks').value;
        const no_of_coils = parseInt(document.getElementById('no-of-coils').value);
        const paidBy = document.getElementById('paid-by').value;
        const shift = document.getElementById('shift').value;
        const payment_date = document.getElementById('payment-date').value;

        console.log('Bull block form submitted with data bull block .js:'+ workDate,employee,gauge,weight,rate, amountToPay, no_of_coils);

         if (!validatePaidByAndDate(paidBy, payment_date)) return;

        // Prepare data to send to main process
        const mainTable = 'draw_machine_payments';
      //  const junctionTable = 'driver_employees';
        const mainTableColumns = ['work_date','employee_id','gauge','weight','rate','amount_to_pay','no_of_coils','paid_by','shift','machine_no','remarks'];
        const data = {
            work_date: workDate,
            employee_id: employee, // Assuming employee is a select element with value as employee ID
            gauge: gauge,
            weight: weight,
            rate: rate,
            amount_to_pay: amountToPay,
            no_of_coils:no_of_coils,
            machine_no,
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
                console.log(data);
                response = await window.electronAPI.updateRecord({mainTable,mainIdColumn,id:currentBbId,data});
            } else {
                response = await window.electronAPI.insertRecord({mainTable,mainTableColumns,data});
               // response = await window.electronAPI.addBullBlock(bullBlockData);
            }
            console.log('bullblock response:', response);
            if (response) {
                showMessageBox(
                isEditMode ? 'Draw Machine record updated successfully!' : ' Draw Machine payment recorded successfully!','Success');
                bullBlockForm.reset();
                isEditMode = false; // Reset edit mode
                currentBbId = null; // Clear current bullblock ID
                document.getElementById('draw-machine-form').querySelector('button[type="submit"]').textContent = 'Submit';
                document.getElementById('cancel-edit-btn').style.display = 'none';
                document.getElementById('work-date').value =workDate; // Reset work date to today
                loadRecords(); // Refresh records after adding a new one
                loadEmployees(); // Reload employees in case of any changes
            } 
        } catch (error) {
            console.error('Error adding bull block record:', error);
            showMessageBox(`Error adding bull block record: ${error.message}`);
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

    // Function to load bull block records
    async function loadRecords() {

        try {
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            if (!startDate || !endDate) {
                showMessageBox('Please select a valid date range to filter records.', 'error');
                return;
            }
            // const records = await window.electronAPI.getBullBlockRecords(startDate, endDate);
            // console.log('Loaded Bull Block Records:', records);

             const mainTable = 'draw_machine_payments',mainAlias = 'bb', idColumn = 'bullblock_id' ,dateColumn = 'work_date';
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
                    <td>${record.machine_no}</td>
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
                    const mainTable = 'draw_machine_payments' , mainIdColumn = 'bullblock_id', id = bullblock_id;
                    const result = await window.electronAPI.deleteRecord({mainTable,mainIdColumn,id});
                    console.log('bullblock record delete result:', result);
                    if (result > 0) {
                        console.log('bullblock record deleted:', result);
                        showMessageBox('BullBlock record deleted successfully!');
                        loadRecords(); // Refresh records after deletion
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

    // Event listener for the Matrix PDF export button
    const exportMatrixPdfBtn = document.getElementById('export-matrix-pdf-btn');
    if (exportMatrixPdfBtn) {
        exportMatrixPdfBtn.addEventListener('click', exportMatrixToPdf);
    }

    const exportExcelBtn = document.getElementById('export-excel-btn');
    exportExcelBtn.addEventListener('click', () => {
        exportTableToExcel('records-table', 'Draw Machine Records', 'bullblock_records');
    });    

    // Event listener for the new Export to PDF button
            const exportPdfBtn = document.getElementById('export-pdf-btn');
            exportPdfBtn.addEventListener('click', () => {
                exportTableToPdf('records-table', 'draw_machine_records', 'Draw Machine Records', 'total-amount');
            });

     document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        bullBlockForm.reset();
        isEditMode = false;
        currentBbId = null;
        document.getElementById('draw-machine-form').querySelector('button[type="submit"]').textContent = 'Submit';
        document.getElementById('cancel-edit-btn').style.display = 'none';
        loadEmployees();
    });

    async function editBullBlockRecord(bbId) {
        try {
            // Fetch the overtime record with associated employee IDs
            const record = await window.electronAPI.getRecordById(bbId,'draw_machine_payments','bullblock_id');

            if (!record) {
                showMessageBox('bull block record not found.', 'Error');
                return;
            }

            //const { record} = result;

            // Switch to the Overtime Payments tab
            const bbTabBtn = document.querySelector('.tab-btn[data-tab="draw-machine"]');
            bbTabBtn.click();

            // Set edit mode
            isEditMode = true;
            currentBbId = bbId;

            console.log('Editing bull block record:', record);

           await loadEmployees(); // Ensure employees are loaded before setting values

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
            document.getElementById('machine-no').value = record.machine_no;
            document.getElementById('cancel-edit-btn').style.display = 'inline-block';

            // Update the submit button text
            document.getElementById('draw-machine-form').querySelector('button[type="submit"]').textContent = 'Update';
        } catch (error) {
            console.error('Error loading bull block record for editing:', error);
            showMessageBox('Failed to load bull block record for editing.', 'Error');
        }
    }        

    /**
     * Exports draw machine records to PDF in matrix format
     * Rows: Dates, Columns: Employees + Total
     */
    async function exportMatrixToPdf() {
        try {
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            
            if (!startDate || !endDate) {
                showMessageBox('Please select a valid date range to generate PDF.', 'Error');
                return;
            }

            // Get records using the same method as loadRecords()
            const mainTable = 'draw_machine_payments';
            const mainAlias = 'bb';
            const idColumn = 'bullblock_id';
            const dateColumn = 'work_date';
            const groupEmployees = 1;

            const records = await window.electronAPI.getRecords(
                {mainTable, mainAlias, idColumn, dateColumn, groupEmployees},
                startDate, 
                endDate
            );

            if (!records || records.length === 0) {
                showMessageBox('No records found for the selected date range.', 'Info');
                return;
            }

            // Process data for matrix format
            const matrixData = processRecordsForMatrix(records);
            
            // Generate PDF
            generateMatrixPdf(matrixData, startDate, endDate);

        } catch (error) {
            console.error('Error exporting matrix PDF:', error);
            showMessageBox(`Error generating PDF: ${error.message}`, 'Error');
        }
    }

    /**
     * Process records into matrix format
     * @param {Array} records - Raw records from database
     * @returns {Object} Processed matrix data
     */
    function processRecordsForMatrix(records) {
        const matrix = {};
        const employees = new Set();
        const dates = new Set();

        // Group records by date and employee
        records.forEach(record => {
            const date = record.work_date;
            const employeeNames = record.employee_nicknames;
            
            dates.add(date);
            
            // Split employee names if multiple
            const employeeList = employeeNames.split(', ');
            employeeList.forEach(emp => employees.add(emp.trim()));

            if (!matrix[date]) {
                matrix[date] = {};
            }

            employeeList.forEach(emp => {
                const empName = emp.trim();
                if (!matrix[date][empName]) {
                    matrix[date][empName] = [];
                }

                matrix[date][empName].push({
                    gauge: record.gauge,
                    weight: record.weight,
                    amount: record.amount_to_pay,
                    shift: record.shift
                });
            });
        });

        // Sort dates and employees
        const sortedDates = Array.from(dates).sort();
        const sortedEmployees = Array.from(employees).sort();

        return {
            matrix,
            dates: sortedDates,
            employees: sortedEmployees
        };
    }

/**
 * Generate PDF with matrix layout
 */
    function generateMatrixPdf(matrixData, startDate, endDate) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const { matrix, dates, employees } = matrixData;
        
        // PDF setup
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const startY = 30;
        
        // Title
        doc.setFontSize(16);
        doc.text('Draw Machine Production Matrix Report', pageWidth / 2, 15, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, pageWidth / 2, 25, { align: 'center' });

        // Calculate column widths
        const totalWidth = pageWidth - 2 * margin;
        const dateColWidth = 25;
        const totalColWidth = 25;
        const empColWidth = (totalWidth - dateColWidth - totalColWidth) / employees.length;
        
        // Prepare table data
        const headers = ['Date', ...employees, 'Total'];
        const tableData = [];

        dates.forEach(date => {
            const row = [formatDate(date)];
            let dateTotal = 0;

            employees.forEach(emp => {
                const empRecords = matrix[date] && matrix[date][emp] ? matrix[date][emp] : [];
                
                if (empRecords.length === 0) {
                    row.push('-- N/A--');
                } else {
                    let cellContent = '';
                    let empTotal = 0;
                    
                    empRecords.forEach((record, index) => {
                        const recordText = `${record.gauge}/ ${record.weight}=${record.amount}`;
                        cellContent += (index > 0 ? '\n' : '') + recordText;
                        empTotal += parseFloat(record.amount);
                    });
                    
                    // Add shift info if multiple shifts exist
                    const shifts = [...new Set(empRecords.map(r => r.shift))];
                    if (shifts.length > 1) {
                        cellContent += `\n(${shifts.join(', ')})`;
                    }
                    
                    cellContent += '\nT: ' + empTotal.toFixed(2) ;
                    row.push(cellContent);
                    dateTotal += empTotal;
                }
            });

            row.push(`${dateTotal.toFixed(2)}`);
            tableData.push(row);
        });

        // Add overall totals row
        const totalRow = ['TOTAL'];
        let grandTotal = 0;

        employees.forEach(emp => {
            let empGrandTotal = 0;
            dates.forEach(date => {
                const empRecords = matrix[date] && matrix[date][emp] ? matrix[date][emp] : [];
                empRecords.forEach(record => {
                    empGrandTotal += parseFloat(record.amount);
                });
            });
            totalRow.push(empGrandTotal > 0 ? (empGrandTotal.toFixed(2)) : '-');
            grandTotal += empGrandTotal;
        });
        totalRow.push(grandTotal.toFixed(2));
        tableData.push(totalRow);

        // Use autoTable for better formatting
        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: startY,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak',
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [255,255, 255],
                textColor: 0,
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: dateColWidth, halign: 'center' },
                [employees.length + 1]: { cellWidth: totalColWidth, halign: 'center', fontStyle: 'bold' }
            },
            bodyStyles: {
                valign: 'top',
                textColor: 0,
                halign: 'center',
                fontSize: 9
            },
            
            didParseCell: function(data) {
                if (data.row.index === tableData.length - 1) {
                    data.cell.styles.fillColor = [255, 255, 255];
                    data.cell.styles.textColor = 0;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setPage(pageCount);
        doc.setFontSize(8);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, pageHeight - 5);
        doc.text(`Total Records: ${Object.values(matrix).reduce((total, dateData) => 
            total + Object.values(dateData).reduce((dateTotal, empRecords) => 
                dateTotal + empRecords.length, 0), 0)}`, pageWidth - margin - 50, pageHeight - 5);

        // Save the PDF
        const fileName = `draw_machine_matrix_${startDate}_to_${endDate}.pdf`;
        doc.save(fileName);
        
        showMessageBox('Matrix PDF exported successfully!', 'Success');
    }

    // Load initial records when the page is ready
    setDefaultFilterDates(); // Set default filter dates
    loadRecords();
    loadItems('paid-by','manager');
    loadEmployees(); // Load employees for the dropdown

    // Initial load of rates if the 'rate-change' tab is the default active tab
    // This is already handled by the tabBtns.forEach listener and the DOMContentLoaded check above.

});
