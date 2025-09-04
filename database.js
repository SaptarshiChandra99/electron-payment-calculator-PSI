/**
 * Database module for handling SQLite database operations
 * Initializes tables and provides functions for data manipulation
 */
const sqlite3 = require('sqlite3').verbose();
const { get } = require('http');
const path = require('path'); // Add this line to import the path module

// Define the database path.
// If database.js is in 'db/' folder and 'attendance.db' is in the project root,
// then path.join(__dirname, '..', 'attendance.db') will correctly point to it.
const DB_PATH = path.join(__dirname, './', 'attendance.db');
console.log('Database path resolved to:', DB_PATH); // <-- ADDED DEBUGGING LOG HERE

const db = new sqlite3.Database(DB_PATH);

// Initialize database tables
db.serialize(() => {
    // Create employees table
    
    db.run(`
        CREATE TABLE IF NOT EXISTS employees (
            eid INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT default 'dummy' NOT NULL,
            nickname TEXT NOT NULL,
            mobile_no TEXT NOT NULL,
            position TEXT NOT NULL,
            rate_6 REAL NOT NULL,
            rate_7 REAL NOT NULL,
            has_benefits BOOLEAN NOT NULL DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            creation_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // db.run(`
    //         CREATE TABLE IF NOT EXISTS attendance (
    //         id INTEGER PRIMARY KEY AUTOINCREMENT, -- Auto-incrementing primary key
    //         employee_id INTEGER NOT NULL,           -- Foreign key referencing employees(eid)
    //         work_date DATE NOT NULL,
    //         attendance_type TEXT NOT NULL,       -- Stores comma-separated values like 'D,N,L' or 'A'
    //         overtime REAL DEFAULT 0.0,           -- REAL for floating-point numbers (e.g., 0.5, 1.0)
    //         duty REAL DEFAULT 0.0,               -- REAL for floating-point numbers
    //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //         FOREIGN KEY (employee_id) REFERENCES employees(eid), -- 
    //         UNIQUE (employee_id, work_date)   );   -- Enforces one attendance record per employee per day
    //     `);

    
    // Create weekly attendance table
    db.run(`
        CREATE TABLE IF NOT EXISTS weekly_payments (
            attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
            week_start DATE NOT NULL,
            week_end DATE NOT NULL,
            eid INTEGER NOT NULL,
            no_of_days INTEGER NOT NULL,
            rate REAL NOT NULL,
            overtime REAL NOT NULL,
            amount_to_pay REAL NOT NULL,
            remarks TEXT,
            FOREIGN KEY (eid) REFERENCES employees(eid),
            UNIQUE (week_start, week_end, eid)
        )
    `);

       
    db.run(
        `CREATE TABLE IF NOT EXISTS draw_machine_payments (
            bullblock_id INTEGER PRIMARY KEY AUTOINCREMENT,   
            work_date DATE NOT NULL,
            employee_id INTEGER NOT NULL,
            machine_no INTEGER NOT NULL,
            gauge REAL NOT NULL,
            weight REAL NOT NULL,
            rate INTEGER NOT NULL,
            amount_to_pay REAL NOT NULL,
            shift TEXT NOT NULL,
            remarks TEXT,
            paid_by INTEGER,
            payment_date date,
            no_of_coils INTEGER NOT NULL,
            FOREIGN KEY (paid_by) REFERENCES EMPLOYEES(eid),
            FOREIGN KEY (employee_id) REFERENCES employees(eid)
            UNIQUE (work_date , employee_id, shift,gauge)
        )`
    ); 
    
    db.run(`
        CREATE TABLE IF NOT EXISTS loading_unloading_payments (
            ul_id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_date DATE NOT NULL,
            lorry_number TEXT NOT NULL,
            type TEXT NOT NULL,
            weight REAL NOT NULL,
            paid_by INTEGER,
            rate INTEGER NOT NULL,
            amount_to_pay REAL NOT NULL,
            remarks TEXT,
            payment_date date,
            FOREIGN KEY (paid_by) REFERENCES employees(eid)
        )`
    ); 
    
    db.run(`
        CREATE TABLE IF NOT EXISTS loading_unloading_employees(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ul_id INTEGER NOT NULL,
            eid INTEGER NOT NULL,
            FOREIGN KEY (ul_id) REFERENCES loading_unloading_payments(loading_id),
            FOREIGN KEY (eid) REFERENCES employees(eid),
            UNIQUE(ul_id, eid)
            )`
        );

    db.run(`
        CREATE TABLE IF NOT EXISTS bhati_payments (
            bhati_id INTEGER PRIMARY KEY AUTOINCREMENT,
            week_start DATE NOT NULL,
            week_end DATE NOT NULL,
            employee_id INTEGER NOT NULL,
            shift TEXT NOT NULL,
            bhati_duty INTEGER NOT NULL,
            rate INTEGER NOT NULL,
            amount_to_pay REAL NOT NULL,
            paid_by INTEGER,
            payment_date date,
            remarks TEXT,
            FOREIGN KEY (employee_id) REFERENCES employees(eid)
            FOREIGN KEY (paid_by) REFERENCES employees(eid),
            UNIQUE (week_start,week_end,employee_id)
        )
    `);

    db.run(`
            CREATE TABLE IF NOT EXISTS misc_payments(
                misc_id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_date DATE NOT NULL,
                employee_id INTEGER NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                paid_by INTEGER,
                payment_date date,
                FOREIGN KEY(employee_id) REFERENCES employees(eid),
                FOREIGN KEY(paid_by) REFERENCES employees(eid)
                unique (work_date,employee_id,description)
                
            )`
    );
    
    
});

function checkNoOfActiveEmployees(date,callback){
    quary = 'SELECT count(*) as no_of_active_employees  from employees where is_active = 1';
    db.get(quary,callback);
}

//Database functions for Daily Attendance data

function checkIfAttendanceExists(date,callback){
    quary = 'SELECT count(*) as attendance_done from attendance where work_date = ?';
    const params = []
    params.push(date);
    db.get(quary,params,callback);
}
function insertDailyAttendance(dailyAttendanceRecords, callback) {
    if (!Array.isArray(dailyAttendanceRecords) || dailyAttendanceRecords.length === 0) {
        return callback(new Error("dailyAttendanceRecords must be a non-empty array."));
    }

    // Use a transaction for better performance when inserting multiple records
    db.serialize(() => {
        db.run("BEGIN TRANSACTION;");
        const stmt = db.prepare('INSERT OR REPLACE INTO attendance (employee_id, work_date, attendance_type, overtime, duty) VALUES (?, ?, ?, ?, ?)');

        let successfulInserts = 0;
        let errors = [];

        dailyAttendanceRecords.forEach(record => {
            const { employeeId, date, attendanceType, overtime, duty } = record;
            console.log(employeeId, date, attendanceType, overtime, duty);
            stmt.run([employeeId, date, attendanceType, overtime, duty], function(err) {
                if (err) {
                    console.error('Error inserting daily attendance for employee_id', employeeId, 'on', date, ':', err.message);
                    errors.push({ employeeId, date, error: err.message });
                } else {
                    successfulInserts++;
                }
            });
        });

        stmt.finalize(() => {
            db.run("COMMIT;", (commitErr) => {
                if (commitErr) {
                    db.run("ROLLBACK;");
                    return callback(commitErr);
                }
                 callback(null, {
                    inserted: successfulInserts,
                    failed: errors.length,
                    errors: errors
                });
            });
        });
    });
}

function getAttendanceGridData(startDate, endDate, employeeId,position) {
    console.log('Fetching attendance grid data from', startDate, 'to', endDate, 'for employeeId:', employeeId, 'and position:', position);
    return new Promise((resolve, reject) => {
        // First get all distinct dates in the range
        const dateQuery = `
            SELECT DISTINCT work_date 
            FROM attendance 
            WHERE work_date BETWEEN ? AND ?
            ORDER BY work_date ASC
        `;
        
        db.all(dateQuery, [startDate, endDate], (err, dateRows) => {
            if (err) return reject(err);
            const dates = dateRows.map(row => row.work_date);

            // Then get all employees (either all or filtered by employeeId)
            let employeeQuery = `
                SELECT e.eid, e.nickname ,e.position 
                FROM employees e
                WHERE is_active=1
            `;
            const employeeParams = [];
            
            if (employeeId) {
                employeeQuery += ' AND e.eid = ?';
                employeeParams.push(employeeId);
            }
            if(position && position !== ''){
                employeeQuery += ' AND e.position = ?';
                employeeParams.push(position);
            }
            employeeQuery += ' ORDER BY e.position ASC';
           
            
            db.all(employeeQuery, employeeParams, (err, employeeRows) => {
                if (err) return reject(err);
                
                // Now get all attendance records for these dates and employees
                const attendanceQuery = `
                    SELECT a.employee_id, a.work_date, a.attendance_type, a.overtime, a.duty
                    FROM attendance a
                    WHERE a.work_date BETWEEN ? AND ?
                    ${employeeId ? 'AND a.employee_id = ?' : ''}
                    ORDER BY a.work_date ASC
                `;
                
                const attendanceParams = [startDate, endDate];
                if (employeeId) attendanceParams.push(employeeId);
                
                db.all(attendanceQuery, attendanceParams, (err, attendanceRows) => {
                    if (err) return reject(err);
                    
                    // Organize the data into a grid structure
                    const result = {
                        dates: dates,
                        employees: employeeRows.map(emp => {
                            const employeeData = {
                                eid: emp.eid,
                                name: emp.nickname,
                                position: emp.position,
                                attendance: {}
                            };
                            
                            // Initialize all dates with empty values
                            dates.forEach(date => {
                                employeeData.attendance[date] = {
                                    types: [],
                                    overtime: 0,
                                    duty: 0
                                };
                            });
                            
                            // Fill in the actual attendance data
                            attendanceRows
                                .filter(att => att.employee_id === emp.eid)
                                .forEach(att => {
                                    employeeData.attendance[att.work_date] = {
                                        types: att.attendance_type.split(','),
                                        overtime: att.overtime,
                                        duty: att.duty
                                    };
                                });
                            
                            return employeeData;
                        })
                    };
                    
                    resolve(result);
                });
            });
        });
    });
}

// UPSERT attendance record (insert or update)
function upsertAttendanceRecord(record, callback) {
    const { date, employeeId, attendanceType, overtime, duty } = record;
    
    db.run(
        `INSERT OR REPLACE INTO attendance 
         (employee_id, work_date, attendance_type, overtime, duty) 
         VALUES (?, ?, ?, ?, ?)`,
        [employeeId, date, attendanceType, overtime, duty],
        function(err) {
            callback(err, this.changes);
        }
    );
}


// Get all employees
function getAllEmployees(eid,position,callback) {
    let quary = 'SELECT * FROM employees';
    let params = [];
    if(eid && position){
        quary += ' WHERE  eid = ? AND position = ? ';
        params.push(`${eid}` ,position);
    } 
    else if(eid) {
        quary += ' WHERE eid = ?' ;
        params.push(`${eid}`);
    }
    else if (position) {
        quary += ' WHERE position = ?';
        params.push(position);
    }  
    console.log('Executing Quary: ',quary, ' with params: ' ,params);
    db.all(quary,params,callback); 
   // db.all('SELECT * FROM employees', [], callback);
}

function getAllEmployeesActive(callback){
    db.all("SELECT * FROM EMPLOYEES WHERE is_active = 1" , [] ,callback);
}

function getManagerEmployees(callback) {
    db.all('SELECT * FROM employees WHERE position = "Manager"', [], callback);
}   

function getLabourEmployees(callback) {
    db.all('SELECT * FROM employees WHERE position = "Labour" and is_active = 1', [], callback);  
}  

function getActiveEmployeesByPosition(position,callback){
    quary = 'SELECT * FROM EMPLOYEES WHERE is_active = 1';
    params = [];
    if (position != '') {
         quary  +=  ' AND position = ? '
         params.push(position);
    }
       
    //db.all('SELECT * FROM EMPLOYEES WHERE POSITION = ? AND is_active = 1', [position], callback);
    db.all(quary,params,callback);
}

// Get employees who have not been paid for a specific week
/**
 * Retrieves employees who haven't been paid for a specific week
 * @param {string} week_start - Start date of the week in YYYY-MM-DD format
 * @returns {Promise<Array<Object>>} Array of unpaid employee objects
 * @throws {Error} If database operation fails
 */
function getUnpaidEmployees(week_start, callback) {
    db.all(`
        SELECT e.* FROM employees e
        LEFT JOIN weekly_payments wa ON e.eid = wa.eid AND wa.week_start = ?
        WHERE wa.attendance_id IS NULL and e.is_active = 1 and e.position != 'draw machine'
    `, [week_start], callback);
}

// Get employee by ID
/**
 * Retrieves specific employee details by ID
 * @param {number} eid - Employee ID
 * @returns {Promise<Object>} Object containing rate_6, rate_7, and has_benefits for the employee
 * @throws {Error} If database operation fails or employee not found
 */
function getEmployeeById(eid, callback) {
    db.get('SELECT * FROM employees WHERE eid = ?', [eid], callback);
}

function getUniquePositionFromEmployees(callback){
    db.all('SELECT DISTINCT position FROM employees',[],callback);
}

// Add a new employee
/**
 * Adds a new employee to the database
 * @param {string} fullname - Employee's full name
 * @param {string} nickname - Employee's nickname
 * @param {string} mobile_no - Employee's mobile number
 * @param {string} position - Employee's position
 * @param {number} rate_6 - Employee's rate for 6 days
 * @param {number} rate_7 - Employee's rate for 7 days
 * @param {boolean} has_benefits - Whether employee has benefits
 * @returns {Promise<number>} The ID of the newly created employee
 * @throws {Error} If database operation fails
 */
function addEmployee(fullname, nickname, mobile_no, position, rate_6, rate_7, has_benefits, callback) {
    console.log('Adding employee in database:', { fullname, nickname, mobile_no, position,  rate_6, rate_7, has_benefits });
    db.run(
        'INSERT INTO employees (name, nickname, mobile_no, position,  rate_6, rate_7, has_benefits) VALUES (?, ?, ?, ?, ? , ?, ?)',
        [fullname, nickname, mobile_no, position, rate_6, rate_7, has_benefits ? 1 : 0],
        function(err) {
            callback(err, this.lastID);
        }
    );
}

// Add attendance record
/**
 * Adds an attendance record for an employee
 * @param {string} week_start - Start date of the week in YYYY-MM-DD format
 * @param {string} week_end - End date of the week in YYYY-MM-DD format
 * @param {number} eid - Employee ID
 * @param {number} no_of_duties - Total hours worked in the week
 * @param {number} no_of_days - Number of days worked
 * @param {number} rate - Hourly rate used for calculation
 * @param {number} payment - Gross payment amount
 * @param {number} benefits - Benefits amount deducted
 * @returns {Promise<number>} The ID of the newly created attendance record
 * @throws {Error} If database operation fails or validation fails
 */
function addAttendance(attendanceData, callback) {
    const { week_start,week_end, eid, no_of_days,rate, overtime,amount_to_pay,remarks } = attendanceData;
    db.run(
        'INSERT INTO weekly_payments (week_start,week_end , eid, no_of_days,rate,overtime,amount_to_pay,remarks) VALUES (?, ?, ?, ?, ?, ? , ?, ?)',
        [week_start,week_end, eid, no_of_days,rate, overtime,amount_to_pay,remarks],
        function(err) {
            callback(err, this.lastID);
        }
    );
}

// Get all attendance records with employee names
function getAllRecords(callback) {
    db.all(`
SELECT e.nickname,CONCAT('(',wa . week_start,')','-','(',wa . week_end,')') as week_range,
       wa.rate,
       wa.no_of_days,
       wa.payment, 
       wa.benefits ,
       wa.amount_payable
FROM weekly_payments wa
JOIN employees e ON wa.eid = e.eid
ORDER BY wa.week_start DESC
    `, [], callback);
}

function updateWeeklyPaymentRecord(data,callback){
    const { attendanceId, week_start, week_end, eid, no_of_days, rate, overtime, amount_to_pay,remarks } = data;

    console.log('Updating weekly payments record:', { attendanceId, week_start, week_end, eid, no_of_days, rate, overtime, amount_to_pay,remarks });

    db.run(
        `UPDATE weekly_payments 
         SET week_start = ?, week_end = ?, eid = ?, no_of_days = ?, rate = ?, amount_to_pay = ?, overtime = ? ,remarks = ?
         WHERE attendance_id = ?`,
        [week_start, week_end, eid, no_of_days, rate, amount_to_pay, overtime,remarks, attendanceId],
        function(err) {
            if (err) return callback(err);
            // Return the number of affected rows
            callback(null, this.changes);
        }
    );
}

function getAllWeeks(callback) {
    db.all(`
        SELECT DISTINCT week_start, week_end 
        FROM weekly_payments 
        ORDER BY week_start DESC
    `, [], callback);
}

// Get filtered attendance records
// Get filtered attendance records - UPDATED TO HANDLE YEAR AND MONTH
function getFilteredRecords(week_start, year, month, callback) {
    let query = `
        SELECT wa.attendance_id ,e.nickname, 
               CONCAT('(', wa.week_start, ') - (', wa.week_end, ')') as week_range,
               wa.rate,
                wa.no_of_days,
               wa.overtime, 
               wa.amount_to_pay
        FROM weekly_payments wa
        JOIN employees e ON wa.eid = e.eid 
    `;
    const params = [];

    let whereClauses = [];

    if (week_start) {
        whereClauses.push('wa.week_start = ?');
        params.push(week_start);
    }
    // Apply year filter if it's provided
    if (year) {
        console.log('Filtering by year:', year); // Debugging log
        whereClauses.push('strftime("%Y", wa.week_start) = ?');
        params.push(year);
    }
    // Apply month filter if it's provided
    if (month) {
        whereClauses.push('strftime("%m", wa.week_start) = ?');
        params.push(month.padStart(2, '0')); // Ensure month is '01', '02' etc.
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    query += ' ORDER BY wa.week_start DESC';
    console.log('Executing query:', query, 'with params:', params); // Debugging log
    
    db.all(query, params, callback);
}

function getWeeklyTotal(week_start, callback) {
    console.log('Calculating weekly total for week starting:', week_start);
    db.get('SELECT sum(amount_payable) as total,count(*) as count from weekly_payments where week_start = ?', [week_start], callback);
}

function checkAttendanceExists(eid, week_start, callback) {
        db.get(
            'SELECT 1 FROM weekly_payments WHERE eid = ? AND week_start = ?',
            [eid, week_start],
            (err, row) => {
                callback(err, !!row);
            }
        );
}    

/**
 * Retrieves distinct years from attendance records
 * @returns {Promise<Array<string>>} Array of distinct years
 * @throws {Error} If database operation fails
 */
function getDistinctYears(callback) {
    db.all(`
        SELECT DISTINCT strftime('%Y', week_start) as year 
        FROM weekly_payments 
        ORDER BY year DESC
    `, [], (err, rows) => {
        if (err) return callback(err);
        callback(null, rows.map(row => row.year));
    });
}

/**
 * Retrieves distinct months for a specific year from attendance records
 * @param {string} year - The year to filter by (YYYY format)
 * @returns {Promise<Array<string>>} Array of distinct months (MM format)
 * @throws {Error} If database operation fails
 */
function getDistinctMonths(year, callback) {
    db.all(`
        SELECT DISTINCT strftime('%m', week_start) as month 
        FROM weekly_payments 
        WHERE strftime('%Y', week_start) = ?
        ORDER BY month DESC
    `, [year], (err, rows) => {
        if (err) return callback(err);
        callback(null, rows.map(row => row.month));
    });
}

/**
 * Retrieves distinct weeks with optional year and month filtering
 * @param {string} [year] - Optional year filter (YYYY format)
 * @param {string} [month] - Optional month filter (MM format)
 * @returns {Promise<Array<Object>>} Array of objects with week_start and week_end
 * @throws {Error} If database operation fails
 */
function getDistinctWeeks(year, month, callback) {
    let query = `
        SELECT DISTINCT week_start, week_end 
        FROM weekly_payments
    `;
    const params = [];
    
    if (year) {
        query += ' WHERE strftime("%Y", week_start) = ?';
        params.push(year);
        
        if (month) {
            query += ' AND strftime("%m", week_start) = ?';
            params.push(month.padStart(2, '0'));
        }
    }
    
    query += ' ORDER BY week_start DESC';
    
    db.all(query, params, callback);
}

function deleteAttendanceRecord(attendanceId, callback) {
    db.run('DELETE FROM weekly_payments WHERE attendance_id = ?', [attendanceId], function(err) {
        callback(err, this.changes);
    });
}

//delte employee by ID
function deleteEmployee(eid, callback) {
    db.run('DELETE FROM employees WHERE eid = ?', [eid], function(err) {
        callback(err, this.changes);
    });
}

// Function to update an employee
function updateEmployee(employee) {
    return new Promise((resolve, reject) => {
        const { eid, fullname, nickname, mobile_no, position, rate_6, rate_7, has_benefits,is_active } = employee;
        db.run(`UPDATE employees SET Name = ?, nickname = ?, mobile_no = ?, position = ?, rate_6 = ?, rate_7 = ?, has_benefits = ?, is_active = ? WHERE eid = ?`,
            [fullname, nickname, mobile_no, position, rate_6, rate_7, has_benefits ? 1 : 0, is_active ? 1 : 0, eid],
            function(err) {
                if (err) {
                    console.error('Error updating employee:', err.message);
                    reject(err);
                } else {
                    console.log(`Rows updated: ${this.changes}`);
                    resolve(this.changes); // Number of rows updated
                }
            }
        );
    });
}


//general database function for  inserion,updation,deletion,fetching
/**
 * Generalized function to insert records into a main table and a related junction table
 * @param {string} mainTable - Name of the main table
 * @param {string} junctionTable - Name of the junction table (optional)
 * @param {string[]} mainTableColumns - Column names for the main table
 * @param {Object} data - Data object containing values for main table
 * @param {string} [junctionRefColumn] - Column name in junction table that references main table
 * @param {string} [junctionFkColumn] - Column name in junction table for the foreign key
 * @param {string[]} [junctionFkValues] - Array of foreign key values for junction table
 * @param {function} callback - Callback function (err, insertedId)
 */
function insertRecord( {mainTable,junctionTable,mainTableColumns,data,junctionRefColumn,junctionFkColumn,junctionFkValues
}, callback) {
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        try {
            // Build the main insert query
            const placeholders = mainTableColumns.map(() => '?').join(', ');
            const query = `INSERT INTO ${mainTable} (${mainTableColumns.join(', ')}) VALUES (${placeholders})`;
            console.log(quary);
            
            // Extract values in the order of mainTableColumns
            const values = mainTableColumns.map(col => data[col]);
            console.log(values);

            // Insert into main table
            db.run(query, values, function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return callback(err);
                }

                const insertedId = this.lastID;

                // If no junction table needed, just commit
                if (!junctionTable || !junctionFkValues || junctionFkValues.length === 0) {
                    db.run("COMMIT", (err) => {
                        callback(err, insertedId);
                    });
                    return;
                }

                // Insert into junction table
                const stmt = db.prepare(
                    `INSERT INTO ${junctionTable} (${junctionRefColumn}, ${junctionFkColumn}) VALUES (?, ?)`
                );
                console.log(stmt , junctionFkValues);

                junctionFkValues.forEach(fkValue => {
                    stmt.run(insertedId, fkValue);
                });

                stmt.finalize((err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return callback(err);
                    }

                    db.run("COMMIT", (err) => {
                        callback(err, insertedId);
                    });
                });
            });
        } catch (err) {
            db.run("ROLLBACK");
            callback(err);
        }
    });
}

/**
 * Generic function to fetch payment/records with optional junction employee mapping
 * @param {Object} options 
 * @param {string} options.mainTable - Main table name (e.g. 'overtime_payments')
 * @param {string} options.mainAlias - Alias for main table (e.g. 'otp')
 * @param {string} options.idColumn - Primary key column in main table (e.g. 'ot_id')
 * @param {string} options.dateColumn - Date column name (e.g. 'work_date')
 * @param {string} [options.junctionTable] - Optional junction table (e.g. 'overtime_employees')
 * @param {string} [options.junctionAlias] - Alias for junction table (e.g. 'ote')
 * @param {string} [options.junctionMainId] - FK column in junction table pointing to main ID (e.g. 'ot_id')
 * @param {boolean} [options.groupEmployees] - Whether to group multiple employees (uses GROUP_CONCAT)
 * @param {function} callback - Callback with (err, rows)
 */
function getRecords(options, startDate, endDate, callback) {
    const {
        mainTable,
        mainAlias,
        idColumn,
        dateColumn,
        junctionTable,
        junctionAlias,
        junctionMainId,
        groupEmployees
    } = options;

    let query = `
        SELECT ${mainAlias}.*, 
               ${groupEmployees ? `GROUP_CONCAT(e.nickname, ', ') AS employee_nicknames,` : ''}
               p.nickname AS paid_by
        FROM ${mainTable} ${mainAlias}
    `;

    if (junctionTable) {
        query += `
        LEFT JOIN ${junctionTable} ${junctionAlias} 
               ON ${mainAlias}.${idColumn} = ${junctionAlias}.${junctionMainId}
        LEFT JOIN employees e ON ${junctionAlias}.eid = e.eid
        `;
    } else {
        query += `
        LEFT JOIN employees e ON ${mainAlias}.employee_id = e.eid
        `;
    }

    query += `
        LEFT JOIN employees p ON ${mainAlias}.paid_by = p.eid
        WHERE ${mainAlias}.${dateColumn} BETWEEN ? AND ?
    `;

    if (groupEmployees) {
        query += ` GROUP BY ${mainAlias}.${idColumn}`;
    }

    query += ` ORDER BY ${mainAlias}.${dateColumn} DESC`;
    console.log(query);

    db.all(query, [startDate, endDate], callback);
}

/**
 * Generic delete function (works with or without junction table)
 * @param {string} mainTable - Main table name (e.g. 'overtime_payments')
 * @param {string} mainIdColumn - Primary key column in main table (e.g. 'ot_id')
 * @param {number} id - Record ID
 * @param {string} junctionTable - Junction table name (e.g. 'overtime_employees')
 * @param {string} junctionRefColumn - Junction column that references main ID (e.g. 'ot_id')
 * @param {function} callback - Callback (err, changes)
 */
function deleteRecord(data, callback) {
    const {mainTable ,mainIdColumn,id,junctionTable,junctionRefColumn} = data;
   // console.log(mainTable ,mainIdColumn,id,junctionTable,junctionRefColumn + "in db file");
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const deleteMain = () => {
            db.run(`DELETE FROM ${mainTable} WHERE ${mainIdColumn} = ?`, [id], function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return callback(err);
                }
                db.run("COMMIT", (commitErr) => {
                    callback(commitErr, this.changes);
                });
            });
        };

        if (junctionTable && junctionRefColumn) {
            // Delete from junction first
            db.run(`DELETE FROM ${junctionTable} WHERE ${junctionRefColumn} = ?`, [id], function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return callback(err);
                }
                deleteMain();
            });
        } else {
            // No junction table → just delete main
            deleteMain();
        }
    });
}

/**
 * Generic update function (works with or without junction table)
 * @param {string} mainTable - Main table name (e.g. 'overtime_payments')
 * @param {string} mainIdColumn - Primary key column (e.g. 'ot_id')
 * @param {number} id - Record ID to update
 * @param {Object} data - Key/value pairs of columns to update
 * @param {Object} [junction] - Optional junction config
 * @param {string} junction.table - Junction table name (e.g. 'overtime_employees')
 * @param {string} junction.refColumn - Column in junction that references main table ID
 * @param {number[]} [junction.employeeIds] - Array of employee IDs to assign
 * @param {function} callback - Callback (err, changes)
 */
function updateRecord(features, callback) {

    const {mainTable, mainIdColumn, id, data, junctionTable,junctionRefColumn,junctionFkValues} = features;

    console.log(features);
    
    const keys = Object.keys(data);
    const values = Object.values(data);

    if (keys.length === 0) {
        return callback(new Error('No fields to update'));
    }

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const query = `UPDATE ${mainTable} SET ${setClause} WHERE ${mainIdColumn} = ?`;

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run(query, [...values, id], function (err) {
           
            if (err) {
                db.run("ROLLBACK");
                return callback(err);
            }
             

            if (junctionTable && junctionRefColumn) {
                // Update employee assignments if provided
                console.log(junctionTable,    junctionRefColumn,  id, junctionFkValues);
                updateEmployeeAssignments(
                    db,
                    junctionTable,
                    junctionRefColumn,
                    id,
                    junctionFkValues || [],
                    (err2) => {
                        if (err2) {
                            db.run("ROLLBACK");
                            return callback(err2);
                        }
                        db.run("COMMIT", (commitErr) => {
                            callback(commitErr, this.changes);
                        });
                    }
                );
            } else {
                db.run("COMMIT", (commitErr) => {
                    callback(commitErr, this.changes);
                });
            }
        });
    });
}


//common functions

function updateEmployeeAssignments(db, table, parentIdColumn, parentId, employeeIds, callback) {
    console.log('Updating employee assignments for table:', table, 'parentIdColumn:', parentIdColumn, 'parentId:', parentId, 'employeeIds:', employeeIds);
    db.serialize(() => {
        db.run(`DELETE FROM ${table} WHERE ${parentIdColumn} = ?`, [parentId], (err) => {
            if (err) {
                return callback(err);
            }

            if (employeeIds.length === 0) {
                return callback(null); // No employees to insert
            }

            const stmt = db.prepare(`INSERT INTO ${table} (${parentIdColumn}, eid) VALUES (?, ?)`);
            const insertTasks = employeeIds.map(eid => {
                return new Promise((resolve, reject) => {
                    stmt.run(parentId, eid, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });

             console.log('here in 2nd part in db');

            Promise.all(insertTasks)
                .then(() => {
                    stmt.finalize((err) => {
                        callback(err);
                    });
                })
                .catch(err => {
                    stmt.finalize(() => callback(err)); // Ensure finalize is called
                });
        });
    });
}

function getRecordById(id,tableName,idColName,callback){
    db.get(`SELECT * FROM ${tableName} WHERE ${idColName} = ?` ,[id],callback);
}

// New reusable function to fetch a record with associated employee IDs
function getRecordWithEmployeesById(recordId, mainTable, mainIdColumn, employeeTable, employeeIdColumn, callback) {
    // Validate inputs to prevent SQL injection
    // const allowedMainTables = ['overtime_payments', 'bhati_payments', 'loading_unloading_payments'];
    // const allowedEmployeeTables = ['overtime_employees', 'bhati_employees', 'loading_unloading_employees'];
    // const allowedMainIdColumns = ['ot_id', 'bhati_id', 'ul_id'];
    // const allowedEmployeeIdColumns = ['ot_id', 'bhati_id', 'ul_id'];

    // if (!allowedMainTables.includes(mainTable) || !allowedEmployeeTables.includes(employeeTable) ||
    //     !allowedMainIdColumns.includes(mainIdColumn) || !allowedEmployeeIdColumns.includes(employeeIdColumn)) {
    //     return callback(new Error(`Invalid table or column name: mainTable=${mainTable}, employeeTable=${employeeTable}, mainIdColumn=${mainIdColumn}, employeeIdColumn=${employeeIdColumn}`));
    // }

    if (!recordId) {
        return callback(new Error('Invalid recordId: Must be provided.'));
    }

    db.serialize(() => {
        // Fetch the main record
        db.get(
            `SELECT * FROM ${mainTable} WHERE ${mainIdColumn} = ?`,
            [recordId],
            (err, record) => {
                if (err) {
                    return callback(err);
                }
                if (!record) {
                    return callback(null, null); // No record found
                }

                // Fetch associated employee IDs
                db.all(
                    `SELECT eid FROM ${employeeTable} WHERE ${employeeIdColumn} = ?`,
                    [recordId],
                    (err, employeeRows) => {
                        if (err) {
                            return callback(err);
                        }

                        // Combine the main record with employee IDs
                        const result = {
                            record,
                            employeeIds: employeeRows.map(row => row.eid)
                        };
                        callback(null, result);
                    }
                );
            }
        );
    });
}


//function for view records details page
/**
 * Fetches all payment records for a given employee within a date range.
 * @param {number} employeeId - The ID of the employee.
 * @param {string} startDate - The start date (YYYY-MM-DD).
 * @param {string} endDate - The end date (YYYY-MM-DD).
 * @returns {Promise<Object>} An object containing an array of records for each payment type.
 */
/**
 * Fetches all payment records for a given employee within a date range.
 * @param {number} employeeId - The ID of the employee.
 * @param {string} startDate - The start date (YYYY-MM-DD).
 * @param {string} endDate - The end date (YYYY-MM-DD).
 * @returns {Promise<Object>} An object containing an array of records for each payment type.
 */
function getEmployeePaymentDetails(employeeId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        const weeklyPromise = new Promise((res, rej) => {
            db.all('SELECT * FROM weekly_payments WHERE eid = ? AND week_start BETWEEN ? AND ?', [employeeId, startDate, endDate], (err, rows) => {
                if (err) rej(err);
                else res(rows);
            });
        });

        const bhatiPromise = new Promise((res, rej) => {
            db.all('SELECT * FROM bhati_payments WHERE employee_id = ? AND week_start BETWEEN ? AND ?', [employeeId, startDate, endDate], (err, rows) => {
                if (err) rej(err);
                else res(rows);
            });
        });

        const drawMachinePromise = new Promise((res, rej) => {
            db.all('SELECT * FROM draw_machine_payments WHERE employee_id = ? AND work_date BETWEEN ? AND ?', [employeeId, startDate, endDate], (err, rows) => {
                if (err) rej(err);
                else res(rows);
            });
        });

        const luPromise = new Promise((res, rej) => {
            const luQuery = `
                SELECT l.*
                FROM loading_unloading_payments l
                JOIN loading_unloading_employees le ON l.ul_id = le.ul_id
                WHERE le.eid = ? AND l.work_date BETWEEN ? AND ?
            `;
            db.all(luQuery, [employeeId, startDate, endDate], (err, rows) => {
                if (err) rej(err);
                else res(rows);
            });
        });

        const miscPromise = new Promise((res, rej) => {
            db.all('SELECT * FROM misc_payments WHERE employee_id = ? AND work_date BETWEEN ? AND ?', [employeeId, startDate, endDate], (err, rows) => {
                if (err) rej(err);
                else res(rows);
            });
        });

        Promise.all([weeklyPromise, bhatiPromise, drawMachinePromise, luPromise, miscPromise])
            .then(([weeklyPayments, bhatiPayments, drawMachinePayments, loadingUnloadingPayments, miscPayments]) => {
                resolve({
                    weeklyPayments,
                    bhatiPayments,
                    drawMachinePayments,
                    loadingUnloadingPayments,
                    miscPayments
                });
            })
            .catch(err => {
                reject(err);
            });
    });
}
// function getEmployeePaymentDetails(employeeId, startDate, endDate) {
//     return new Promise((resolve, reject) => {
//         db.serialize(() => {
//             const results = {
//                 weeklyPayments: [],
//                 bhatiPayments: [],
//                 drawMachinePayments: [],
//                 loadingUnloadingPayments: [],
//                 miscPayments: []
//             };

//             const checkAndResolve = () => {
//                 const allQueriesDone = Object.values(results).every(arr => arr !== null);
//                 if (allQueriesDone) {
//                     resolve(results);
//                 }
//             };

//             // Query for weekly payments
//             db.all(
//                 'SELECT * FROM weekly_payments WHERE eid = ? AND week_start BETWEEN ? AND ?',
//                 [employeeId, startDate, endDate],
//                 (err, rows) => {
//                     if (err) return reject(err);
//                     results.weeklyPayments = rows;
//                     checkAndResolve();
//                 }
//             );

//             // Query for bhati payments
//             db.all(
//                 'SELECT * FROM bhati_payments WHERE employee_id = ? AND week_start BETWEEN ? AND ?',
//                 [employeeId, startDate, endDate],
//                 (err, rows) => {
//                     if (err) return reject(err);
//                     results.bhatiPayments = rows;
//                     checkAndResolve();
//                 }
//             );

//             // Query for draw machine payments
//             db.all(
//                 'SELECT * FROM draw_machine_payments WHERE employee_id = ? AND work_date BETWEEN ? AND ?',
//                 [employeeId, startDate, endDate],
//                 (err, rows) => {
//                     if (err) return reject(err);
//                     results.drawMachinePayments = rows;
//                     checkAndResolve();
//                 }
//             );

//             // Query for loading/unloading payments using the junction table
//             const luQuery = `
//                 SELECT l.*
//                 FROM loading_unloading_payments l
//                 JOIN loading_unloading_employees le ON l.ul_id = le.ul_id
//                 WHERE le.eid = ? AND l.work_date BETWEEN ? AND ?
//             `;
//             db.all(luQuery, [employeeId, startDate, endDate], (err, rows) => {
//                 if (err) return reject(err);
//                 results.loadingUnloadingPayments = rows;
//                 checkAndResolve();
//             });

//             // Query for miscellaneous payments
//             db.all(
//                 'SELECT * FROM misc_payments WHERE employee_id = ? AND work_date BETWEEN ? AND ?',
//                 [employeeId, startDate, endDate],
//                 (err, rows) => {
//                     if (err) return reject(err);
//                     results.miscPayments = rows;
//                     checkAndResolve();
//                 }
//             );
//         });
//     });
// }



module.exports = {
    checkNoOfActiveEmployees,
    checkIfAttendanceExists,
    insertDailyAttendance,
    getAttendanceGridData,
    upsertAttendanceRecord,
    //weekly payment function and utility
    getAllEmployees,
    getAllEmployeesActive,
    getActiveEmployeesByPosition,
    getManagerEmployees,
    getLabourEmployees,
    getEmployeeById,
    getUniquePositionFromEmployees,
    addEmployee,
    addAttendance,
    getAllRecords,
    updateWeeklyPaymentRecord,
    getUnpaidEmployees,
    getAllWeeks,
    getFilteredRecords,
    getWeeklyTotal,
    checkAttendanceExists,
    getDistinctYears,
    getDistinctMonths,
    getDistinctWeeks,
    deleteAttendanceRecord,
    deleteEmployee,
    updateEmployee,
    //generic insert function
    insertRecord,
    getRecords,
    deleteRecord,
    updateRecord,
    //common functions
    getRecordById,
    getRecordWithEmployeesById,
    // Employee payment details function
    getEmployeePaymentDetails
};