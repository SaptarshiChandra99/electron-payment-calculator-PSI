// utils.js

export function formatDate(dateStr){
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr; // fallback if parsing fails
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

export function validatePaidByAndDate(paidBy, paymentDate) {
  if ((!paidBy && paymentDate) || (paidBy && !paymentDate)) {
    showMessageBox("Both 'Paid By' and 'Payment Date' must be filled together");
    return false;
  }
  return true;
}

export function searchItem(searchId , quary, cellNo){

        const searchTerm = document.getElementById(searchId).value.trim().toLowerCase();
        const recCountInput = document.getElementById('record-count');
        const totalAmountInput = document.getElementById('total-amount');
       // console.log(searchTerm)
        const rows = document.querySelectorAll(quary);
        let recCount = 0,totalAmount = 0;
        rows.forEach(row => {
            const rowText = Array.from(row.cells)
                .map(cell => cell.textContent.toLowerCase())
                .join(' ');
              //  console.log(rowText);
            if(rowText.includes(searchTerm)){
              //  console.log('here');
               row.style.display = '';
                recCount++;
                //cellNo is where the amount column is
                const amountCell = row.cells[cellNo];
                if (amountCell) {
                    const amount = parseFloat(amountCell.textContent) || 0;
                    totalAmount += amount;
                }
            } else {
                row.style.display = 'none';
            }

           // row.style.display = rowText.includes(searchTerm) ? '' : 'none';
        });
        if(recCountInput && totalAmountInput){
            recCountInput.textContent = recCount;
            totalAmountInput.textContent = totalAmount.toFixed(2);
        }
        
    }

export async function loadItems(dropdownId ,position ){

    try{
        const employees = await window.electronAPI.getActiveEmployeesByPosition(position);
        const dropdown = document.getElementById(dropdownId);
        dropdown.innerHTML = '<option value="">Select Employee</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.eid;
            option.textContent = `${emp.nickname} (${emp.position})`;
            dropdown.appendChild(option);
        });  
    }catch(error){
        console.log('Error loading Employess: ',error,error.stack);
    }
}


/**
 * Creates and displays a custom message box (modal dialog).
 * This function replaces native alert() and confirm() in an Electron environment.
 * @param {string} message - The message to display in the box.
 * @param {'alert'|'confirm'} [type='alert'] - The type of message box ('alert' or 'confirm').
 * @param {function(boolean): void} [callback=null] - Callback function for 'confirm' type,
 * receives true for OK, false for Cancel.
 */
function createMessageBox(message, type = 'alert', callback = null) {
    // Remove any existing message boxes to prevent duplicates
    const existingBox = document.getElementById('custom-message-box');
    if (existingBox) {
        existingBox.remove();
    }

    const messageBox = document.createElement('div');
    messageBox.id = 'custom-message-box';
    messageBox.className = 'custom-modal'; // This class is styled in styles.css

    messageBox.innerHTML = `
        <div class="custom-modal-content">
            <p>${message}</p>
            <div class="custom-modal-actions">
                <button id="custom-modal-ok-btn" class="custom-modal-btn">OK</button>
                ${type === 'confirm' ? '<button id="custom-modal-cancel-btn" class="custom-modal-btn custom-modal-btn-cancel">Cancel</button>' : ''}
            </div>
        </div>
    `;

    // Append to body. In a module, `document.body` should generally be available
    // if the script tag has `defer` or is placed before </body>.
    document.body.appendChild(messageBox);

    const okBtn = document.getElementById('custom-modal-ok-btn');
    okBtn.onclick = () => {
        messageBox.remove();
        if (callback) callback(true);
    };

    if (type === 'confirm') {
        const cancelBtn = document.getElementById('custom-modal-cancel-btn');
        cancelBtn.onclick = () => {
            messageBox.remove();
            if (callback) callback(false);
        };
    }

}

// Declare variables at the top-level but initialize them inside DOMContentLoaded
let employeeDropdownContainer;
let employeeDropdown;
let selectedEmployeeIdsInput;
let selectedEmployees = [];
let allEmployees = [];
let searchInput;
let dropdownList;

// === Define multi-select related functions OUTSIDE DOMContentLoaded ===
// These functions must be defined at the top level of the module to be exportable.


async function loadEmployees(position) {
    try {
        //allEmployees = await window.electronAPI.getLabourEmployees();
        allEmployees = await window.electronAPI.getActiveEmployeesByPosition(position);
        if (dropdownList) {
            dropdownList.innerHTML = '';
        }
        selectedEmployees = [];
        updateSelectedTags();
        updateSelectedEmployeeIdsInput();

        allEmployees.forEach(emp => {
            const item = document.createElement('div');
            item.classList.add('multi-select-dropdown-item');
            item.setAttribute('data-eid', emp.eid);
            item.setAttribute('data-nickname', emp.nickname);
            item.innerHTML = `
                <span>${emp.nickname} (${emp.position})</span>
            `;
            item.setAttribute('tabindex', '0'); // Make each item focusable
            if (dropdownList) {
                dropdownList.appendChild(item);
            }

            item.addEventListener('click', () => {
                toggleEmployeeSelection(emp);
            });
            item.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleEmployeeSelection(emp);
                }
            });
        });
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

function toggleEmployeeSelection(employee) {
    const index = selectedEmployees.findIndex(emp => emp.eid === employee.eid);
    if (index > -1) {
        selectedEmployees.splice(index, 1);
    } else {
        selectedEmployees.push(employee);
    }
    updateSelectedTags();
    updateSelectedEmployeeIdsInput();
    updateDropdownItemsClass();

    // Fire a custom event to notify other scripts of the change.
    if (employeeDropdownContainer) {
        employeeDropdownContainer.dispatchEvent(new Event('selectionChanged', { bubbles: true }));
    }
}

function updateSelectedTags() {
    if (!employeeDropdownContainer) return;
    employeeDropdownContainer.innerHTML = '';
    if (selectedEmployees.length === 0) {
        employeeDropdownContainer.textContent = 'Select Employee(s)';
        employeeDropdownContainer.style.color = 'var(--text-color-light)';
    } else {
        employeeDropdownContainer.style.color = 'var(--text-color)';
        selectedEmployees.forEach(emp => {
            const tag = document.createElement('span');
            tag.classList.add('multi-select-tag');
            tag.textContent = emp.nickname;
            const removeBtn = document.createElement('span');
            removeBtn.classList.add('remove-tag');
            removeBtn.textContent = 'x';
            removeBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleEmployeeSelection(emp);
            });
            tag.appendChild(removeBtn);
            employeeDropdownContainer.appendChild(tag);
        });
    }
}

function updateSelectedEmployeeIdsInput() {
    if (selectedEmployeeIdsInput) {
        selectedEmployeeIdsInput.value = selectedEmployees.map(emp => emp.eid).join(',');
    }
}

function updateDropdownItemsClass() {
    if (!employeeDropdown) return;
    const dropdownItems = employeeDropdown.querySelectorAll('.multi-select-dropdown-item');
    dropdownItems.forEach(item => {
        const eid = parseInt(item.getAttribute('data-eid'));
        if (selectedEmployees.some(emp => emp.eid === eid)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function setSelectedEmployees(employeeIds) {
        if (!allEmployees.length) {
            console.warn('No employees loaded. Call loadEmployees() first.');
            return;
        }

        // Filter valid employee IDs and map to employee objects
        selectedEmployees = allEmployees.filter(emp => employeeIds.includes(emp.eid));
        
        // Update UI and hidden input
        updateSelectedTags();
        updateSelectedEmployeeIdsInput();
        updateDropdownItemsClass();

        // Trigger selectionChanged event to update dependent UI (e.g., amountToPay)
        if (employeeDropdownContainer) {
            employeeDropdownContainer.dispatchEvent(new Event('selectionChanged', { bubbles: true }));
        }
}


// --- Multi-select dropdown for employees Initialization (inside DOMContentLoaded) ---
// This block handles setting up event listeners and creating initial elements
// AFTER the HTML document is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    employeeDropdownContainer = document.getElementById('employee-selected-tags');
    employeeDropdown = document.getElementById('employee-dropdown');
    selectedEmployeeIdsInput = document.getElementById('selected-employee-ids');

    // Add tabindex="0" to make it focusable by keyboard
    if (employeeDropdownContainer) { // Ensure element exists before setting attribute
        employeeDropdownContainer.setAttribute('tabindex', '0');
    } else {
        console.error('employee-selected-tags element not found.');
        // Consider handling this error gracefully, maybe by disabling the dropdown feature.
        return; // Exit if the main container is missing
    }

    if (employeeDropdown) { // Ensure element exists before appending children
        // Create search input and dropdown list container
        searchInput = document.createElement('div');
        searchInput.className = 'multi-select-dropdown-search';
        searchInput.innerHTML = '<input type="text" placeholder="Search employees..." id="employee-search">';
        employeeDropdown.appendChild(searchInput);

        dropdownList = document.createElement('div');
        dropdownList.className = 'multi-select-dropdown-list';
        employeeDropdown.appendChild(dropdownList);
    } else {
        console.error('employee-dropdown element not found.');
        // Consider handling this error gracefully.
        return; // Exit if the dropdown content is missing
    }

    // Toggle dropdown visibility
    employeeDropdownContainer.addEventListener('click', (event) => {
        if (!event.target.classList.contains('remove-tag')) {
            employeeDropdown.classList.toggle('show');
            if (employeeDropdown.classList.contains('show')) {
                const employeeSearchInput = document.getElementById('employee-search');
                if (employeeSearchInput) {
                    employeeSearchInput.focus();
                }
            }
        }
    });

    // Add keyboard handling for the dropdown container
    employeeDropdownContainer.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            employeeDropdown.classList.toggle('show');
            if (employeeDropdown.classList.contains('show')) {
                const employeeSearchInput = document.getElementById('employee-search');
                if (employeeSearchInput) {
                    employeeSearchInput.focus();
                }
            }
        }
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (employeeDropdown && employeeDropdownContainer &&
            !employeeDropdown.contains(event.target) &&
            !employeeDropdownContainer.contains(event.target)) {
            employeeDropdown.classList.remove('show');
        }
    });

    // Add keyboard handling for closing with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (employeeDropdown && employeeDropdown.classList.contains('show')) {
                employeeDropdown.classList.remove('show');
                employeeDropdownContainer.focus();
            }
        }
    });

    // Search functionality
    document.addEventListener('input', function(event) {
        if (event.target.id === 'employee-search' && dropdownList) {
            const searchTerm = event.target.value.toLowerCase();
            const items = dropdownList.querySelectorAll('.multi-select-dropdown-item');

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        }
    });

    
}); // End of DOMContentLoaded for utils.js

/**
 * Exports an HTML table to a PDF document using html2canvas and jsPDF.
 * The PDF will include a header with title, current date, and total amount.
 * The table will have proper borders and consistent styling.
 * @param {string} tableId The ID of the HTML table to export.
 * @param {string} filename The desired filename for the PDF.
 * @param {string} headerTitle The title to display at the top of the PDF.
 * @param {string} totalAmountId The ID of the element containing the total amount.
 */
export async function exportTableToPdf(tableId, filename, headerTitle, totalAmountId) {
    const { jsPDF } = window.jspdf;
    const table = document.getElementById(tableId);

    if (!table || table.querySelector('tbody').rows.length === 0) {
        createMessageBox('No records to export!', 'alert');
        return;
    }

    const doc = new jsPDF({ orientation: 'portrait' });

    const totalAmount = document.getElementById(totalAmountId).textContent;
    const totalAmountText = `Total: ${totalAmount}`;

    // 1. Get header and total information
    let periodParts = [];

    // Check for year filter
    // const filterYear = document.getElementById('filter-year');
    // if (filterYear && filterYear.selectedOptions && filterYear.selectedOptions.length > 0) {
    //     periodParts.push(`Year: ${filterYear.selectedOptions[0].text}`);
    // }

    // // Check for month filter
    // const filterMonth = document.getElementById('filter-month');
    // if (filterMonth && filterMonth.selectedOptions && filterMonth.selectedOptions.length > 0) {
    //     periodParts.push(`Month: ${filterMonth.selectedOptions[0].text}`);
    // }

    // Check for week filter
    const filterWeek = document.getElementById('filter-week');
    if (filterWeek && filterWeek.selectedOptions && filterWeek.selectedOptions.length > 0) {
        periodParts.push(`${filterWeek.selectedOptions[0].text}`);
    }

    // Check for start date filter
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    if (filterStartDate && filterEndDate) {
        // console.log('Filter Start Date:', filterStartDate.value);
        // console.log('Filter End Date:', filterEndDate.value);
        const startDate = filterStartDate.value;
        const endDate = filterEndDate.value;
       
        periodParts.push(` ${startDate} to ${endDate}`);
    }



    // Construct periodText only with available filters
    const periodText = periodParts.length > 0 ? `${periodParts.join(' | ')}` : 'Period: N/A';

     // --- Dynamic Column Skipping Logic ---
    let weekRangeColumnIndex = -1; // Initialize to -1, meaning not found
    const actionColumnOffset = 1; // Assuming the last column is always 'Actions'

    const tableHeadRow = table.querySelector('thead tr');
    if (tableHeadRow) {
        tableHeadRow.querySelectorAll('th').forEach((th, index) => {
            if (th.textContent.trim() === 'Week Range') {
                weekRangeColumnIndex = index;
                // No need to break loop in forEach, it will just overwrite if duplicated
                // but usually headers are unique.
            }
        });
    }

    // 2. Extract table headers, skipping the last "Actions" column
    const head = [];
    if (tableHeadRow) { // Ensure tableHeadRow exists before querying
        tableHeadRow.querySelectorAll('th').forEach((th, index, arr) => {
            // Skip if it's the 'Week Range' column OR the last 'Actions' column
            if (index !== weekRangeColumnIndex && index < arr.length - actionColumnOffset) {
                head.push(th.textContent.trim());
            }
        });
    }


    // 3. Extract table body data, skipping 'Week Range' if found, and the last 'Actions' column
    const body = [];
    table.querySelectorAll('tbody tr').forEach(tr => {
        if (tr.style.display === 'none')    return;
           
        const rowData = [];
        tr.querySelectorAll('td').forEach((td, index, arr) => {
            // Skip if it's the 'Week Range' column OR the last 'Actions' column
            if (index !== weekRangeColumnIndex && index < arr.length - actionColumnOffset) {
                rowData.push(td.textContent.trim());
            }
        });
        body.push(rowData);
    });

    // 4. Generate the PDF using AutoTable
    doc.autoTable({
        head: [head],
        body: body,
       // startY: 65, // Start table below the header
        theme: 'grid', // Use 'grid' for simple black & white borders
        styles: {
            fontSize: 8,
            cellPadding: 1,
            textColor: '#000000',
          //  lineColor: '#000000',
            lineWidth: 0.4,
        },
        headStyles: {
            fillColor: '#ffffff', // Light grey for header
            textColor: '#000000',
            fontStyle: 'bold',
        },
       
        // Hook to add custom content on every page
        didDrawPage: function(data) {
            const centerX = doc.internal.pageSize.getWidth() / 2;

            // -- Page Header --
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            // Changed X-coordinate to centerX and added { align: 'center' }
            doc.text(headerTitle, centerX, 7, { align: 'center' }); 
            doc.text(totalAmountText, 10, 7, { align: 'left' });
            doc.text(periodText, doc.internal.pageSize.getWidth() - 10, 7, { align: 'right' });

            // -- Page Footer --
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.getWidth() - data.settings.margin.right, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
        },
    });
    filename = filename + periodText + '.pdf';
    // 5. Save the generated PDF
    doc.save(filename);
}

/**
 * Exports an HTML table to an Excel file (.xlsx).
 * The Excel file will include a custom header, date range, and total amount.
 * @param {string} tableId The ID of the HTML table to export.
 * @param {string} headerText The main header text for the Excel sheet (e.g., "Packing Records").
 * @param {string} startDateId The ID of the input element containing the start date.
 * @param {string} endDateId The ID of the input element containing the end date.
 * @param {string} totalAmountId The ID of the element containing the total amount.
 * @param {string} filenamePrefix The prefix for the Excel filename (e.g., "packing_records").
 */
export function exportTableToExcel(tableId, headerText, filenamePrefix) {
    const table = document.getElementById(tableId);
    if (!table || table.querySelector('tbody').rows.length === 0) {
        createMessageBox('No records to export!', 'alert');
        return;
    }

   

    const startDate = document.getElementById('filter-start-date')?.value || 'N/A';
    const endDate = document.getElementById('filter-end-date')?.value || 'N/A';
    const totalAmount = document.getElementById('total-amount')?.textContent || '0.00';
    let filename = "";
    // Construct the filename
    const weekRange = document.getElementById('filter-week')?.selectedOptions[0].text|| null;
    if(weekRange)
         filename = `${filenamePrefix}_${weekRange}.xlsx`;
    else    
        filename = `${filenamePrefix}_${startDate}_to_${endDate}.xlsx`;

    // Extract table headers, skipping the last "Actions" column
    const headers = [];
    const tableHeadRow = table.querySelector('thead tr');
    if (tableHeadRow) {
        tableHeadRow.querySelectorAll('th').forEach((th, index, arr) => {
            // Skip the last column (Actions)
            if (index < arr.length - 1) {
                headers.push(th.textContent.trim());
            }
        });
    }

    // Extract table body data, skipping the last "Actions" column
    const data = [];
    table.querySelectorAll('tbody tr').forEach(tr => {
        const rowData = [];
        tr.querySelectorAll('td').forEach((td, index, arr) => {
            // Skip the last column (Actions)
            if (index < arr.length - 1) {
                rowData.push(td.textContent.trim());
            }
        });
        data.push(rowData);
    });

    // Prepare data for the Excel sheet
    const ws_data = [];

    // Add the main header row
    ws_data.push([headerText]);
    // Add the date range row
    if(weekRange)
        ws_data.push([`Date: ${weekRange}`]);
    else
        ws_data.push([`Date: ${startDate} to ${endDate}`]);
    // Add a blank row for spacing
    ws_data.push([]);
    // Add the table headers
    ws_data.push(headers);
    // Add the table data
    data.forEach(row => ws_data.push(row));
    // Add the total amount row at the end
    ws_data.push([]); // Blank row before total
    ws_data.push(['', '', '', '', '', '', '', 'Total Amount Payable:', totalAmount]); // Adjust column for total based on your table structure

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");

    XLSX.writeFile(wb, filename);
}


// Export these functions (they are now correctly defined in the top-level scope)
export const showMessageBox = (message) => createMessageBox(message, 'alert');
export const showConfirmBox = (message, callback) => createMessageBox(message, 'confirm', callback);
export { loadEmployees,setSelectedEmployees, toggleEmployeeSelection, updateSelectedTags, updateSelectedEmployeeIdsInput, updateDropdownItemsClass };
export function getSelectedEmployeeData() {
    return selectedEmployees;
}
export function getSelectedEmployeeIds() {
    return selectedEmployees.map(emp => emp.eid);
}
export function getSelectedEmployeeNicknames() {
    return selectedEmployees.map(emp => emp.nickname).join(', ');
}

