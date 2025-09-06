import { showConfirmBox, showMessageBox,searchItem } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {

    let HOLIDAYS = [];
        
    function loadHolidays(){
        const storedHolidays = localStorage.getItem('holidays');
         if (storedHolidays) {
            HOLIDAYS = JSON.parse(storedHolidays);
        } else {
            // Default holidays if none are stored
            HOLIDAYS = [
                '01/05',
                "15/08" // Independence Day
            ];
            saveHolidays();
        }
        renderHolidays();
    }
    function saveHolidays() {        localStorage.setItem('holidays', JSON.stringify(HOLIDAYS));    }

    // Function to render the holidays list in the UI
    function renderHolidays() {
        const holidaysList = document.getElementById('holidays-list');
        holidaysList.innerHTML = ''; // Clear the current list
        HOLIDAYS.sort((a, b) => {
            const [aDay, aMonth] = a.split('/').map(Number);
            const [bDay, bMonth] = b.split('/').map(Number);
            if (aMonth !== bMonth) {
                return aMonth - bMonth;
            }
            return aDay - bDay;
        });

        HOLIDAYS.forEach(date => {
            const li = document.createElement('li');
            li.className = 'holiday-item';
            li.innerHTML = `
                <span>${date}</span>
                <button class="delete-btn" data-date="${date}"><i class="fas fa-close"></i></button>
            `;
            holidaysList.appendChild(li);
        });

        // Add event listeners for the new "remove holiday" buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dateToRemove = btn.dataset.date;
                HOLIDAYS = HOLIDAYS.filter(holiday => holiday !== dateToRemove);
                saveHolidays();
                renderHolidays();
            });
        });
    }

    function isHoliday(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dateStr = `${day}/${month}`;
        
        return HOLIDAYS.includes(dateStr);
    }

    const addHolidayBtn = document.getElementById('addHolidayBtn');
    addHolidayBtn.addEventListener('click', () => {
        const holidayDateInput = document.getElementById('holidayDateInput');
        const dateValue = holidayDateInput.value;
        if (dateValue) {
            const date = new Date(dateValue);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const formattedDate = `${day}/${month}`;
            
            if (!HOLIDAYS.includes(formattedDate)) {
                HOLIDAYS.push(formattedDate);
                saveHolidays();
                renderHolidays();
                holidayDateInput.value = ''; // Clear the input
            } else {
                showMessageBox("This date is already a holiday.");
            }
        } else {
            showMessageBox("Please select a date to add.");
        }
    });

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
                    console.log('Switching to View Records tab in take attendance');
                    loadEmployees("filter-employee-select");
                    loadPositions();
                    loadRecords(); // Load records for the View Records tab
                } else if (tabId === 'attendance') {
                    console.log('Switching to Add Record tab in take attendance');
                    loadEmployees("employee"); // Reload employees for the multi-select
                    loadHolidays();
                }
                // else if (tabId === 'rate-change') {
                //     console.log('Switching to Rate Change tab in bhati');
                //     // loadRates(); // You might have a function here to load current rate
                // }
            }
        });
    });

    const workDateInput = document.getElementById("work-date");
    workDateInput.value = new Date().toISOString().split("T")[0];

    workDateInput.addEventListener('input',setDateStyles);

    async function setDateStyles(){
       try {
            const date = workDateInput.value;
            const attendanceResult = await window.electronAPI.checkIfAttendanceExists(date);
            const attendanceCount = parseInt(attendanceResult.attendance_done);

            const activeResult = await window.electronAPI.checkNoOfActiveEmployees();
            const totalActiveEmployees = parseInt(activeResult.no_of_active_employees);
            
            // Reset styles first
            workDateInput.style.borderColor = '';
            workDateInput.style.borderWidth = '';
            document.getElementById('takeAttendanceSection').style.pointerEvents = 'auto';
            document.getElementById('takeAttendanceSection').style.opacity = '1';
            
            console.log(attendanceCount , totalActiveEmployees);
            if (attendanceCount > 0) {
                if (attendanceCount === totalActiveEmployees - 1) {
                    // All employees have attendance - green border and block section
                    workDateInput.style.borderColor = '#5be923ff';
                    workDateInput.style.borderWidth = '2px';
                    blockAttendanceSection();
                } else {
                    // Some employees have attendance - red border and block section
                    workDateInput.style.borderColor = '#ff0000';
                    workDateInput.style.borderWidth = '2px';
                    blockAttendanceSection();
                }
            }
            // If no attendance, styles remain default
        } catch(error) {
            console.log('Error checking attendance status:', error);
            showMessageBox('Error checking attendance status');
        }
    }

    function blockAttendanceSection() {
        const section = document.getElementById('takeAttendanceSection');
        section.style.pointerEvents = 'none';
        section.style.opacity = '0.7';
    }

    const employeeDropdown = document.getElementById("employee");
    const employeeAttendanceListDiv = document.getElementById("employeeAttendanceList");
    const attendanceForm = document.getElementById("attendance-form");

    let allEmployees = [];
    // --- New: Temporary storage for attendance data ---
    const tempAttendanceData = new Map();

    async function loadEmployees(idName) {
        try {
            const employees = await window.electronAPI.getAllEmployeesActive();
            allEmployees = employees;
            const dropdown = document.getElementById(idName);
            dropdown.innerHTML = '<option value="">Select Employee</option>';

            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.eid;
                option.textContent = `${emp.nickname} (${emp.position})`;
                dropdown.appendChild(option);
            });
            renderEmployeeAttendanceList(employees);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    function calculateDuty(employeeItem, otInputId, dutyInputId,date) {
        const selectedButtons = employeeItem.querySelectorAll(".attendance-btn.selected-attendance");
        const otInput = employeeItem.querySelector(otInputId);
        const dutyInput = employeeItem.querySelector(dutyInputId);
        if(date === '') date = document.getElementById('work-date').value;

        let dutyCount = 0;
        const otValue = otInput.value ? parseFloat(otInput.value).toFixed(3) / 12.0 : 0;

        // Check if 'A' or 'H' is among the selected types
        const isAbsentOrHolidaySelected = Array.from(selectedButtons).some(
            (btn) =>
            btn.getAttribute("data-attendance-type") === "A" || btn.getAttribute("data-attendance-type") === "H"
        );

        if (isAbsentOrHolidaySelected) {
            // If A or H is selected, duty is only the OT value
            dutyCount = otValue;
            
        } else {
            // Otherwise, count D, N, +1 and add OT
            selectedButtons.forEach((button) => {
                const typeId = button.getAttribute("data-attendance-type");
                if (typeId === "D" || typeId === "N" || typeId === "+1" || typeId === "plus1") {
                    dutyCount += 1;
                } else if (typeId === "+½"  || typeId === 'plusHalf') {
                    dutyCount += .5;
                }
            });
            dutyCount += otValue;
        }

        dutyCount = Math.min(dutyCount, 2);
        if(isHoliday(date)){
            dutyCount += 1;  
            //console.log('here' + dutyCount);
            
        }   
        console.log(date , dutyCount);
        dutyInput.value = dutyCount;  
    }

    /**
     * @param {HTMLElement} container The DOM element where buttons should be appended.
     * @param {Array<string>} [selectedTypes=[]] An array of attendance type IDs that should be pre-selected.
     * @param {HTMLElement} parentElement The parent element containing the OT and Duty inputs.
     * @param {string} otInputSelector The CSS selector for the OT input.
     * @param {string} dutyInputSelector The CSS selector for the Duty input.
     */
    function createAttendanceTypeButtons(container, selectedTypes = [], parentElement, otInputSelector, dutyInputSelector,date) {
        const attendanceTypes = [
            { id: "D", label: "D" },
            { id: "N", label: "N" },
            { id: "A", label: "A" },
            { id: "V", label: "V" },
            { id: "H", label: "H" },
            
        ];
       
        attendanceTypes.forEach(type => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `attendance-btn ${selectedTypes.includes(type.id) ? 'selected-attendance' : ''}`;
            button.textContent = type.label;
            button.setAttribute("data-attendance-type", type.id);

            button.addEventListener("click", () => {
                const currentButtons = parentElement.querySelectorAll(".attendance-btn");
                const otInput = parentElement.querySelector(otInputSelector);
                const isAbsentOrHolidayClicked = type.id === "A" || type.id === "H";

                const currentlySelectedAbsentOrHoliday = Array.from(currentButtons).find(
                    (btn) => btn.classList.contains("selected-attendance") &&
                    (btn.getAttribute("data-attendance-type") === "A" ||
                        btn.getAttribute("data-attendance-type") === "H")
                );

                if (isAbsentOrHolidayClicked) {
                    currentButtons.forEach((btn) => btn.classList.remove("selected-attendance"));
                    button.classList.add("selected-attendance");
                } else {
                    if (currentlySelectedAbsentOrHoliday) {
                        currentlySelectedAbsentOrHoliday.classList.remove("selected-attendance");
                    }
                    button.classList.toggle("selected-attendance");
                }
               // console.log(date + ' in cfreate attendance button');
                calculateDuty(parentElement, otInputSelector, dutyInputSelector,date);
            });
            container.appendChild(button);
        });
    }

    function renderEmployeeAttendanceList(employees) {
        const fragment = document.createDocumentFragment();
        employeeAttendanceListDiv.innerHTML = "";
        if (employees.length === 0) {
            employeeAttendanceListDiv.innerHTML =
                "<p>No employee names found.Pls add some employees in the Add Employees page</p>";
            return;
        }
        employees.forEach((employee) => {
            const employeeItem = document.createElement("div");
            employeeItem.className = "employee-attendance-item";
            employeeItem.setAttribute("data-employee-id", employee.eid);

            const employeeName = document.createElement("span");
            employeeName.className = "employee-name";
            employeeName.textContent = employee.nickname + '('+employee.position+')';

            const attendanceOptions = document.createElement("div");
            attendanceOptions.className = "attendance-options";
            
            const existingData = tempAttendanceData.get(employee.eid) || {
                attendanceType: [],
                overtime: 0,
                duty: 0
            };
           
            createAttendanceTypeButtons(attendanceOptions, existingData.attendanceType, employeeItem, ".ot-input", ".duty-input",'');

            // Add OT Input Group
            const otInputGroup = document.createElement("div");
            otInputGroup.className = "ot-input-group";
            otInputGroup.innerHTML = `
                    <label for="ot-${employee.eid}">OT:</label>
                    <input type="number" id="ot-${employee.eid}" name="ot-${employee.eid}" value="${existingData.overtime}" min="0" step="0.5" data-employee-id="${employee.eid}" class="ot-input">
                    `;
            attendanceOptions.appendChild(otInputGroup);

            // Add Duty Input Group
            const dutyInputGroup = document.createElement("div");
            dutyInputGroup.className = "duty-input-group";
            dutyInputGroup.innerHTML = `
                    <label for="duty-${employee.eid}">Duty:</label>
                    <input type="number" id="duty-${employee.eid}" name="duty-${employee.eid}" value="${existingData.duty}" min="0" data-employee-id="${employee.eid}" class="duty-input" readonly>
                    `;
            attendanceOptions.appendChild(dutyInputGroup);

            // Add event listener for OT input changes
            const otInput = otInputGroup.querySelector(".ot-input");
            otInput.addEventListener("input", () => {
                calculateDuty(employeeItem, ".ot-input", ".duty-input",'');
                // --- New: Save data to temporary storage on change ---
                saveAttendanceState(employee.eid);
            });

            // Add event listeners for attendance buttons
            attendanceOptions.querySelectorAll('.attendance-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    // --- New: Save data to temporary storage on change ---
                    saveAttendanceState(employee.eid);
                });
            });

            employeeItem.appendChild(employeeName);
            employeeItem.appendChild(attendanceOptions);
            fragment.appendChild(employeeItem);
           // employeeAttendanceListDiv.appendChild(employeeItem);
        });
        employeeAttendanceListDiv.appendChild(fragment);
    }

    // --- New: Function to save the current state of a single employee's attendance ---
    function saveAttendanceState(employeeId) {
        const employeeItem = document.querySelector(`.employee-attendance-item[data-employee-id="${employeeId}"]`);
        if (employeeItem) {
            const selectedButtons = employeeItem.querySelectorAll(".attendance-btn.selected-attendance");
            const otInput = employeeItem.querySelector(".ot-input");
            const dutyInput = employeeItem.querySelector(".duty-input");

            const attendanceType = Array.from(selectedButtons).map(btn =>
                btn.getAttribute("data-attendance-type")
            );
            const overtime = otInput.value ? parseFloat(otInput.value) : 0;
            const duty = dutyInput.value ? parseFloat(dutyInput.value) : 0;

            tempAttendanceData.set(parseInt(employeeId), {
                attendanceType,
                overtime,
                duty
            });
        }
    }


    employeeDropdown.addEventListener("change", () => {
        // --- New: First, save the current state of all visible employees before filtering ---
        const visibleItems = document.querySelectorAll(".employee-attendance-item");
        visibleItems.forEach(item => {
            const employeeId = parseInt(item.getAttribute("data-employee-id"));
            saveAttendanceState(employeeId);
        });
        const selectedEmployeeId = employeeDropdown.value; // Get the selected employee ID
        console.log(selectedEmployeeId, allEmployees.length);
        let employeesToDisplay = [];

        if (selectedEmployeeId === "") {
            // If "Select Employee" is chosen, show all
            employeesToDisplay = allEmployees; //
        } else {
            // Otherwise, filter to show only the selected employee
            employeesToDisplay = allEmployees.filter((emp) => emp.eid === parseInt(selectedEmployeeId)); //
            console.log(employeesToDisplay);
        }
        renderEmployeeAttendanceList(employeesToDisplay); // Re-render with the filtered list
    });

    attendanceForm.addEventListener("submit", async (event) => { //
        event.preventDefault(); //

        const attendanceRecords = []; //
        const attendanceItems = document.querySelectorAll(".employee-attendance-item");
        const workDate = workDateInput.value; //

        attendanceItems.forEach((item) => { //
            const employeeId = item.getAttribute("data-employee-id");
            const selectedButtons = item.querySelectorAll(".attendance-btn.selected-attendance");
            const otInput = item.querySelector(".ot-input");
            const dutyInput = item.querySelector(".duty-input"); // Get duty input

            let attendanceType = []; //
            selectedButtons.forEach((button) => {
                attendanceType.push(button.getAttribute("data-attendance-type"));
            });
            // if (attendanceType.length === 0) {
            //     attendanceType = ['A'];
            // }
            
            if (attendanceType.length > 0) {
                const otValue = otInput.value ? parseFloat(otInput.value) : 0;
                const dutyValue = dutyInput.value ? parseFloat(dutyInput.value) : 0; // Get duty value

                attendanceRecords.push({
                    employeeId: employeeId, //employee id foreign key from employee table
                    date: workDate, //Date of attendance
                    attendanceType: attendanceType.join(","), //commasepararted types of value
                    overtime: otValue, //ot time in hours if done
                    duty: dutyValue, // Add duty to the record
                });
            }
        });

        if (attendanceRecords.length > 0) {
            try {
                attendanceRecords.forEach(element => {
                    //   console.log(element.employeeId, element.date, element.attendanceType, element.overtime, element.duty);
                });
                const result = await window.electronAPI.insertDailyAttendance(attendanceRecords);
               // showMessageBox("Attendance submitted successfully!"); //
              //  console.log("Attendance to submit:", attendanceRecords); //
              console.log(result);
                if (result.failed > 0 && result.inserted > 0) {
                    showMessageBox(`${result.inserted} attendance records submitted successfully. ${result.failed} failed because attendance already exists.`);
                    setDateStyles();
                } else if (result.failed > 0 && result.inserted === 0) {
                    showMessageBox(`No records inserted. ${result.failed} failed because attendance already exists.`);
                } else {
                    showMessageBox(`${result.inserted} attendance records submitted successfully.`);
                    setDateStyles();
                }
                tempAttendanceData.clear();
                loadEmployees("employee"); // Reload to reset the state

            } catch (error) {
                console.error("Error submitting attendance:", error); //
                showMessageBox("Failed to submit attendance."); //
            }
        } else {
            showMessageBox("Info", "Please mark attendance for at least one employee."); //
        }
    });

    document.getElementById('employee-search').addEventListener('input', function () {
        const searchTerm = this.value.trim().toLowerCase();

        document.querySelectorAll('#employeeAttendanceList .employee-attendance-item').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    // New code for view records tab
    const filterStartDate = document.getElementById("filter-start-date");
    const filterEndDate = document.getElementById("filter-end-date");
    // Corrected ID for the filter employee dropdown
    const filterEmployeeSelect = document.getElementById("filter-employee-select");
    const filterPositionSelect = document.getElementById('filter-position-select');

    filterStartDate.value = new Date().toISOString().split("T")[0];
    filterEndDate.value = new Date().toISOString().split("T")[0];

    // Add event listeners for filters
    filterStartDate.addEventListener("change", loadRecords);
    filterEndDate.addEventListener("change", loadRecords);
    filterEmployeeSelect.addEventListener("change", loadRecords); // Changed to filterEmployeeSelect
    filterPositionSelect.addEventListener("change",loadRecords);
    document.getElementById('mark-all-absent-btn').addEventListener('click', markAllAbsent);

    async function loadRecords() {
        const startDate = filterStartDate.value;
        const endDate = filterEndDate.value;
        // Get value from the correct filter dropdown
        const employeeId = filterEmployeeSelect.value || null;
        const position = filterPositionSelect.value || null;
      //  console.log("employee id: " + employeeId + " start day: " + startDate + " end day: " + endDate + " position: " + position);

        if (!startDate || !endDate) {
            console.error("Start date and end date are required");
            return;
        }

        try {
            const gridData = await window.electronAPI.getAttendanceGridData(startDate, endDate, employeeId,position);
            renderAttendanceGrid(gridData);
        } catch (error) {
            console.error("Error loading attendance records:", error);
            showMessageBox("Failed to load attendance records.");
        }
    }

    function renderAttendanceGrid(gridData) {
        const viewRecordsTab = document.getElementById("view-records");
        const gridContainer = document.getElementById("attendance-grid");

        gridContainer.innerHTML = '';


        if (gridData.dates.length === 0 || gridData.employees.length === 0) {
            gridContainer.innerHTML = "<p>No attendance records found for the selected period.</p>";
            return;
        }

        // Create table
        const table = document.createElement("table");
        table.className = "attendance-grid-table";

        // Create header row with dates
        const header = document.createElement('thead');
        const headerRow = document.createElement("tr");
        const nameHeader = document.createElement("th");
        nameHeader.textContent = "Employee";
        headerRow.appendChild(nameHeader);
        
        gridData.dates.forEach(date => {
            const dateHeader = document.createElement("th");
            const dateObj = new Date(date);
            let headerText =  `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
            if(isHoliday(date)) headerText += '(H)';
            dateHeader.textContent =  headerText;
            dateHeader.title = date; // Show full date on hover
            headerRow.appendChild(dateHeader);
        });

        const paHeader = document.createElement("th");
        paHeader.textContent = "P/A";
        headerRow.appendChild(paHeader);

        const dutyHeader = document.createElement("th");
        dutyHeader.textContent = "Duty";
        headerRow.appendChild(dutyHeader);

        header.appendChild(headerRow);
        table.appendChild(header);

        // Create rows for each employee
        const body = document.createElement('tbody');
        gridData.employees.forEach(employee => {
            const row = document.createElement("tr");

            // Employee name cell
            const nameCell = document.createElement("td");
            nameCell.textContent = employee.name + ' (' + employee.position +')';
            row.appendChild(nameCell);

            let totalDuty = 0,
                present = 0,
                absent = 0;
            // Attendance cells for each date
            gridData.dates.forEach(date => {
                const attendance = employee.attendance[date];
                const cell = document.createElement("td");

                if (attendance.types.length > 0) {
                    // Create a container for the attendance types
                    const typesContainer = document.createElement("div");
                    typesContainer.className = "attendance-types";

                    // Add each attendance type
                    attendance.types.forEach(type => {
                        if (type === 'A' || type === 'H') absent++;
                        const typeSpan = document.createElement("span");
                        typeSpan.className = `attendance-type ${type.toLowerCase()}`;
                        typeSpan.textContent = type;
                        typesContainer.appendChild(typeSpan);
                    });

                    // Add overtime if present
                    if (attendance.overtime > 0) {
                        const otSpan = document.createElement("span");
                        otSpan.className = "attendance-ot";
                        otSpan.textContent = `OT:${attendance.overtime}`;
                        typesContainer.appendChild(otSpan);
                    }
                    present++;

                    const editBtn = document.createElement("button");
                    editBtn.className = "edit-cell-btn";
                    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                    editBtn.title = "Edit this record";
                    editBtn.addEventListener("click", () => openEditModal(date, employee.eid, attendance));
                    cell.appendChild(typesContainer);
                    cell.appendChild(editBtn);

                    // Add tooltip with duty information
                    cell.title = `Duty: ${attendance.duty}`;
                    totalDuty += parseFloat(attendance.duty);
                } else {
                    cell.textContent = "-";
                    // Add edit button for empty cells
                    const editBtn = document.createElement("button");
                    editBtn.className = "edit-cell-btn";
                    editBtn.innerHTML = '<i class="fas fa-plus"></i>';
                    editBtn.title = "Add attendance record";
                    editBtn.addEventListener("click", () => openEditModal(date, employee.eid, {
                        types: [],
                        overtime: 0,
                        duty: 0
                    }));

                    cell.appendChild(editBtn);


                }

                row.appendChild(cell);
               

            });

            const paCell = document.createElement("td");
            paCell.textContent = (present - absent) + ',' + absent;
            row.appendChild(paCell);

            const dutyCell = document.createElement("td");
            dutyCell.textContent = totalDuty;
            row.appendChild(dutyCell);

            body.appendChild(row);
            table.appendChild(body);
        });

        gridContainer.appendChild(table);

        // Populate the mark absent date select
        const dateSelect = document.getElementById('mark-absent-date-select');
        dateSelect.innerHTML = '<option value="">Select a Date</option>'; // Reset options
        gridData.dates.forEach(date => {
            console.log(date);
            const option = document.createElement('option');
            option.value = date;
            const dateObj = new Date(date);
            let displayText = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
            if (isHoliday(date)) displayText += ' (H)';
            option.textContent = displayText;
            dateSelect.appendChild(option);
        });
    }

    //edit related functions
    async function openEditModal(date, employeeId, attendanceData) {
        // Find employee details
        const employee = allEmployees.find(e => e.eid == employeeId);
        if (!employee) {
            showMessageBox("Employee not found!");
            return;
        }

        // Create modal
        const modal = document.createElement("div");
        modal.className = "modal";
        modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${attendanceData.types.length ? 'Edit' : 'Add'} Attendance for ${employee.nickname}</h3>
                <h4>Date: ${date} ${isHoliday(date) ? '(H)': ''}</h4>
                <button class="close-modal-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Attendance Types:</label>
                    <div class="attendance-options-modal" id="attendance-types-edit"></div>
                </div>
                <div class="form-group">
                    <label for="edit-ot">Overtime (hours):</label>
                    <input type="number" id="edit-ot" min="0" step="0.5" value="${attendanceData.overtime || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-duty">Duty:</label>
                    <input type="number" id="edit-duty" min="0" step="0.01" value="${attendanceData.duty || 0}" >
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">Cancel</button>
                <button class="btn btn-primary save-attendance-btn">${attendanceData.types.length ? 'Update' : 'Save'}</button>
            </div>
        </div>
    `;

        document.body.appendChild(modal);

        // Add attendance type buttons using the new reusable function
        const typesContainer = modal.querySelector("#attendance-types-edit");
        const modalContent = modal.querySelector(".modal-content");
        createAttendanceTypeButtons(typesContainer, attendanceData.types, modalContent, "#edit-ot", "#edit-duty",date);

        // Add event listeners for OT input
        const otInput = modal.querySelector("#edit-ot");
        //console.log('here in modal' , date);
        otInput.addEventListener("input", () => calculateDuty(modalContent, "#edit-ot", "#edit-duty",date));

        // Add event listeners for modal buttons
        modal.querySelectorAll(".close-modal-btn").forEach(btn => {
            btn.addEventListener("click", () => modal.remove());
        });

        // Save/Update button
        modal.querySelector(".save-attendance-btn").addEventListener("click", async() => {
            try {
                const selectedButtons = modal.querySelectorAll(".attendance-btn.selected-attendance");
                const attendanceTypes = Array.from(selectedButtons)
                    .map(btn => btn.getAttribute("data-attendance-type"))
                    .join(",");

                const overtime = parseFloat(otInput.value) || 0;
                const duty = parseFloat(modal.querySelector("#edit-duty").value) || 0;

                const record = {
                    date: date,
                    employeeId: employeeId,
                    attendanceType: attendanceTypes,
                    overtime: overtime,
                    duty: duty
                };

                await window.electronAPI.upsertAttendanceRecord(record);
                showMessageBox(`Attendance record ${attendanceData.types.length ? 'updated' : 'added'} successfully!`);
                modal.remove();
                loadRecords(); // Refresh the grid
            } catch (error) {
                console.error("Error saving attendance:", error);
                showMessageBox(`Failed to ${attendanceData.types.length ? 'update' : 'add'} attendance record.`);
            }
        });

    }

    document.getElementById('data-search').addEventListener('input', function(){
       // console.log('event listener activated');
        searchItem('data-search','.attendance-grid-container #attendance-grid .attendance-grid-table tbody tr',4);//search box id , quary of where data will be search,total amount cell no in table
    }); 
    //pdf export related function
    // Import jsPDF (already included in your HTML)
    const { jsPDF } = window.jspdf;

    // Export to PDF function
    async function exportToPDF() {
        try {
            // Get current filter values
            const startDate = document.getElementById("filter-start-date").value;
            const endDate = document.getElementById("filter-end-date").value;
            const employeeId = document.getElementById("filter-employee-select").value || null;
            const position = document.getElementById('filter-position-select').value || null;

            // Show loading message
            showMessageBox("Generating PDF... Please wait");

            // Get the data (same as what's shown in the grid)
            const gridData = await window.electronAPI.getAttendanceGridData(startDate, endDate, employeeId,position);

            // Create a new PDF document (A4 size: 210mm x 297mm)
            const doc = new jsPDF({
                orientation: "landscape", // Better for wide tables
                unit: "mm"
            });

            let header = "Attendance Records" + `From: ${formatDateForPDF(startDate)} to ${formatDateForPDF(endDate)}`;
            // Add title and date range

            if (employeeId) {
                const employee = allEmployees.find(e => e.eid == employeeId);
                header += `Employee: ${employee.nickname} (${employee.position})`;
            }
            doc.setFontSize(14);
            doc.text(header, 15, 22);
            // Prepare table data
            const tableData = prepareTableDataForPDF(gridData);

            // Add the table
            doc.autoTable({
                startY: 35,
                head: [tableData.headers],
                body: tableData.rows,
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                headStyles: {
                    fillColor: '#ffffff', // white header
                    textColor: '#000000ff' // black text
                },
                margin: { left: 15 }
            });

            // Add footer with page numbers
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.text(
                    `Page ${i} of ${pageCount}`,
                    280, // Right-aligned
                    200, // Bottom of page
                    { align: "right" }
                );
            }

            // Save the PDF
            const fileName = `Attendance_${startDate}_to_${endDate}${employeeId ? `_${employeeId}` : ''}.pdf`;
            doc.save(fileName);

        } catch (error) {
            console.error("Error generating PDF:", error);
            showMessageBox("Failed to generate PDF. Please try again.");
        }
    }

    // Helper function to format dates for PDF
    function formatDateForPDF(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // Helper function to prepare table data for PDF
    function prepareTableDataForPDF(gridData) {
        const headers = ["Employee"];

        // Add date headers
        gridData.dates.forEach(date => {
            const d = new Date(date);
            headers.push(`${d.getDate()}/${d.getMonth() + 1}`);
        });

        headers.push("P/A", "Duty");

        const rows = [];

        // Add employee data
        gridData.employees.forEach(employee => {
            const row = [employee.name];
            let present = 0,absent = 0,totalDuty = 0;

            // Add attendance data for each date
            gridData.dates.forEach(date => {
                const attendance = employee.attendance[date];
                let cellContent = "";

                if (attendance.types.length > 0) {
                    // Format attendance types
                    cellContent = attendance.types.join(",");

                    // Count present/absent
                    if (attendance.types.some(t => t === 'A' || t === 'H')) {
                        absent++;
                    } else {
                        present++;
                    }

                    // Add OT if exists
                    if (attendance.overtime > 0) {
                        cellContent += ` (OT:${attendance.overtime})`;
                    }

                    // Add duty to total
                    totalDuty += parseFloat(attendance.duty);
                } else {
                    cellContent = "-";
                }
                row.push(cellContent);
            });

            // Add P/A and Duty totals
            row.push(`${present}/${absent}`, totalDuty.toFixed(2));
            rows.push(row);
        });

        return { headers, rows };
    }

    // Add event listener for the export button
    document.getElementById("export-pdf-btn").addEventListener("click", exportToPDF);
    document.getElementById("calculate-weekly-payments-btn").addEventListener("click",calculatePayments);

    async function loadPositions(){

        try{

            const positions = await window.electronAPI.getUniquePositionFromEmployees();
            const positionSelect = document.getElementById('filter-position-select');
            positionSelect.innerHTML = '<option value = "">Select position</option>';

            positions.forEach(pos => {
                const option = document.createElement('option');
                option.value = pos.position;
                option.textContent = pos.position;
                positionSelect.appendChild(option);
            })

        }catch(error){
            console.log("Error loading positions:",error);
        showMessageBox("Failed to load Positions");
    }
        

    }

    async function prepareDataForPaymentCalculation() {
        const startDate = filterStartDate.value;
        const endDate = filterEndDate.value;
        const empId = filterEmployeeSelect.value || null;
        const position = filterPositionSelect.value || null;

        try {
            // Add await here since getAttendanceGridData returns a promise
            const gridData = await window.electronAPI.getAttendanceGridData(startDate, endDate, empId, position);
            
            if (!gridData || gridData.dates.length === 0 || gridData.employees.length === 0) {
                showMessageBox("No attendance records found for the selected period.");
                return [];
            }

            const paymentData = gridData.employees.map(employee => {
                let totalDuty = 0, present = 0;

                gridData.dates.forEach(date => {
                    const attendance = employee.attendance[date];
                    if(attendance.types.length > 0 ) {
                        if(!attendance.types.includes('A') && !attendance.types.includes('H'))    present++;
                        totalDuty += parseFloat(attendance.duty);
                    }
                  //  if(isHoliday(date)) totalDuty += 1;
                });

                return {
                    eid: employee.eid,
                    totalDuty: totalDuty.toFixed(2),
                    present,
                    weekStart: startDate,
                    weekEnd: endDate
                };
            });
            return paymentData;
        } catch(error) {
            console.error("Error preparing Data for payment calculation:", error);
            showMessageBox("Failed to prepare data for payment calculation");
            return [];
        }
    }


    // Helper function to update progress
    function updateProgress(current, total) {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        const percentage = Math.round((current / total) * 100);
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${current}/${total} employees`;
        
        // Change color based on completion
        if (percentage < 50) {
            progressBar.style.backgroundColor = '#ff9800'; // orange
        } else if (percentage < 100) {
            progressBar.style.backgroundColor = '#2196F3'; // blue
        } else {
            progressBar.style.backgroundColor = '#4CAF50'; // green
        }
    }
    async function calculatePayments(){

        
        //******* validate start date or end date so that it must be to monday to sunday and payment not calulated yet
        const posFilter = document.getElementById('filter-position-select').value;
        if(posFilter != 'labour'){
            showMessageBox('Only labour payments can be calculated using this button');
            return;
        }    
        try {
        // Add await here since prepareDataForPaymentCalculation is now async
            // Show progress container
            const progressContainer = document.getElementById('progress-container');
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            const closeProgressBtn = document.getElementById('close-progress-btn');
            
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressText.textContent = '0/0 employees';
            closeProgressBtn.style.display = 'none'; // Hide close button initially

            // Set up close button handler
            closeProgressBtn.onclick = () => {
                progressContainer.style.display = 'none';
            };

            const paymentData = await prepareDataForPaymentCalculation();
            
            if(paymentData.length === 0) {
                showMessageBox("No valid attendance records found for the given queries");
                closeProgressBtn.style.display = 'block';
                return;
            }

            // Update progress text with total count
            progressText.textContent = `0/${paymentData.length} employees`;
            let processedCount = 0;
            for(const data of paymentData) {
                const employeeDetails = await window.electronAPI.getEmployeeById(data.eid);
                if(!employeeDetails) {
                    showMessageBox('Employee not found for ID: ' + data.eid);
                    processedCount++;
                    updateProgress(processedCount, paymentData.length);
                    continue; 
                }

                const dutyDays = parseFloat(data.totalDuty);
                const noOfDays = data.present;
                const rate = dutyDays < 7 ? employeeDetails.rate_6 : employeeDetails.rate_7;
                const payment = dutyDays * rate;
                const benefits = employeeDetails.has_benefits ? Math.min(noOfDays, 6) * 50 : 0;
                // const amountToPay = payment - benefits;

                const paymentRecord = {
                    eid: data.eid,
                    week_start: data.weekStart,
                    week_end: data.weekEnd,
                    no_of_duties: dutyDays,
                    no_of_days: noOfDays,
                    rate: rate, 
                    payment: payment,
                    benefits: benefits,
                };
                await window.electronAPI.addAttendance(paymentRecord);
            //  showMessageBox(`Payment calculated for ${employeeDetails.nickname}`);
                processedCount++;
                // Update progress after each employee
                updateProgress(processedCount, paymentData.length);
                console.log(`Payment for ${employeeDetails.nickname}:`, paymentRecord);    
            }
        } catch(error) {
            console.error("Error calculating payments:", error);

            showMessageBox("Failed to calculate payments.");
            document.getElementById('progress-container').style.display = 'block';
        }finally {
            closeProgressBtn.style.display = 'block'; // Show close button when done
        }

    }

    async function markAllAbsent() {
        const dateSelect = document.getElementById('mark-absent-date-select');
        const selectedDate = dateSelect.value;

        if (!selectedDate) {
            showMessageBox("Please select a date to mark.");
            return;
        }

        // Confirm action
        const confirmMsg = `Are you sure you want to mark all empty attendances for ${selectedDate} as absent? This will affect the currently filtered employees.`;
        if (!confirm(confirmMsg)) { // Using native confirm for simplicity; replace with showConfirmBox if it's async/promise-based
            return;
        }

        try {
            // Get current filters
            const employeeId = filterEmployeeSelect.value || null;
            const position = filterPositionSelect.value || null;

            // Fetch single-day data using existing API (set start/end to the selected date)
            const singleDayData = await window.electronAPI.getAttendanceGridData(selectedDate, selectedDate, employeeId, position);

            if (singleDayData.employees.length === 0) {
                showMessageBox("No employees found for the current filters.");
                return;
            }

            const attendanceRecords = [];
            const isHol = isHoliday(selectedDate);

            singleDayData.employees.forEach(employee => {
                const attendance = employee.attendance[selectedDate];
                if (attendance.types.length === 0) { // Only for empty cells
                    const attType = isHol ? 'H' : 'A'; // Use 'H' for holidays, 'A' otherwise
                    const overtime = 0;
                    let duty = 0; // Base duty for A/H
                    if (isHol) duty += 1; // Holiday bonus, per calculateDuty logic

                    attendanceRecords.push({
                        employeeId: employee.eid,
                        date: selectedDate,
                        attendanceType: attType,
                        overtime: overtime,
                        duty: duty
                    });
                }
            });

            if (attendanceRecords.length === 0) {
                showMessageBox("No empty attendances found for this date.");
                return;
            }

            // Insert records using existing API
            const result = await window.electronAPI.insertDailyAttendance(attendanceRecords);

            if (result.inserted > 0) {
                showMessageBox(`${result.inserted} empty attendances marked as absent successfully. ${result.failed} failed (already exist).`);
            } else {
                showMessageBox("No new attendances marked (all may already exist or failed).");
            }

            // Refresh the grid
            loadRecords();
        } catch (error) {
            console.error("Error marking absences:", error);
            showMessageBox("Failed to mark absences.");
        }
    }   
    loadHolidays();
    loadEmployees("employee");
    loadRecords();
    setDateStyles();
   

});