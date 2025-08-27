// main.js - Electron Main Process

const { app, BrowserWindow,screen, ipcMain } = require('electron');
const path = require('path');
const db = require('./database'); // Import your database module

function createWindow() {

    // Get the primary display's size
 const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
      // Calculate window dimensions (80% of screen size)
 const windowWidth = Math.floor(width * 0.8);
 const windowHeight = Math.floor(height * 0.8);

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 800,
    minHeight: 600,
    frame: false,
      webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Path to the preload script
      nodeIntegration: false, // It's safer to keep nodeIntegration false
      contextIsolation: true, // Recommended for security
    }
  });

  

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // IPC Handlers for custom window controls
    ipcMain.on('window:minimize', () => {
        mainWindow.minimize();
    });

    ipcMain.on('window:maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on('window:close', () => {
        mainWindow.close();
    });

    // New IPC handler for page navigation
    ipcMain.on('navigate:page', (event, pagePath) => {
        console.log(`Navigating to: ${pagePath}`);
        mainWindow.loadFile(path.join(__dirname, pagePath));
    });

  // Open the DevTools.
 // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Main Handlers ---
// These handlers will listen for messages from the renderer process (app.js)
// and call the corresponding database functions.

ipcMain.handle('db:checkNoOfActiveEmployees', async (event,data) => {
    return new Promise((resolve, reject) => {
        db.checkNoOfActiveEmployees(data,(err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle('db:checkIfAttendanceExists', async (event,data) => {
    return new Promise((resolve, reject) => {
        db.checkIfAttendanceExists(data,(err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});



ipcMain.handle('db:insertDailyAttendance', async (event, attendanceData) => {
 //   const { employee_id, work_date, attendance_type, overtime, duty } = attendanceData;
    attendanceData.forEach(element => {
     //   console.log(element.employeeId, element.date, element.attendanceType, element.overtime, element.duty);
    });
    return new Promise((resolve, reject) => {
        db.insertDailyAttendance(attendanceData, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result); // result now contains inserted & failed counts
            }
        });
    });
});

ipcMain.handle('db:getAttendanceGridData', async (event, startDate, endDate, employeeId,position) => {
    try {
        // Await the promise directly from database.js
     //   console.log("in main jsemployee id: " +employeeId+" start day: "+startDate+" end day: "+endDate);
        const data = await db.getAttendanceGridData(startDate, endDate, employeeId,position);
        return data; // Electron's ipcMain.handle automatically resolves/rejects based on the returned value/thrown error
    } catch (error) {
        console.error('Error in main process handling db:getAttendanceGridData:', error);
        throw error; 
    }
});

// Handle upsert attendance record
// In main.js - replace the existing upsert handler with this:
ipcMain.handle('db:upsertAttendanceRecord', async (event, record) => {
    return new Promise((resolve, reject) => {
        db.upsertAttendanceRecord(record, (err, result) => {
            if (err) {
                console.error('Error upserting attendance record:', err);
                reject(err);
            } else {
                console.log('Attendance record upserted successfully:', result);
                resolve(result);
            }
        });
    });
});

ipcMain.handle('db:getAllEmployees', async (event,eid,position) => {
    console.log('Fetching all employees from the database');
    return new Promise((resolve, reject) => {
        db.getAllEmployees(eid,position,(err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle('db:getUniquePositionFromEmployees',async (event) =>{
    return new Promise((resolve,reject) =>{
        db.getUniquePositionFromEmployees((err,rows) =>{
            if(err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle('db:getAllEmployeesActive', async(event) =>{
    console.log('fetching all active employees');
    return new Promise((resolve,reject) =>{
        db.getAllEmployeesActive((err,rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle('db:getLabourEmployees',async(event)=>{
    console.log('fetching all labour employees');
    return new Promise((resolve,reject) =>{
        db.getLabourEmployees((err,rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
})

ipcMain.handle('db:getUnpaidEmployees', async (event, weekStart) => {
    return new Promise((resolve, reject) => {
        db.getUnpaidEmployees(weekStart, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle('db:getEmployeeById', async (event, eid) => {
    return new Promise((resolve, reject) => {
        db.getEmployeeById(eid, (err, employee) => {
            if (err) reject(err);
            else resolve(employee);
        });
    });
});

ipcMain.handle('db:getManagerEmployees', async (event) => {
    return new Promise((resolve, reject) => {   
        db.getManagerEmployees((err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle('db:getActiveEmployeesByPosition' , async (event,position) => {
    return new Promise((resolve, reject) => {
        db.getActiveEmployeesByPosition(position, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
})

ipcMain.handle('db:addEmployee', async (event, employeeData) => {
    const { fullname, nickname, mobile_no, position, rate_6, rate_7, has_benefits } = employeeData;
    return new Promise((resolve, reject) => {
        db.addEmployee(fullname, nickname, mobile_no, position, rate_6, rate_7, has_benefits, (err, id) => {
            if (err) reject(err);
            else resolve(id);
        });
    });
});

ipcMain.handle('db:addAttendance', async (event, attendanceData) => {
    const { week_start, week_end, eid, no_of_duties, no_of_days, rate, payment, benefits } = attendanceData;
    return new Promise((resolve, reject) => {
        db.addAttendance(week_start, week_end, eid, no_of_duties, no_of_days, rate, payment, benefits, (err, id) => {
            if (err) reject(err);
            else resolve(id);
        });
    });
});

ipcMain.handle('db:updateWeeklyPaymentRecord', async (event, record) => {
    return new Promise((resolve, reject) => {
        db.updateWeeklyPaymentRecord(record, (err, changes) => {
            console.log('Updating weekly payment record in main.js:', record);
            if (err) reject (err);
            else resolve(changes);
        });
    });
});        
                

ipcMain.handle('db:getFilteredRecords', async (event, weekStart, year, month) => {
    return new Promise((resolve, reject) => {
        db.getFilteredRecords(weekStart, year, month, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle('db:getWeeklyTotal', async (event, weekStart) => {
    return new Promise((resolve, reject) => {
        db.getWeeklyTotal(weekStart, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
});

ipcMain.handle('db:checkAttendanceExists', async (event, eid, week_start) => {
    return new Promise((resolve, reject) => {
        db.checkAttendanceExists(eid, week_start, (err, exists) => {
            if (err) reject(err);
            else resolve(exists);
        });
    });
});

ipcMain.handle('db:getDistinctYears', async (event) => {
    return new Promise((resolve, reject) => {
        db.getDistinctYears((err, years) => {
            if (err) reject(err);
            else resolve(years);
        });
    });
});

ipcMain.handle('db:getDistinctMonths', async (event, year) => {
    return new Promise((resolve, reject) => {
        db.getDistinctMonths(year, (err, months) => {
            if (err) reject(err);
            else resolve(months);
        });
    });
});

ipcMain.handle('db:getDistinctWeeks', async (event, year, month) => {
    return new Promise((resolve, reject) => {
        db.getDistinctWeeks(year, month, (err, weeks) => {
            if (err) reject(err);
            else resolve(weeks);
        });
    });
});

ipcMain.handle('db:deleteAttendanceRecord', async (event, attendanceId) => {
    return new Promise((resolve, reject) => {
        db.deleteAttendanceRecord(attendanceId, (err, changes) => {
            if (err) reject(err);
            else resolve(changes);
        });
    });
});

ipcMain.handle('db:deleteEmployee', async (event, eid) => {
    return new Promise((resolve, reject) => {   
        db.deleteEmployee(eid, (err, changes) => {
            if (err) reject(err);
            else resolve(changes);
        });
    });
});


// Added a general handler to get an employee by ID (used for attendance calculation)
ipcMain.handle('db:getEmployeeForAttendanceCalculation', async (event, eid) => {
    return new Promise((resolve, reject) => {
        db.getEmployeeById(eid, (err, employee) => { // Re-using getEmployeeById as it fetches rate_6, rate_7, has_benefits
            if (err) reject(err);
            else resolve(employee);
        });
    });
});

// IPC handler for updating an employee (NEW)
ipcMain.handle('db:updateEmployee', async (event, employeeData) => {
    console.log('Main Process: Received update-employee request. Data:', employeeData);
    try {
        // Call the database function, which returns a Promise, and await its resolution
        const changes = await db.updateEmployee(employeeData); 
        console.log('Main Process: Employee updated successfully. Changes:', changes);
        return changes; // Return the number of changes
    } catch (error) {
        console.error('Main Process: Failed to update employee:', error);
        throw error; // Re-throw the error so the renderer process can catch it
    }
});

// Add packing record handler !!!!
// ipcMain.handle('db:addPacking', async (event, packingData) => {
//     const { work_date,employee_id, no_of_rolls,rate, amount_to_pay,shift, remarks,paid_by } = packingData;
//     return new Promise((resolve, reject) => {
//         db.addPacking(work_date,employee_id, no_of_rolls,rate, amount_to_pay,shift, remarks,paid_by, (err, id) => {
//             if (err) reject(err);
//             else resolve(id);
//         });
//     });
// });

// IPC handler to get employees for packing records
ipcMain.handle('db:getUnpaidPackingEmployees', async (event, work_date) => {
    return new Promise((resolve, reject) => {   
        db.getUnpaidPackingEmployees(work_date, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

// ipcMain.handle('db:getPackingRecords', async (event,startDate,endDate) => {
//     return new Promise((resolve, reject) => {
//         db.getPackingRecords(startDate, endDate,(err, rows) => {
//             if (err) reject(err);
//             else resolve(rows);
//         });
//     });
// });

// ipcMain.handle('db:deletePackingRecord', async (event, packingId) => {
//     return new Promise((resolve, reject) => {
//         console.log('Deleting packing record with ID in main.js:', packingId); // Debug log
//          // Call the database function to delete the packing record
//          console.log('Calling deletePackingRecord in main.js');
//         db.deletePackingRecord(packingId, (err, changes) => {
//             if (err) reject(err);
//             else resolve(changes);
//         });
//     });
// });

// ipcMain.handle('db:updatePackingRecord', async (event, packingData) => {
//     return new Promise((resolve, reject) => {
//         db.updatePackingRecord(packingData, (err, changes) => {
//             if (err) reject(err);
//             else resolve(changes);
//         });
//     });
// });        

//IPC handlers for the bull block payments page
// ipcMain.handle('db:addBullBlock', async (event, bullBlockData) => {
//    // const { work_date,employee_id, gauge, weight , rate, amount_to_pay, remarks } = bullBlockData;
//     return new Promise((resolve, reject) => {
//         db.addBullBlock(bullBlockData, (err, id) => {
//             if (err) reject(err);
//             else resolve(id);
//         });
//     });
// });

// ipcMain.handle('db:getBullBlockRecords', async (event,startDate,endDate) => {
//     return new Promise((resolve, reject) => {
//         db.getBullBlockRecords(startDate,endDate,(err, rows) => {
//             if (err) reject(err);
//             else resolve(rows);
//         });
//     });
// });

// ipcMain.handle('db:deleteBullBlockRecord', async (event, bullblock_id) => {
//     return new Promise((resolve, reject) => {
//         console.log('Deleting bull block record with ID in main.js:', bullblock_id); // Debug log
//          // Call the database function to delete the bull block record
//          console.log('Calling deleteBullBlockRecord in main.js');
//         db.deleteBullBlockRecord(bullblock_id, (err, changes) => {
//             if (err) reject(err);
//             else resolve(changes);
//         });
//     });
// });

// ipcMain.handle('db:updateBullBlockRecord', async (event, bbData) => {
//     return new Promise((resolve, reject) => {
//         db.updateBullBlockRecord(bbData, (err, changes) => {
//             if (err) reject(err);
//             else resolve(changes);
//         });
//     });
// }); 

// ipcMain.handle('db:getEmployeesForBullBlock', async (event , work_date) => {
//     return new Promise((resolve, reject) => {
//         db.getEmployeesForBullBlock(work_date , (err, rows) => {
//             if (err) reject(err);
//             else resolve(rows);
//         });
//     });
// });

//IPC handlers for insert function generic
ipcMain.handle('db:insertRecord', async (event, data) => {   
   
    return new Promise((resolve, reject) => {
        // Pass the stringified IDs and the nicknames string to the database function
        db.insertRecord(data, (err, id) => {
            if (err) reject(err);
            else resolve(id);
        });
    });
});

ipcMain.handle('db:getRecords', async (event,options,startDate,endDate) => {
    return new Promise((resolve, reject) => {
        db.getRecords(options,startDate,endDate,(err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle('db:deleteRecord', async (event,data) => {
    return new Promise((resolve, reject) => {
     //  console.log('Deleting record with ID in main.js:', data); // Debug log
        db.deleteRecord(data, (err, changes) => {
            if (err) reject(err);
            else resolve(changes);
        });
    });
});

ipcMain.handle('db:updateRecord', async (event, values) => {
    return new Promise((resolve, reject) => {
        db.updateRecord(values, (err, changes) => {
            if (err) {
                console.error('Error updating record:', err);
                reject(err);
            } else {
                console.log('record updated successfully:', changes);
                resolve(changes);
            }
        });
    });
});


// IPC handler for adding loading/unloading records
// ipcMain.handle('db:insertLoadingUnloadingRecord', async (event, data) => {   
   
//     return new Promise((resolve, reject) => {
//         // Pass the stringified IDs and the nicknames string to the database function
//         db.insertLoadingUnloadingRecord(data, (err, id) => {
//             if (err) reject(err);
//             else resolve(id);
//         });
//     });
// });

// ipcMain.handle('db:getLoadingUnloadingRecords', async (event,startDate,endDate) => {
//     return new Promise((resolve, reject) => {
//         db.getLoadingUnloadingRecords(startDate,endDate,(err, rows) => {
//             if (err) reject(err);
//             else resolve(rows);
//         });
//     });
// });

// ipcMain.handle('db:deleteLoadingUnloadingRecord', async (event, recordId) => {
//     return new Promise((resolve, reject) => {
//         console.log('Deleting loading/unloading record with ID in main.js:', recordId); // Debug log
//         db.deleteLoadingUnloadingRecord(recordId, (err, changes) => {
//             if (err) reject(err);
//             else resolve(changes);
//         });
//     });
// });

// ipcMain.handle('db:updateLoadingRecord', async (event, data) => {
//     return new Promise((resolve, reject) => {
//         db.updateLoadingRecord(data, (err, changes) => {
//             if (err) {
//                 console.error('Error updating loading unloading record:', err);
//                 reject(err);
//             } else {
//                 console.log('loading unloading record updated successfully:', changes);
//                 resolve(changes);
//             }
//         });
//     });
// });

// IPC handler for inserting Bhati records
// ipcMain.handle('db:insertBhatiRecords', async (event, bhatiData) => {   
//     // bhatiData already contains all necessary properties, including selectedEmployeeIds and selectedEmployeeNicknames
//     // The database function expects a single 'data' object.
//     return new Promise((resolve, reject) => {
//         db.insertBhatiRecords(bhatiData, (err, id) => { // Pass the entire bhatiData object
//             if (err) reject(err);
//             else resolve(id);
//         });
//     });
// });

// ipcMain.handle('db:getBhatiRecords', async (event,startDate,endDate) => {
//     return new Promise((resolve, reject) => {
//         db.getBhatiRecords(startDate,endDate,(err, rows) => {
//             if (err) reject(err);
//             else resolve(rows);
//         });
//     });
// });

// ipcMain.handle('db:deleteBhatiRecord', async (event, bhatiId) => {
//     return new Promise((resolve, reject) => {
//         console.log('Deleting Bhati record with ID in main.js:', bhatiId); // Debug log
//         db.deleteBhatiRecord(bhatiId, (err, changes) => {
//             if (err) reject(err);
//             else resolve(changes);
//         });
//     });
// }); 

// ipcMain.handle('db:updateBhatiRecord', async (event, bhatiData) => {
//     return new Promise((resolve, reject) => {
//         db.updateBhatiRecord(bhatiData, (err, changes) => {
//             if (err) {
//                 console.error('Error updating Bhati record:', err);
//                 reject(err);
//             } else {
//                 console.log('Bhati record updated successfully:', changes);
//                 resolve(changes);
//             }
//         });
//     });
// });

//ipc handlers for overtime records
// ipcMain.handle('db:insertOvertimeRecords', async (event, overtimeData) => {
//     // overtimeData already contains all necessary properties, including selectedEmployeeIds and selectedEmployeeNicknames
//     // The database function expects a single 'data' object.
//     return new Promise((resolve, reject) => {
//         db.insertOvertimeRecords(overtimeData, (err, id) => { // Pass the entire overtimeData object
//             if (err) reject(err);
//             else resolve(id);
//         });
//     });
// });

// ipcMain.handle('db:getOvertimePayments', async (event,startDate,endDate) => {
//     return new Promise((resolve, reject) => {   
//         db.getOvertimePayments(startDate,endDate,(err, rows) => {
//             if (err) reject(err);
//             else resolve(rows);
//         });
//     });
// });

// ipcMain.handle('db:deleteOvertimePayment', async (event, overtimeId) => {
//     return new Promise((resolve, reject) => {   
//         console.log('Deleting overtime payment with ID in main.js:', overtimeId); // Debug log
//         db.deleteOvertimePayment(overtimeId, (err, changes) => {
//             if (err) reject(err);
//             else resolve(changes);
//         });
//     });
// });

// ipcMain.handle('db:updateOvertimeRecord', async (event, overtimeData) => {
//     return new Promise((resolve, reject) => {
//         db.updateOvertimeRecord(overtimeData, (err, changes) => {
//             if (err) {
//                 console.error('Error updating overtime record:', err);
//                 reject(err);
//             } else {
//                 console.log('Overtime record updated successfully:', changes);
//                 resolve(changes);
//             }
//         });
//     });
// });

//IPC HANDLERS for miscellaneous functions
// ipcMain.handle('db:insertMiscRecord', async (event, data) => {   
   
//     return new Promise((resolve, reject) => {
//         db.insertMiscRecord(data, (err, id) => {
//             if (err) reject(err);
//             else resolve(id);
//         });
//     });
// });

// ipcMain.handle('db:getMiscRecords', async (event,startDate,endDate) => {
//     return new Promise((resolve, reject) => {
//         db.getMiscRecords(startDate,endDate,(err, rows) => {
//             if (err) reject(err);
//             else resolve(rows);
//         });
//     });
// });

// ipcMain.handle('db:deleteMiscRecord', async (event, misc_id) => {
//     return new Promise((resolve, reject) => {
//         console.log('Deleting Misc record with ID in main.js:', misc_id); // Debug log
//         db.deleteMiscRecord(misc_id, (err, changes) => {
//             if (err) reject(err);
//             else resolve(changes);
//         });
//     });
// });

// ipcMain.handle('db:updateMiscRecord', async (event, miscData) => {
//     return new Promise((resolve, reject) => {
//         db.updateMiscRecord(miscData, (err, changes) => {
//             if (err) reject(err);
//             else resolve(changes);
//         });
//     });
// }); 


// IPC handlers for common functions
ipcMain.handle('db:getRecordById', async (event,id,tableName,idColName) =>{
    return new Promise((resolve,reject) => {
        db.getRecordById(id,tableName,idColName,(err, row) => {
            if (err) {
                console.error(`Error fetching record from ${tableName} with ID ${id}:`, err);
                reject(err);
            } else {
                resolve(row);
            }
        });
    })
})

ipcMain.handle('db:getRecordWithEmployeesById', async (event, recordId, mainTable, mainIdColumn, employeeTable, employeeIdColumn) => {
    return new Promise((resolve, reject) => {
        db.getRecordWithEmployeesById(recordId, mainTable, mainIdColumn, employeeTable, employeeIdColumn, (err, result) => {
            if (err) {
                console.error(`Error fetching record with employees from ${mainTable} with ID ${recordId}:`, err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
});

// IPC handler for getting employee payment details
ipcMain.handle('db:getEmployeePaymentDetails', async (event, eid, startDate, endDate) => {
    console.log(`Fetching payment details for employee ID in main.js: ${eid} from ${startDate} to ${endDate}`);
    return new Promise((resolve, reject) => {
        db.getEmployeePaymentDetails(eid, startDate, endDate, (err, rows) => {
            if (err) {
                console.error('Error fetching employee payment details:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
});
