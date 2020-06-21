const { GoogleSpreadsheet } = require("google-spreadsheet");
const key = require("./server-key.json");

const CREDENTIALS_ID = 0;
const LEADERBOARD_ID = 1618630879;
const STATISTICS_ID = 1981752792;
const TEMPLATE_ID = 1538908539;
const GROUPS_ID = {};

const puzzleNames = new Map (
    Object.entries({are_you_satisfactory_enough: 1,biz_fos: 3, biz_soc: 4, engin_yst: 5, fass_engin: 6, fass_soc: 7, fos_yst: 8, utown: 9, cca_sharing: 11, puzzle_10: 12, qet_briefing: 13, basic: 15, mala_stalls: 16, modreg: 17, qet_marking: 18, the_committee: 19, waiting_for_d2: 20, cat_emojis: 22, mashup: 23, music_box: 24, safety_first: 25, solfa: 26, things: 27, just_like_me: 29, magiball: 30, malaysian_students_league: 31, mrt_tracing: 32, polypotions: 33, what_does_the_owl_say: 34, central_library: 36, helix: 37, i_am_groot: 38, it_all_adds_up: 39, punzle: 40, triangles_everywhere: 41, character_double: 43, covid_19: 44, framing_differences: 45, leftover_dice: 46, special_characters: 47, the_heist: 48, broken_messages: 50, gee_square_pies: 51, imdb: 52, mountains_and_valleys: 53, mr_lemons: 54, the_traveller: 55, '12_pictures': 57, alpha_helix: 58, elementary: 59, peaks: 60, reddit: 61, the_club: 62})
);

async function init() {
  const doc = new GoogleSpreadsheet(
    "1vYE0U_GbDKHW5ZZsUqt4d6-3UOYeehwM8tWS5VQxTbE"
  );
  await doc.useServiceAccountAuth(key);
  await doc.loadInfo();
  return doc;
}

async function total(doc) {
  const sheet = doc.sheetsById[STATISTICS_ID];
  await sheet.loadCells();
  return sheet.getCellByA1("B1").value;
}

async function accessSheet(sheet, total) {
  await sheet.loadHeaderRow();
  await sheet.loadCells();
  const rows = await sheet.getRows({ offset: 0, limit: total });
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

// Saves the newly registered group to the database and initialises a group sheet for the group
async function save(newGroup) {
  const doc = await init();
  const totalGroups = await total(doc);
  // add group to Credentials Sheet
  newGroup.id = totalGroups + 1;
  await doc.sheetsById[CREDENTIALS_ID].addRow(newGroup);

  // create a new sheet and copy template over.
  const newSheet = await doc.addSheet({
    title: `Group ${newGroup.id}`,
    index: 3 + newGroup.id,
  });
  await newSheet.setHeaderRow(["puzzleId", "weight", "solved"]);
  const copySheet = await doc.sheetsById[TEMPLATE_ID];
  await newSheet.addRows(await copySheet.getRows());

  GROUPS_ID[newGroup.name] = newSheet.sheetId;

  const sheet = await doc.sheetsById[LEADERBOARD_ID];
  await sheet.loadCells("C1:C30");
  sheet.getCell(
    newGroup.id,
    2
  ).formula = `=IF(ISBLANK(A:A),"",0 + SUMPRODUCT('Group ${newGroup.id}'!B:B, 'Group ${newGroup.id}'!C:C))`;
  await sheet.saveUpdatedCells();
  return newGroup;
}

// Checks the group login details
async function verify(group) {
  const JSON = await accessCredentials();
  return JSON.some(
    (value) => group.name === value.name && group.password === value.password
  );
}

// Checks if the group is already registered
async function isRegistered(group) {
  const JSON = await accessCredentials();
  return JSON.some((value) => group.name === value.name);
}

// Updates the score of the group once the puzzle with id puzzleName is solved.
// Returns true if the puzzle is already solved, false otherwise.
async function solved(puzzleName, group) {
  // Find group in the Groups sheet
  const JSON = await accessCredentials();
  let groupId = JSON.findIndex(value => value.name === group.name) + 1;
  let puzzleRow = puzzleNames.get(puzzleName) - 1;
  // Find group sheet and find the correct entry to update
  if (groupId != null && puzzleRow != null) {
    const groupSheet = await accessGroup(groupId);
    const rows = await groupSheet.getRows();
      if (rows[puzzleRow].solved === '1') {
        return true;
      } else {
        rows[puzzleRow].solved = 1;
        await rows[puzzleRow].save();
        return false;
      }
  } else {
      throw Error();
  }
}

// Gets the group sheet by id
async function accessGroup(groupId) {
  const doc = await init();
  return await doc.sheetsByIndex[3 + groupId];
}

module.exports = {
  credentials: accessCredentials,
  leaderboard: accessLeaderboard,
  save: save,
  verify: verify,
  authenticate: isRegistered,
  solved: solved,
};
