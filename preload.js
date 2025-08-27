// preload.js - Electron Preload Script

    console.log('Preload script is loading successfully!');
    const { contextBridge, ipcRenderer } = require('electron');


    // Expose a limited API to the renderer process
    contextBridge.exposeInMainWorld('electronAPI', {
       // Window control functions
      minimizeWindow: () => ipcRenderer.send('window:minimize'),
      maximizeWindow: () => ipcRenderer.send('window:maximize'),
      closeWindow: () => ipcRenderer.send('window:close'),

      //ipc handlers for Daily attendance taking
      checkNoOfActiveEmployees: (data) => ipcRenderer.invoke('db:checkNoOfActiveEmployees' , data),
      checkIfAttendanceExists: (data) => ipcRenderer.invoke('db:checkIfAttendanceExists' , data),
      insertDailyAttendance: (attendanceData) => ipcRenderer.invoke('db:insertDailyAttendance',attendanceData),
      getAttendanceGridData: (startDate, endDate, employeeId,position) => ipcRenderer.invoke('db:getAttendanceGridData',startDate, endDate, employeeId,position),
      upsertAttendanceRecord: (record) => ipcRenderer.invoke('db:upsertAttendanceRecord',record),
      //ipc handlers for weekly payments calculations and utility
      getAllEmployees: (eid,position) => ipcRenderer.invoke('db:getAllEmployees',eid,position),
      getAllEmployeesActive: () => ipcRenderer.invoke('db:getAllEmployeesActive'),
      getUnpaidEmployees: (weekStart) => ipcRenderer.invoke('db:getUnpaidEmployees', weekStart),
      getActiveEmployeesByPosition: (position) => ipcRenderer.invoke('db:getActiveEmployeesByPosition', position),
      getEmployeeById: (eid) => ipcRenderer.invoke('db:getEmployeeById', eid),
      getManagerEmployees: () => ipcRenderer.invoke('db:getManagerEmployees'),
      getLabourEmployees: () => ipcRenderer.invoke('db:getLabourEmployees'),
      getUniquePositionFromEmployees: () => ipcRenderer.invoke('db:getUniquePositionFromEmployees'),
      addEmployee: (employeeData) => ipcRenderer.invoke('db:addEmployee', employeeData),
      addAttendance: (attendanceData) => ipcRenderer.invoke('db:addAttendance', attendanceData),
      updateWeeklyPaymentRecord: (record) => ipcRenderer.invoke('db:updateWeeklyPaymentRecord', record),
      getFilteredRecords: (weekStart, year, month) => ipcRenderer.invoke('db:getFilteredRecords', weekStart, year, month),
      getWeeklyTotal: (weekStart) => ipcRenderer.invoke('db:getWeeklyTotal', weekStart),
      checkAttendanceExists: (eid, week_start) => ipcRenderer.invoke('db:checkAttendanceExists', eid, week_start),
      getDistinctYears: () => ipcRenderer.invoke('db:getDistinctYears'),
      getDistinctMonths: (year) => ipcRenderer.invoke('db:getDistinctMonths', year),
      getDistinctWeeks: (year, month) => ipcRenderer.invoke('db:getDistinctWeeks', year, month),
      deleteAttendanceRecord: (attendanceId) => ipcRenderer.invoke('db:deleteAttendanceRecord', attendanceId),
      // This new handler wraps the original attendance calculation logic
      recordAttendanceWithCalculation: (data) => ipcRenderer.invoke('db:recordAttendanceWithCalculation', data),
      deleteEmployee: (eid) => ipcRenderer.invoke('db:deleteEmployee', eid),
      updateEmployee: (eid, employeeData) => ipcRenderer.invoke('db:updateEmployee', eid, employeeData),

      // New IPC call for page navigation
      navigateTo: (pagePath) => ipcRenderer.send('navigate:page', pagePath),

      //IPC calls for generic insertion records
      insertRecord: (data) => ipcRenderer.invoke('db:insertRecord' , data),
      getRecords: (options,startDate,endDate) => ipcRenderer.invoke('db:getRecords' , options,startDate,endDate),
      deleteRecord: (data) => ipcRenderer.invoke('db:deleteRecord',data),
      updateRecord: (values) => ipcRenderer.invoke('db:updateRecord' , values),

      //IPC calls for packing records
      // addPacking: (packingData) => ipcRenderer.invoke('db:addPacking', packingData),
      // getPackingRecords: (startDate,endDate) => ipcRenderer.invoke('db:getPackingRecords', startDate, endDate),
      getUnpaidPackingEmployees: (work_date) => ipcRenderer.invoke('db:getUnpaidPackingEmployees', work_date),
      // deletePackingRecord: (packingId) => ipcRenderer.invoke('db:deletePackingRecord', packingId),
      // updatePackingRecord: (packingData) => ipcRenderer.invoke('db:updatePackingRecord', packingData),

      //IPC calls for bullBlock records
      // addBullBlock: (bullBlockData) => ipcRenderer.invoke('db:addBullBlock' , bullBlockData),
      // getBullBlockRecords: (startDate,endDate) => ipcRenderer.invoke('db:getBullBlockRecords',startDate,endDate),
      // deleteBullBlockRecord: (bullblock_id) => ipcRenderer.invoke('db:deleteBullBlockRecord', bullblock_id),
      // updateBullBlockRecord: (bullBlockData) => ipcRenderer.invoke('db:updateBullBlockRecord', bullBlockData),
      // getEmployeesForBullBlock: (work_date) => ipcRenderer.invoke('db:getEmployeesForBullBlock' , work_date),

      //IPC calls for loading/unloading records
      // insertLoadingUnloadingRecord: (recordData) => ipcRenderer.invoke('db:insertLoadingUnloadingRecord', recordData),
      // getLoadingUnloadingRecords: (startDate,endDate) => ipcRenderer.invoke('db:getLoadingUnloadingRecords',startDate,endDate),
      // deleteLoadingUnloadingRecord: (recordId) => ipcRenderer.invoke('db:deleteLoadingUnloadingRecord', recordId),
      // updateLoadingRecord: (ulId, data) => ipcRenderer.invoke('db:updateLoadingRecord', ulId, data),
      //IPC calls for bhati payments
      // insertBhatiRecords: (data) => ipcRenderer.invoke('db:insertBhatiRecords', data),
      // getBhatiRecords: (startDate,endDate) => ipcRenderer.invoke('db:getBhatiRecords',startDate,endDate),
      // deleteBhatiRecord: (bhatiId) => ipcRenderer.invoke('db:deleteBhatiRecord', bhatiId),
      // updateBhatiRecord: (bhatiId, data) => ipcRenderer.invoke('db:updateBhatiRecord', bhatiId, data),

      //IPC calls for overtime payment records
      // insertOvertimeRecords: (data) => ipcRenderer.invoke('db:insertOvertimeRecords', data),
      // getOvertimePayments: (startDate,endDate) => ipcRenderer.invoke('db:getOvertimePayments',startDate,endDate),
      // deleteOvertimePayment: (overtimeId) => ipcRenderer.invoke('db:deleteOvertimePayment', overtimeId),
      // updateOvertimeRecord: (overtimeId, data) => ipcRenderer.invoke('db:updateOvertimeRecord', overtimeId, data),

      //IPC CALLS for miscellaneous payment records
      // insertMiscRecord: (data) =>ipcRenderer.invoke('db:insertMiscRecord',data),
      // getMiscRecords: (startDate,endDate) => ipcRenderer.invoke('db:getMiscRecords',startDate,endDate),
      // deleteMiscRecord: (misc_id) => ipcRenderer.invoke('db:deleteMiscRecord', misc_id),
      // updateMiscRecord: (miscData) => ipcRenderer.invoke('db:updateMiscRecord', miscData),


      //IPC calls for common functions
      getRecordById: (id,tableName,idColName) => ipcRenderer.invoke('db:getRecordById',id,tableName,idColName),
      getRecordWithEmployeesById: (recordId, mainTable, mainIdColumn, employeeTable, employeeIdColumn) => ipcRenderer.invoke('db:getRecordWithEmployeesById', recordId, mainTable, mainIdColumn, employeeTable, employeeIdColumn),

      // IPC call for getting employee payment details
      getEmployeePaymentDetails: (eid, startDate, endDate) => ipcRenderer.invoke('db:getEmployeePaymentDetails', eid, startDate, endDate)
    });
    