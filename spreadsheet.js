const { GoogleSpreadsheet } = require('google-spreadsheet');
const key = require('./server-key.json');

const CREDENTIALS_ID = 0;
const LEADERBOARD_ID = 1618630879;
const STATISTICS_ID = 1981752792;
const GROUPS_ID = [];

async function init() {
    const doc = new GoogleSpreadsheet('1vYE0U_GbDKHW5ZZsUqt4d6-3UOYeehwM8tWS5VQxTbE');
    await doc.useServiceAccountAuth(key);
    await doc.loadInfo();
    return doc;
}

async function total(doc) {
    const sheet = doc.sheetsById[STATISTICS_ID];
    await sheet.loadCells();
    return sheet.getCellByA1('B1').value;
}

async function accessSheet(sheet, total) {
    await sheet.loadHeaderRow();
    await sheet.loadCells();
    const rows = await sheet.getRows({offset: 0, limit: total});
    const headers = sheet.headerValues;

    let JSON = [];
    for (const row of rows) {
        let obj = {};
        for (let i = 0; i < headers.length; i++) {
            obj[headers[i]] = row[headers[i]];
        }
        JSON.push(obj);
    }
    return JSON;
}

async function accessCredentials() {
    const doc = await init();
    const totalGroups = await total(doc);
    const sheet = doc.sheetsById[CREDENTIALS_ID];
    return accessSheet(sheet, totalGroups);
}

async function accessLeaderboard() {
    const doc = await init();
    const totalGroups = await total(doc);
    const sheet = doc.sheetsById[LEADERBOARD_ID];
    return accessSheet(sheet, totalGroups);
}

async function save(newGroup) {
    const doc = await init();
    const totalGroups = await total(doc);
    newGroup.ID = totalGroups + 1;
    await doc.sheetsById[CREDENTIALS_ID].addRow(newGroup);

    const newSheet = await doc.addSheet({
        title: `Group ${newGroup.ID}`, index: 2 + newGroup.ID });
    await newSheet.setHeaderRow(["Puzzles", "Solved", "Score"]);
    GROUPS_ID[newGroup.ID - 1] = newSheet.sheetId;

    const sheet = await doc.sheetsById[LEADERBOARD_ID];
    await sheet.loadCells('C1:C30');
    sheet.getCell(newGroup.ID, 2).formula = `=IF(ISBLANK(A:A),"",0 + SUM(\'Group ${newGroup.ID}\'!C:C))`;
    await sheet.saveUpdatedCells();
    return newGroup;
}

// Checks the group login details
async function verify(group) {
    const doc = await init();
    const totalGroups = await total(doc);
    const JSON = await accessCredentials();
    let pass = false;

    for (let i =0; i < JSON.length; i++) {
        if (group.Name === JSON[i].Name && group.Password === JSON[i].Password) {
	    pass = true;
	}
    }

    return pass;
}

// Checks if the group is already registered
async function isRegistered(group) {
    const doc = await init();
    const totalGroups = await total(doc);
    const JSON = await accessCredentials();
    var registered = false;
 
    for (let i = 0; i < JSON.length; i++) {
        if (group.Name === JSON[i].Name) {
	    registered = true;
	} else {}
    }

    return registered;
}

// Checks the answer submitted by the group to the puzzle with name puzzleName and
// updates the group sheet 
async function solved(puzzleName, group) {
    const doc = await init();
    const totalGroups = await total(doc);
    const JSON = await accessCredentials();

    let i = 0;
    let groupFound = false;
    while (i < JSON.length && !groupFound) {
	groupFound = JSON[i].Name === group.Name;
	if (!groupFound) {
            i++;
	} else {}
    }

    console.log(groupFound);
    if (groupFound) {
	const groupSheet = await accessGroup(i + 1);
	await groupSheet.addRow({ "Puzzles": puzzleName, "Solved": 'TRUE', "Score": 1 });
    } else {}
}

// Gets the group sheet by id
async function accessGroup(groupId) {
    const doc = await init();
    const totalGroups = await total(doc);
    const sheet = await doc.sheetsById[GROUPS_ID[groupId - 1]];
    return sheet;
}


module.exports = {credentials: accessCredentials, leaderboard: accessLeaderboard, save: save, verify: verify,
		  authenticate: isRegistered, solved: solved};
