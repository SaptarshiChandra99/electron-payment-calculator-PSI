import { showMessageBox, showConfirmBox,exportTableToPdf,exportTableToExcel, loadItems } from './utils.js'; // Assuming utils.js contains these functions

document.addEventListener('DOMContentLoaded', function() {
    // --- Custom Message Box Implementation (Replaces alert() and confirm()) ---
    // Make sure these utility functions are available.
    // If your app.js already defines them globally, you might not need to duplicate.
    // However, for modularity, it's safer to have them here or import them.
    // Assuming you have a way to access these, e.g., if app.js is loaded first
    // and exposes them to the window object, or you duplicate them here.
    // For this example, I'm including them for completeness.
    const body = document.body;  
  
  
  // --- Employee Form Submission (Specific to Add Employee page) ---
    const employeeForm = document.getElementById('employee-form');

    if (employeeForm) { // Ensure the form exists before adding listener
        employeeForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const fullname = document.getElementById('fullname').value;
            const nickname = document.getElementById('nickname').value;
            const mobile = document.getElementById('mobile').value;
            const position = document.getElementById('position').value;
            const rate_6 = parseFloat(document.getElementById('rate6').value);
            const rate_7 = parseFloat(document.getElementById('rate7').value);
            const benefits = document.getElementById('benefits').checked;
            const payment_mode = document.getElementById('payment-mode').value;

            console.log('Adding employee:', { fullname, nickname, mobile, position, rate_6, rate_7, benefits,payment_mode });

            // Validate inputs
            if (!fullname || !nickname || !mobile || !position || isNaN(rate_6) || isNaN(rate_7)) {
                showMessageBox('Please fill all required fields with valid data');
                return;
            }

            try {
                const id = await window.electronAPI.addEmployee({
                    fullname,
                    nickname,
                    mobile_no: mobile,
                    position,
                    rate_6,
                    rate_7,
                    has_benefits: benefits,
                    payment_mode
                });
                showMessageBox('Employee added successfully!');
                this.reset(); // Clear the form

                // After adding an employee, you might want to refresh the view-records tab
                // if it were on the same page, or notify the index.html to refresh.
                // For now, since they are separate pages, simply resetting the form is enough.
            } catch (error) {
                console.error('Detailed Error:', error);
                showMessageBox(`Error adding employee: ${error.message || 'Unknown error'}`);
            }
        });
    }

    // --- View Employee Records (Specific to Add Employee page - if you intend to show them here) ---
    // If you plan to have a "View Records" tab directly on add-employee.html for employees,
    // you'll need the following functions. If the "View Records" tab is ONLY on index.html,
    // then these functions should stay/be duplicated there as needed.
    // Based on the new add-employee.html, it seems you do want a "View Records" tab here as well.

    // Employee related filters for view-employee tab on add-employee.html
    const filterPositionDropdown = document.getElementById('filter-position'); 
    const filterNameInput = document.getElementById('filter-name');
    const recordsTableBody = document.querySelector('#view-employee #records-table tbody');
    const recordCountSpan = document.getElementById('record-count');

    async function loadPositions(){
        try{
            const positions = await window.electronAPI.getUniquePositionFromEmployees();
            

                filterPositionDropdown.innerHTML = '<option value="">All Positions</option>';
                positions.forEach(pos =>{
                    const options = document.createElement('option');
                    options.value = pos.position;
                    options.textContent = pos.position;
                    filterPositionDropdown.appendChild(options);
                    console.log('Positions loaded:',pos.position);
                })

              
        }
        catch(error){
            console.error('Error Loading Positions:',error);
            showMessageBox('Error Loading Positions: ' + error.message);
        }

    }

    //Event Listner for filter dropdowns
    filterPositionDropdown.addEventListener('change',loadAllEmployeesForView);
    filterNameInput.addEventListener('input',loadAllEmployeesForView);
   

    // Function to load all employees into the table on the "View Records" tab
    async function loadAllEmployeesForView() {
        try {
            const filterPositionDropdown = document.getElementById('filter-position').value; 
            const filterNameInput = document.getElementById('filter-name').value;
           // console.log('selected name: ',fil)
            const employees = await window.electronAPI.getAllEmployees(filterNameInput , filterPositionDropdown); // Assuming this IPC call exists
            recordsTableBody.innerHTML = ''; // Clear existing rows
            recordCountSpan.textContent = employees.length;
            console.log('Loaded employees:', employees);
            employees.forEach((emp, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                  
                    <td>${emp.nickname}</td>
                    <td>${emp.mobile_no}</td>
                    <td>${emp.position}</td>
                    <td>${emp.rate_6.toFixed(2)}</td>
                    <td>${emp.rate_7.toFixed(2)}</td>
                    <td>${emp.has_benefits ? 'Yes' : 'No'}</td>
                    <td>${emp.is_active ? 'Yes' : 'No'}</td>
                    <td>${emp.payment_mode}</td>
                    <td><button class="delete-btn" data-eid="${emp.eid}">Delete</button></td>
                `;
                recordsTableBody.appendChild(row);
            });

            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const eid = this.getAttribute('data-eid');
                    console.log('Delete button clicked for employee ID:', eid);
                    deleteEmployee(eid);
                });
            });

        } catch (error) {
            console.error('Error loading all employees for view:', error);
            console.error('Error stack:', error.stack);
           
            showMessageBox('Error loading employee records: ' + error.message);
        }
    }

    // Function to delete an employee
    async function deleteEmployee(eid) {
       // console.log('2');
        showConfirmBox('Are you sure you want to delete this employee? This will also delete their attendance records.', async (response) => {
            if (response) {
                try {
                    const changes = await window.electronAPI.deleteEmployee(eid); // Assuming you add this IPC handler
                    if (changes > 0) {
                        showMessageBox('Employee deleted successfully!');
                        loadAllEmployeesForView(); // Refresh the table
                    } else {
                        showMessageBox('Employee not found or could not be deleted.');
                    }
                } catch (error) {
                    console.error('Error deleting employee:', error);
                    showMessageBox('Error deleting employee: ' + error.message);
                }
            }
        });
    }

    // --- Update Employee Tab Functionality ---
    const updateEmployeeDropdown = document.getElementById('update-employee-dropdown');
    const updateEmployeeForm = document.getElementById('update-employee-form');
    const updateFullname = document.getElementById('update-fullname');
    const updateNickname = document.getElementById('update-nickname');
    const updateMobile = document.getElementById('update-mobile');
    const updatePosition = document.getElementById('update-position');
    const updateRate6 = document.getElementById('update-rate6');
    const updateRate7 = document.getElementById('update-rate7');
    const updateBenefits = document.getElementById('update-benefits');
    const updateIsActive = document.getElementById('update-is-active');
    const updatePaymentMode = document.getElementById('update-payment-mode');


    async function loadEmployees(dropdownId ) {
        
        console.log('Loading employees to update:');
        
        try {
            const employees = await window.electronAPI.getAllEmployees();
            const dropdown = document.getElementById(dropdownId);
            dropdown.innerHTML = '<option value="">Select Employee</option>';
            
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.eid;
                option.textContent = `${emp.nickname} (${emp.position})`;
                dropdown.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    // Event listener for employee selection in the update dropdown
    if (updateEmployeeDropdown) {
        updateEmployeeDropdown.addEventListener('change', async function() {
            const selectedEid = this.value;
            if (selectedEid) {
                try {
                    const employee = await window.electronAPI.getEmployeeById(selectedEid); // New IPC call
                    console.log('Selected employee for update:', employee);
                    if (employee) {
                        updateFullname.value = employee.Name;
                        updateNickname.value = employee.nickname;
                        updateMobile.value = employee.mobile_no;
                        updatePosition.value = employee.position;
                        updateRate6.value = employee.rate_6;
                        updateRate7.value = employee.rate_7;
                        updateBenefits.checked = employee.has_benefits;
                        updateIsActive.checked = employee.is_active;
                        updatePaymentMode.value = employee.payment_mode;

                    } else {
                        showMessageBox('Employee not found.');
                        updateEmployeeForm.reset(); // Clear form if employee not found
                    }
                } catch (error) {
                    console.error('Error fetching employee for update:', error);
                    showMessageBox('Error loading employee details: ' + error.message);
                }
            } else {
                updateEmployeeForm.reset(); // Clear form if "Select Employee" is chosen
            }
        });
    }

    // Event listener for update employee form submission
    if (updateEmployeeForm) {
        updateEmployeeForm.addEventListener('submit', async function(e) {
            console.log('Update employee form submit button clicked');
            e.preventDefault();

            const selectedEid = updateEmployeeDropdown.value;
            if (!selectedEid) {
                showMessageBox('Please select an employee to update.');
                return;
            }

             const mainTable = 'employees';
             const mainTableColumns = ['eid','Name','nickname','mobile_no','position','rate_6','rate_7',
                'has_benefits','is_active','payment_mode'];
             const mainIdColumn = 'eid';   

            const data = {
                Name: updateFullname.value,
                nickname: updateNickname.value,
                mobile_no: updateMobile.value,
                position: updatePosition.value,
                rate_6: parseFloat(updateRate6.value),
                rate_7: parseFloat(updateRate7.value),
                has_benefits: updateBenefits.checked,
                is_active: updateIsActive.checked,
                payment_mode : updatePaymentMode.value,
            };

            // Validate inputs
            if (!data.Name || !data.nickname || !data.mobile_no || 
                !data.position || isNaN(data.rate_6) || isNaN(data.rate_7)) {
                showMessageBox('Please fill all required fields with valid data for update.');
                return;
            }

            try {
                const changes = await window.electronAPI.updateRecord({mainTable,mainIdColumn,id:selectedEid,data}); // New IPC call
                if (changes > 0) {
                    showMessageBox('Employee updated successfully!');
                    updateEmployeeForm.reset(); // Clear the form
                    loadEmployees('update-employee-dropdown'); // Reload dropdown to reflect any name changes
                    // If the view-employee tab is active, refresh it as well
                    if (document.getElementById('view-employee').classList.contains('active')) {
                        loadAllEmployeesForView();
                    }
                } else {
                    showMessageBox('No changes made or employee not found.');
                }
            } catch (error) {
                console.error('Error updating employee:', error);
                showMessageBox(`Error updating employee: ${error.message || 'Unknown error'}`);
            }
        });
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

                // --- NEW: Refresh data based on the active tab ---
                if (tabId === 'view-employee') {
                    console.log('Switching to View Records tab');
                    loadAllEmployeesForView(); // Refresh unpaid employees for attendance tab
                    loadPositions();
                    loadEmployees('filter-name');
                   
                } 
                else if (tabId === 'add-employee') {
                    console.log('Switching to Add Employee tab');
                    // No specific action needed here, as the form is already loaded
                }
                else if (tabId === 'update-employee') {
                    console.log('Switching to Update Employee tab');
                    loadEmployees('update-employee-dropdown'); // Load all employees to allow selection for update
                    // Load update employee form or functionality here if needed
                }
            }
        });
    });

    


    // Initial load for the 'Add Employee' tab if it's the default active one
    const addEmployeeTabContent = document.getElementById('add-employee');
    const viewRecordsTabContent = document.getElementById('view-records');
    const updateEmployeeTabContent = document.getElementById('update-employee');

    if (addEmployeeTabContent && addEmployeeTabContent.classList.contains('active')) {
        // No specific initial load needed for the add employee form beyond event listeners
    } else if (viewRecordsTabContent && viewRecordsTabContent.classList.contains('active')) {
        loadAllEmployeesForView(); // If view records is the default active tab
        loadPositions();
        loadEmployees('filter-name');
    }else if (updateEmployeeTabContent && updateEmployeeTabContent.classList.contains('active')) {
        loadEmployees('update-employee-dropdown') // If update employee is the default active tab
    }

    const exportExcelBtn = document.getElementById('export-excel');
    exportExcelBtn.addEventListener('click',() =>{
        exportTableToExcel('records-table','Employee Records','employee_records');
    });


    const exportPdfBtn = document.getElementById('export-pdf-btn');
    exportPdfBtn.addEventListener('click', () => {
        exportTableToPdf('records-table', 'Employee_records', 'Employee Records', 'record-count');
    });
});