const { GoogleSpreadsheet } = require("google-spreadsheet");
const key = require("./server-key.json");

const CREDENTIALS_ID = 0;
const LEADERBOARD_ID = 1618630879;
const STATISTICS_ID = 1981752792;
const GROUPS_ID = {};

const puzzleNames = new Map (Object.entries({are_you_satisfactory_enough: 1, qet: 2, cca: 3, metapuzzle_10: 4, utown: 5, biz_fos: 6, biz_soc: 7, engin_yst: 8, fass_engin: 9, fass_soc: 10, fos_yst: 11, modreg: 12, instagram: 13, waiting_for_d2: 14, the_committee: 15, qet_marking: 16, mala_stalls: 17, music_box: 18, things: 19, dumb_ways_to_die: 20, cat_emojis: 21, solfa: 22, classical_composers: 23, pokemon_go: 24, mrt_tracing: 25, what_does_the_owl_say: 26, polypotions: 27, burkina_faso: 28, football: 29, world_politics: 30, hieroglyphs: 31, world_history: 32, i_am_groot: 33, central_library: 34, multilingual_puns: 35, leftover_dice: 36, character_double: 37, covid_19: 38, the_heist: 39, true_or_false: 40, framing_differences: 41, imdb: 42, recipes: 43, travelling: 44, refresh: 45, wifi_ssid: 46, origami_startup: 47, omr: 48, periodic_table: 49, "12_pictures": 50, protein_geeks: 51, emission_spectra: 52, anything: 53}));

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
  newGroup.ID = totalGroups + 1;
  await doc.sheetsById[CREDENTIALS_ID].addRow(newGroup);

  const newSheet = await doc.addSheet({
    title: `Group ${newGroup.Name}`,
    index: 2 + newGroup.ID,
  });
  await newSheet.setHeaderRow(["Puzzle", "Solved"]);

  let template = [];
  console.log(puzzleNames)
  for (let k of puzzleNames.keys()) {
    console.log(k);
    let obj = { Puzzle: k, Solved: 0 };
    console.log(obj);
    template.push(obj);
  }
  console.log(template);
  await newSheet.addRows(template);

  GROUPS_ID[newGroup.Name] = newSheet.sheetId;

  const sheet = await doc.sheetsById[LEADERBOARD_ID];
  await sheet.loadCells("C1:C30");
  sheet.getCell(
    newGroup.ID,
    2
  ).formula = `=IF(ISBLANK(A:A),"",0 + SUM(\'Group ${newGroup.ID}\'!B:B))`;
  await sheet.saveUpdatedCells();
  return newGroup;
}

// Checks the group login details
async function verify(group) {
  const JSON = await accessCredentials();
  return JSON.some(
    (value) => group.Name === value.Name && group.Password === value.Password
  );
}

// Checks if the group is already registered
async function isRegistered(group) {
  const JSON = await accessCredentials();
  return JSON.some((value) => group.Name === value.Name);
}

// Updates the score of the group once the puzzle with id puzzleName is solved.
// Returns true if the puzzle is already solved, false otherwise.
async function solved(puzzleName, group) {
  // Find group in the Groups sheet
  console.log(puzzleName);
  console.log(puzzleNames);
  let groupId = GROUPS_ID[group.Name];
  let puzzleRow = puzzleNames.get(puzzleName) - 1;
  console.log(groupId);
  console.log(puzzleRow);
  // Find group sheet and find the correct entry to update
  if (groupId && puzzleRow) {
    const groupSheet = await accessGroup(groupId);
    const rows = await groupSheet.getRows();

      if (rows[puzzleRow].Solved === 1) {
        return true;
      } else {
        console.log(puzzleRow);
        rows[puzzleRow].Solved = 1;
        await rows[puzzleRow].save();
        return false;
      }
    }
}

// Gets the group sheet by id
async function accessGroup(groupId) {
  const doc = await init();
  return await doc.sheetsById[groupId];
}

module.exports = {
  credentials: accessCredentials,
  leaderboard: accessLeaderboard,
  save: save,
  verify: verify,
  authenticate: isRegistered,
  solved: solved,
};
